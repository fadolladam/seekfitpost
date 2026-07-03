module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(200).json({
    openai:              !!process.env.OPENAI_API_KEY,
    unsplash:            !!process.env.UNSPLASH_ACCESS_KEY,
    telegram_bot:        !!process.env.TELEGRAM_BOT_TOKEN,
    telegram_channel:    !!process.env.TELEGRAM_CHANNEL_ID,
    telegram_group:      !!process.env.TELEGRAM_GROUP_ID,
    facebook_token:      !!process.env.FACEBOOK_PAGE_TOKEN,
    facebook_page_id:    !!process.env.FACEBOOK_PAGE_ID,
    linkedin_token:      !!process.env.LINKEDIN_ACCESS_TOKEN,
    linkedin_org_id:     !!process.env.LINKEDIN_ORGANIZATION_ID,
  });
};
