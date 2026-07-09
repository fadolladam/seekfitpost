const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { post_id, channel, text } = req.body;
  if (!post_id || !channel || !text) {
    return res.status(400).json({ error: 'post_id, channel, and text are required' });
  }

  const pool = getPool();

  if (!pool) {
    return res.status(500).json({ error: 'Database connection not available' });
  }

  try {
    await pool.query(
      'INSERT INTO generated_posts (post_id, channel, generated_text, is_manual) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE generated_text = VALUES(generated_text), is_manual = TRUE',
      [post_id, channel, text, true]
    );

    return res.status(200).json({ success: true, message: 'Saved successfully' });
  } catch (error) {
    console.error('Save Manual Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
