const { parse } = require('node-html-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { getPool } = require('./db');

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

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
        file.on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
      } else {
        resolve(false); // Ignore failed downloads instead of crashing
      }
    }).on('error', (err) => resolve(false));
  });
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
    const pool = getPool();

    // Ensure directory exists
    const imgDir = path.join(__dirname, '..', 'public', 'images', slug);
    if (!fs.existsSync(imgDir)) {
      fs.mkdirSync(imgDir, { recursive: true });
    }

    const fetchedPosts = [];

    for (const el of messageEls) {
      const textEl = el.querySelector('.tgme_widget_message_text');
      const timeEl = el.querySelector('time');
      const linkEl = el.querySelector('.tgme_widget_message_date');
      const photoEl = el.querySelector('.tgme_widget_message_photo_wrap');
      
      const dataPost = el.getAttribute('data-post') || '';
      const text = textEl ? decodeHtml(textEl.innerText.trim()) : '';
      
      if (text.length <= 30) continue;

      let photoUrl = '';
      let localImgPath = '';

      if (photoEl) {
        const style = photoEl.getAttribute('style') || '';
        const match = style.match(/background-image:url\('(.+?)'\)/);
        if (match && match[1]) {
          photoUrl = match[1];
          const filename = `${dataPost.replace('/', '_')}.jpg`;
          const dest = path.join(imgDir, filename);
          localImgPath = `/public/images/${slug}/${filename}`;
          
          if (!fs.existsSync(dest)) {
            await downloadImage(photoUrl, dest);
          }
        }
      }

      const postData = {
        id: dataPost,
        text,
        datetime: timeEl ? timeEl.getAttribute('datetime') : '',
        url: linkEl ? linkEl.getAttribute('href') : `https://t.me/${slug}`,
        image: localImgPath
      };

      fetchedPosts.push(postData);

      // Save to database
      if (pool) {
        const originalDate = timeEl ? timeEl.getAttribute('datetime') : null;
        await pool.query(
          'INSERT INTO telegram_posts (post_id, channel, original_text, url, image_path, original_date) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE original_text = VALUES(original_text), image_path = VALUES(image_path), original_date = VALUES(original_date)',
          [dataPost, slug, text, postData.url, localImgPath, originalDate]
        );
      }
    }

    fetchedPosts.reverse();

    return res.status(200).json({ posts: fetchedPosts, channel: slug, total: fetchedPosts.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
