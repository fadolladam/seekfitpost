const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const pool = getPool();
  if (!pool) return res.status(500).json({ error: 'Database connection not available' });

  try {
    if (req.method === 'GET') {
      const [rows] = await pool.query('SELECT setting_key, setting_value FROM app_settings');
      const settings = {};
      rows.forEach(r => settings[r.setting_key] = r.setting_value);
      return res.status(200).json(settings);
    }
    
    if (req.method === 'POST') {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings object is required' });
      }
      
      for (const [key, value] of Object.entries(settings)) {
        await pool.query(
          'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
          [key, value || '']
        );
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
