const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const pool = getPool();
  if (!pool) return res.status(500).json({ error: 'Database connection not available' });

  try {
    const limit = parseInt(req.query.limit) || 100;
    const post_id = req.query.post_id;
    const platform = req.query.platform;

    let query = 'SELECT * FROM published_history WHERE 1=1';
    let params = [];

    if (post_id) {
      query += ' AND post_id = ?';
      params.push(post_id);
    }
    
    if (platform) {
      query += ' AND platform = ?';
      params.push(platform);
    }

    query += ' ORDER BY published_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(query, params);

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
