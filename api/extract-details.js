const OpenAI = require('openai');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { post } = req.body;
  if (!post) return res.status(400).json({ error: 'Post content is required' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key is not configured' });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an AI data extractor. Extract key details from the provided job post.
Return ONLY a valid JSON object with the following exact keys:
- "company_name": (string) The name of the hiring company. If not found, use "SeekFitJob Client".
- "short_description": (string) A 2-3 sentence summary of what they are looking for and key requirements/location.
- "positions": (array of strings) A list of job titles being hired for. Limit to at most 6 positions.

Do not include any extra text outside the JSON.`,
        },
        {
          role: 'user',
          content: `Extract from this job post:\n\n${post}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
