const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, image, post_id = 'unknown' } = req.body;
  if (!text) return res.status(400).json({ error: 'Text content is required' });

  const pool = getPool();

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token  = process.env.FACEBOOK_PAGE_TOKEN;

  if (!pageId || !token) {
    return res.status(500).json({ error: 'Facebook credentials are not configured' });
  }

  try {
    let endpoint, body, isFormData = false;

    if (image) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      if (image.startsWith('data:image')) {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });
        body = new FormData();
        body.append('file', blob, 'seekfitpost-generated.png');
        body.append('caption', text);
        body.append('access_token', token);
        isFormData = true;
      } else {
        body = JSON.stringify({ url: image, caption: text, access_token: token });
      }
    } else {
      // Text-only feed post
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      body = JSON.stringify({ message: text, access_token: token });
    }

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: body,
    });
    const d = await r.json();

    if (d.error) {
      throw new Error(d.error?.message || 'Failed to post to Facebook');
    }
      
    if (d.id && pool) {
      await pool.query(
        'INSERT INTO published_history (post_id, platform, external_id, text, image_url) VALUES (?, ?, ?, ?, ?)',
        [post_id, `facebook_${pageId}`, d.id, text, image ? (image.startsWith('data:image') ? 'attached' : image) : null]
      );
    }

    return res.status(200).json({ success: true, id: d.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
