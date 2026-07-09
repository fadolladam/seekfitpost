const { getPool } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, image: photoUrl, post_id = 'unknown' } = req.body;
  if (!text) return res.status(400).json({ error: 'Text content is required' });

  const pool = getPool();

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!token || !orgId) {
    return res.status(500).json({ error: 'LinkedIn credentials are not configured' });
  }

  const author  = `urn:li:organization:${orgId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };

  try {
    let postBody;

    if (photoUrl) {
      // ── Step 1: Register the image upload ──────────────────────────────────
      const registerResp = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: author,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            }],
          },
        }),
      });

      if (!registerResp.ok) {
        const err = await registerResp.json();
        throw new Error(err.message || 'Failed to register LinkedIn image upload');
      }

      const registerData = await registerResp.json();
      const uploadUrl    = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const assetUrn     = registerData.value.asset;

      // ── Step 2: Upload image to LinkedIn ───────────────────────
      let imgBuffer, imgContentType;
      if (photoUrl.startsWith('data:image')) {
        imgContentType = photoUrl.match(/^data:(image\/\w+);base64,/)[1];
        const base64Data = photoUrl.replace(/^data:image\/\w+;base64,/, '');
        imgBuffer = Buffer.from(base64Data, 'base64');
      } else {
        const imgResp = await fetch(photoUrl);
        if (!imgResp.ok) throw new Error('Failed to fetch image from URL');
        imgBuffer = await imgResp.arrayBuffer();
        imgContentType = imgResp.headers.get('content-type') || 'image/jpeg';
      }

      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': imgContentType,
        },
        body: imgBuffer,
      });

      if (!uploadResp.ok && uploadResp.status !== 201) {
        throw new Error(`Image upload to LinkedIn failed (${uploadResp.status})`);
      }

      // ── Step 3: Create post with image ──────────────────────────────────────
      postBody = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'IMAGE',
            media: [{
              status: 'READY',
              description: { text: 'Job opportunity via SeekFitJob' },
              media: assetUrn,
              title: { text: 'Job Posting' },
            }],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };
    } else {
      // ── Text-only post ──────────────────────────────────────────────────────
      postBody = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };
    }

    const r    = await fetch('https://api.linkedin.com/v2/ugcPosts', { method: 'POST', headers, body: JSON.stringify(postBody) });
    const d = await r.json();

    if (r.status !== 201) {
      return res.status(400).json({ error: d.message || 'Failed to post to LinkedIn' });
    }

    if (pool) {
      await pool.query(
        'INSERT INTO published_history (post_id, platform, external_id, text, image_url) VALUES (?, ?, ?, ?, ?)',
        [post_id, 'linkedin_native', d.id, text, photoUrl ? (photoUrl.startsWith('data:image') ? 'attached' : photoUrl) : null]
      );
    }

    return res.status(200).json({ success: true, post_id: d.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
