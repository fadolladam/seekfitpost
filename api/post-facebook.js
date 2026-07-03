module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, photoUrl } = req.body;
  if (!message) return res.status(400).json({ error: 'Message content is required' });

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token  = process.env.FACEBOOK_PAGE_TOKEN;

  if (!pageId || !token) {
    return res.status(500).json({ error: 'Facebook credentials are not configured' });
  }

  try {
    let endpoint, body;

    if (photoUrl) {
      // Photo post — Facebook fetches the image from the URL directly
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body = { url: photoUrl, caption: message, access_token: token };
    } else {
      // Text-only feed post
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      body = { message, access_token: token };
    }

    const r    = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message, code: data.error.code });
    }

    return res.status(200).json({ success: true, post_id: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
