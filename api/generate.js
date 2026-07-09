const OpenAI = require('openai');
const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { post, language, post_id, channel, override } = req.body;
  if (!post) return res.status(400).json({ error: 'Post content is required' });

  const pool = getPool();

  if (pool && post_id && channel && !override) {
    // Check for existing generation
    try {
      const [rows] = await pool.query(
        'SELECT id FROM generated_posts WHERE post_id = ? AND channel = ?',
        [post_id, channel]
      );
      if (rows.length > 0) {
        return res.status(409).json({ error: 'Duplicate', message: 'This post has already been generated. Do you want to overwrite it?' });
      }
    } catch (dbErr) {
      console.error('DB Error checking duplicates:', dbErr);
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key is not configured' });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const langInstruction = language === 'km'
    ? 'Write the entire post in Khmer (ខ្មែរ) language.'
    : 'Write the post in English.';

  try {
    const displayPostId = String(post_id).includes('/') ? String(post_id).split('/').pop() : post_id;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: `You are a professional HR content writer for SeekFitJob, a leading job recruitment platform in Cambodia.

Your task: take a raw job post from another source and rebrand it fully under SeekFitJob's identity.

Goal:
Make each post suitable for Telegram/Facebook job posting. Keep it short, clean, and professional.

Rules:
1. Each post should be around 80–120 words only.
2. Do not invent responsibilities, requirements, or benefits if the original post did not provide them.
3. If information is missing, keep the wording simple and general.
4. Remove repetitive long introductions and unnecessary corporate-style paragraphs.
5. For posts that are not real job vacancies, such as event, wellness, or awareness posts, convert them into short career/community content instead of forcing them into a job vacancy format.
6. Keep the tone professional, warm, motivating, and clear.
7. Use simple bullet points.
8. Keep confirmed details only, such as position title, salary, location, working hours, contact, and benefits.
9. Do NOT mention the original source channel or website in the post.

IMPORTANT: You must return a valid JSON object with EXACTLY two fields:
1. "keyword": A single highly relevant visual search keyword for this job role (e.g., "office", "programmer", "marketing", "finance", "logistics"). Maximum 2 words.
2. "post": The rebranded job post text.

Preferred format for the "post" string:

[Strong emoji] [Short job title or opportunity headline]

[1 short sentence introducing the opportunity.]

Open Position / Details:
• ...

Requirements / Ideal Candidate:
• ...

Benefits / Offer:
• ...

🔗 Apply your CV to:
Telegram: @seekfitjob
Email: hr@seekfitjob.com
SEEKFITJOB_${displayPostId}
——————————————
TG Channel: t.me/SeekFitJobKH
More jobs: www.seekfitjob.com

Important:
If the original post only has limited information, do not expand it too much. Keep it clean, short, and accurate.
${langInstruction}`,
        },
        {
          role: 'user',
          content: `Rebrand this job post for SeekFitJob:\n\n${post}`,
        },
      ],
    });

    let generatedContent = '';
    let imageKeyword = '';
    
    try {
      const responseData = JSON.parse(completion.choices[0].message.content);
      generatedContent = responseData.post || '';
      imageKeyword = responseData.keyword || '';
    } catch(e) {
      // Fallback if parsing fails
      generatedContent = completion.choices[0].message.content;
    }

    // Save generated content to database
    if (pool && post_id && channel) {
      await pool.query(
        'INSERT INTO generated_posts (post_id, channel, generated_text, is_manual, image_keyword) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE generated_text = VALUES(generated_text), is_manual = FALSE, image_keyword = VALUES(image_keyword)',
        [post_id, channel, generatedContent, false, imageKeyword]
      );
    }

    return res.status(200).json({ content: generatedContent, keyword: imageKeyword });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
