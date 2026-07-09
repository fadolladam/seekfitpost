const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const pool = getPool();
  if (!pool) return res.status(500).json({ error: 'Database connection not available' });

  try {
    const [rows] = await pool.query('SELECT DISTINCT channel FROM telegram_posts ORDER BY channel ASC');
    const channels = rows.map(r => r.channel);
    return res.status(200).json({ channels });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
