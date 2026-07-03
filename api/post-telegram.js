module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, targets = ['channel'], photoUrl } = req.body;
  if (!text) return res.status(400).json({ error: 'Text content is required' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'Telegram bot token is not configured' });

  const chatIds = {
    channel: process.env.TELEGRAM_CHANNEL_ID,
    group:   process.env.TELEGRAM_GROUP_ID,
  };

  const results = [];

  for (const target of targets) {
    const chatId = chatIds[target];
    if (!chatId) {
      results.push({ target, success: false, error: `${target} ID is not configured` });
      continue;
    }

    try {
      if (photoUrl) {
        // Send photo with caption (Telegram caption limit: 1024 chars)
        const caption = text.length <= 1024 ? text : text.substring(0, 1020) + '…';

        const photoResp = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: photoUrl,
            caption,
            parse_mode: 'HTML',
          }),
        });
        const photoData = await photoResp.json();

        // If text exceeded caption limit, send the remainder as a follow-up message
        if (photoData.ok && text.length > 1024) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: text.substring(1020),
              parse_mode: 'HTML',
              reply_to_message_id: photoData.result?.message_id,
            }),
          });
        }

        results.push({ target, success: photoData.ok, error: photoData.ok ? null : photoData.description });
      } else {
        // Text-only message
        const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: false,
          }),
        });
        const d = await r.json();
        results.push({ target, success: d.ok, message_id: d.result?.message_id, error: d.ok ? null : d.description });
      }
    } catch (err) {
      results.push({ target, success: false, error: err.message });
    }
  }

  const allOk = results.every(r => r.success);
  return res.status(allOk ? 200 : 207).json({ results });
};
