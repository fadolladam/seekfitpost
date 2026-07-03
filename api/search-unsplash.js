module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return res.status(500).json({ error: 'Unsplash API key is not configured' });

  // Trigger download event (required by Unsplash API guidelines)
  const { trigger_download } = req.query;
  if (trigger_download) {
    try {
      await fetch(trigger_download, { headers: { Authorization: `Client-ID ${key}` } });
    } catch (_) {}
    return res.status(200).json({ ok: true });
  }

  const { query, page = 1, per_page = 9 } = req.query;
  if (!query) return res.status(400).json({ error: 'Search query is required' });

  try {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${per_page}&page=${page}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );

    if (!r.ok) {
      const err = await r.json();
      return res.status(r.status).json({ error: err.errors?.[0] || 'Unsplash API error' });
    }

    const data = await r.json();

    const photos = data.results.map(p => ({
      id: p.id,
      thumb: p.urls.small,
      regular: p.urls.regular,
      alt: p.alt_description || p.description || 'Professional image',
      photographer: p.user.name,
      photographer_url: `${p.user.links.html}?utm_source=seekfitjob&utm_medium=referral`,
      download_location: p.links.download_location,
      color: p.color || '#f1f5f9',
    }));

    return res.status(200).json({ photos, total: data.total, total_pages: data.total_pages });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
