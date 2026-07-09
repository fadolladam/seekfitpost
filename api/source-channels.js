const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const pool = getPool();
  if (!pool) return res.status(500).json({ error: 'Database connection not available' });

  try {
    if (req.method === 'GET') {
      const [rows] = await pool.query('SELECT * FROM source_channels ORDER BY created_at DESC');
      return res.status(200).json({ sources: rows });
    }
    
    if (req.method === 'POST') {
      const { channel_username, channel_name } = req.body;
      if (!channel_username) return res.status(400).json({ error: 'Channel username is required' });
      
      const cleanSlug = channel_username.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();
      
      await pool.query(
        'INSERT INTO source_channels (channel_username, channel_name) VALUES (?, ?)',
        [cleanSlug, channel_name || '']
      );
      return res.status(201).json({ success: true });
    }
    
    if (req.method === 'PUT') {
      const { id, channel_username, channel_name } = req.body;
      if (!id || !channel_username) return res.status(400).json({ error: 'ID and username are required' });
      
      const cleanSlug = channel_username.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();
      
      await pool.query(
        'UPDATE source_channels SET channel_username = ?, channel_name = ? WHERE id = ?',
        [cleanSlug, channel_name || '', id]
      );
      return res.status(200).json({ success: true });
    }
    
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID is required' });
      
      await pool.query('DELETE FROM source_channels WHERE id = ?', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Channel already exists.' });
    }
    return res.status(500).json({ error: error.message });
  }
};
