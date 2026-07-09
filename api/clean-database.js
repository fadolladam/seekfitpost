const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { posts } = req.body;
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'Missing or empty posts array' });
    }

    const pool = getPool();
    if (!pool) return res.status(500).json({ error: 'Database connection not available' });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured in .env' });
    }
    const apiKey = process.env.OPENAI_API_KEY;

    const results = {
      total_scanned: posts.length,
      deleted_count: 0,
      deleted_ids: []
    };

    // Process posts in parallel
    const promises = posts.map(async (post) => {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an strict classification assistant. Your job is to determine if the provided text is a real job vacancy/hiring post, or if it is just random chat, spam, irrelevant announcement, or a question. Respond with exactly one word: TRUE if it is a genuine job posting, FALSE if it is not.'
              },
              {
                role: 'user',
                content: `Text to classify:\n\n${post.text}`
              }
            ],
            temperature: 0.1,
            max_tokens: 10
          })
        });

        if (!response.ok) {
          console.error(`OpenAI error for post ${post.id}:`, await response.text());
          return null; // keep post if API fails
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim().toUpperCase();

        if (content.includes('FALSE')) {
          return post.id;
        }
        return null;
      } catch (err) {
        console.error(`Error classifying post ${post.id}:`, err);
        return null; // keep on error
      }
    });

    const resolvedIds = await Promise.all(promises);
    const junkIds = resolvedIds.filter(id => id !== null);

    if (junkIds.length > 0) {
      // Delete from telegram_posts
      const placeholders = junkIds.map(() => '?').join(',');
      await pool.query(`DELETE FROM telegram_posts WHERE post_id IN (${placeholders})`, junkIds);
      
      // Also delete any generated posts linked to these IDs just to keep it clean
      await pool.query(`DELETE FROM generated_posts WHERE post_id IN (${placeholders})`, junkIds);
      
      results.deleted_count = junkIds.length;
      results.deleted_ids = junkIds;
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('Clean Database API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
