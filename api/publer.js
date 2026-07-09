const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { route } = req.query;
  if (!route) return res.status(400).json({ error: 'Missing route parameter' });

  const pool = getPool();
  if (!pool) return res.status(500).json({ error: 'Database connection not available' });

  try {
    // 1. Get Token and Workspace ID from DB
    const [rows] = await pool.query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('publer_api_token', 'publer_workspace_id')");
    
    let token = null;
    let workspaceId = null;
    rows.forEach(row => {
      if (row.setting_key === 'publer_api_token') token = row.setting_value;
      if (row.setting_key === 'publer_workspace_id') workspaceId = row.setting_value;
    });

    if (!token) {
      return res.status(401).json({ error: 'Publer API token is not configured.' });
    }

    // 2. Build Publer Request
    const url = `https://app.publer.com/api/v1${route}`;
    const headers = {
      'Authorization': `Bearer-API ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (workspaceId) headers['Publer-Workspace-Id'] = workspaceId;

    const options = {
      method: req.method,
      headers: headers
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
    }

    // 3. Proxy the Request
    const response = await fetch(url, options);
    
    // Publer can return 204 No Content
    if (response.status === 204) {
      return res.status(204).end();
    }

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Proxy Error: ' + error.message });
  }
};
