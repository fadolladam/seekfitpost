const OpenAI = require('openai');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { post, language } = req.body;
  if (!post) return res.status(400).json({ error: 'Post content is required' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key is not configured' });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const langInstruction = language === 'km'
    ? 'Write the entire post in Khmer (ខ្មែរ) language.'
    : 'Write the post in English.';

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: `You are a professional HR content writer for SeekFitJob, a leading job recruitment platform in Cambodia.

Your task: take a raw job post from another source and rebrand it fully under SeekFitJob's identity.

SeekFitJob Brand Identity:
- Name: SeekFitJob
- Tagline: "Seek your fit, move a great forward."
- Website: seekfitjob.com
- HR Email: hr@seekfitjob.com
- Phone: 085 558 404
- Telegram: t.me/SeekFitJobKH
- Facebook: facebook.com/SeekfitJob
- LinkedIn: linkedin.com/company/seekfitjob
- Tone: Professional, warm, motivating, clear

Output format for social media (Telegram / Facebook / LinkedIn):
1. Open with a strong emoji + job title headline
2. Brief engaging intro (1–2 sentences)
3. Key responsibilities (3–5 bullet points with ✅ or 📌)
4. Requirements / qualifications (3–5 bullet points with 🎯 or ✔️)
5. What we offer / benefits (if available)
6. Apply/contact CTA pointing to SeekFitJob channels
7. Relevant hashtags on the last line (#JobAlert #SeekFitJob #Cambodia etc.)

Do NOT mention the original source channel or website.
${langInstruction}`,
        },
        {
          role: 'user',
          content: `Rebrand this job post for SeekFitJob:\n\n${post}`,
        },
      ],
    });

    return res.status(200).json({ content: completion.choices[0].message.content });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
