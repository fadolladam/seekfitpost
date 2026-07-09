require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const { getPool, initDB } = require('./api/db');

async function main() {
  const pool = await initDB();
  console.log('Connected to DB');

  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in environment');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Get rows where image_keyword is null or empty
  const [rows] = await pool.query(
    "SELECT id, post_id, channel, generated_text FROM generated_posts WHERE image_keyword IS NULL OR image_keyword = ''"
  );

  console.log(`Found ${rows.length} posts missing image_keyword.`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`Processing ${i + 1}/${rows.length}: ${row.post_id}`);

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant. I will give you a job post. Reply with ONLY a single visual search keyword (1-2 words max) that would be good for searching stock photos on Unsplash for this job (e.g., "office", "programmer", "marketing", "logistics", "finance"). Do not add any punctuation or extra text.`
          },
          {
            role: 'user',
            content: row.generated_text || ''
          }
        ],
      });

      let keyword = completion.choices[0].message.content.trim();
      // Remove any surrounding quotes just in case
      keyword = keyword.replace(/^["']|["']$/g, '');

      console.log(`  -> Generated keyword: "${keyword}"`);

      await pool.query(
        "UPDATE generated_posts SET image_keyword = ? WHERE id = ?",
        [keyword, row.id]
      );
    } catch (err) {
      console.error(`  -> Failed for ${row.post_id}:`, err.message);
    }
  }

  console.log('Finished backfilling keywords!');
  process.exit(0);
}

main().catch(console.error);
