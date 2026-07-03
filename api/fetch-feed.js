const { parse } = require('node-html-parser');

function decodeHtml(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: 'Channel username is required' });

  const slug = channel.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();

  try {
    const response = await fetch(`https://t.me/s/${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Channel not found or not public' });
    }

    const html = await response.text();
    const root = parse(html);
    const messageEls = root.querySelectorAll('.tgme_widget_message');

    const posts = messageEls
      .map(el => {
        const textEl = el.querySelector('.tgme_widget_message_text');
        const timeEl = el.querySelector('time');
        const linkEl = el.querySelector('.tgme_widget_message_date');
        const dataPost = el.getAttribute('data-post') || '';

        const text = textEl ? decodeHtml(textEl.innerText.trim()) : '';
        return {
          id: dataPost,
          text,
          datetime: timeEl ? timeEl.getAttribute('datetime') : '',
          url: linkEl ? linkEl.getAttribute('href') : `https://t.me/${slug}`,
        };
      })
      .filter(p => p.text.length > 30)
      .reverse();

    return res.status(200).json({ posts, channel: slug, total: posts.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
