const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }

  const pool = getPool();

  if (!pool) {
    return res.status(500).json({ error: 'Database connection not available' });
  }

  try {
    for (const item of items) {
      if (item.post_id && item.channel && item.text) {
        await pool.query(
          'INSERT INTO generated_posts (post_id, channel, generated_text, is_manual, image_keyword) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE generated_text = VALUES(generated_text), is_manual = TRUE, image_keyword = VALUES(image_keyword)',
          [item.post_id, item.channel, item.text, true, item.image_keyword || null]
        );
      }
    }

    return res.status(200).json({ success: true, message: `Successfully saved ${items.length} items` });
  } catch (error) {
    console.error('Save Manual Bulk Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
