module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, photoUrl } = req.body;
  if (!text) return res.status(400).json({ error: 'Text content is required' });

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

      // ── Step 2: Download image and upload to LinkedIn ───────────────────────
      const imgResp = await fetch(photoUrl);
      if (!imgResp.ok) throw new Error('Failed to fetch image from Unsplash');

      const imgBuffer      = await imgResp.arrayBuffer();
      const imgContentType = imgResp.headers.get('content-type') || 'image/jpeg';

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
    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({ error: data.message || data.serviceErrorCode || 'LinkedIn API error' });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
