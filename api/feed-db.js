const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { channel, sort = 'desc', status = 'unposted' } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel username is required' });

  const slug = channel.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();
  const pool = getPool();
  if (!pool) return res.status(500).json({ error: 'Database connection not available' });

  try {
    const order = sort.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    let query = `SELECT t.post_id as id, t.channel, 
       (SELECT text FROM published_history ph WHERE ph.post_id = t.post_id ORDER BY published_at DESC LIMIT 1) as pub_text,
       (SELECT image_url FROM published_history ph WHERE ph.post_id = t.post_id AND image_url IS NOT NULL ORDER BY published_at DESC LIMIT 1) as pub_image,
       t.original_text as text, COALESCE(t.original_date, t.created_at) as datetime, t.url, t.image_path as image, g.generated_text, g.image_keyword 
       FROM telegram_posts t 
       LEFT JOIN generated_posts g ON t.post_id = g.post_id AND t.channel = g.channel 
       WHERE 1=1 `;
    const params = [];
    
    if (status === 'unposted') {
      query += `AND NOT EXISTS (SELECT 1 FROM published_history ph WHERE ph.post_id = t.post_id) `;
    } else if (status === 'posted') {
      query += `AND EXISTS (SELECT 1 FROM published_history ph WHERE ph.post_id = t.post_id) `;
    }

    if (slug && slug !== 'ALL') {
      query += `AND t.channel = ? `;
      params.push(slug);
    }
    
    query += `ORDER BY COALESCE(t.original_date, t.created_at) ${order}`;

    const [rows] = await pool.query(query, params);

    return res.status(200).json({ posts: rows, channel: slug, total: rows.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
