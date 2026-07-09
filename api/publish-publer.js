const { getPool } = require('./db');

// Use native fetch but fall back to node-fetch if needed (though Node 18+ has fetch built-in)
const fetch = global.fetch;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, image, accounts, post_id = 'unknown', scheduleDate, autoSchedule } = req.body;
    
    if (!accounts || accounts.length === 0) {
      return res.status(400).json({ error: 'No social accounts selected for publishing' });
    }

    const pool = getPool();
    if (!pool) return res.status(500).json({ error: 'Database connection not available' });

    // 1. Get Token and Workspace ID from DB
    const [rows] = await pool.query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('publer_api_token', 'publer_workspace_id')");
    
    let token = null;
    let workspaceId = null;
    rows.forEach(row => {
      if (row.setting_key === 'publer_api_token') token = row.setting_value;
      if (row.setting_key === 'publer_workspace_id') workspaceId = row.setting_value;
    });

    if (!token) {
      return res.status(401).json({ error: 'Publer API token is not configured. Please connect in Settings.' });
    }

    let mediaId = null;

    // 2. Upload Image if present
    if (image) {
      // image is a base64 data URL e.g. "data:image/png;base64,iVBORw0KGgo..."
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/png' });
      
      const form = new FormData();
      form.append('file', blob, 'seekfitpost-generated.png');

      const headers = {
        'Authorization': `Bearer-API ${token}`
      };
      if (workspaceId) headers['Publer-Workspace-Id'] = workspaceId;

      const uploadRes = await fetch('https://app.publer.com/api/v1/media', {
        method: 'POST',
        headers: headers,
        body: form
      });

      const rawUpload = await uploadRes.text();
      let uploadData;
      try {
        uploadData = JSON.parse(rawUpload);
      } catch (e) {
        uploadData = { error: rawUpload || 'No response body' };
      }

      if (!uploadRes.ok) {
        throw new Error('Failed to upload media to Publer: ' + JSON.stringify(uploadData));
      }
      
      // The media object might be the root or wrapped in a data field depending on API consistency
      mediaId = uploadData.id || (uploadData.media && uploadData.media.id);
      if (!mediaId) {
        throw new Error('Failed to retrieve Media ID from Publer upload response');
      }
    }

    // 3. Construct Post Payload
    const postPayload = {
      bulk: {
        posts: [
          {
            networks: {
              facebook: { type: mediaId ? "photo" : "status", text: text, media: mediaId ? [{ id: mediaId }] : [] },
              linkedin: { type: mediaId ? "photo" : "status", text: text, media: mediaId ? [{ id: mediaId }] : [] },
              instagram: { type: mediaId ? "photo" : "status", text: text, media: mediaId ? [{ id: mediaId }] : [] },
              pinterest: { type: mediaId ? "photo" : "status", text: text, media: mediaId ? [{ id: mediaId }] : [] },
              twitter: { type: mediaId ? "photo" : "status", text: text, media: mediaId ? [{ id: mediaId }] : [] },
              telegram: { type: mediaId ? "photo" : "status", text: text, media: mediaId ? [{ id: mediaId }] : [] },
              tiktok: { type: mediaId ? "photo" : "status", text: text, media: mediaId ? [{ id: mediaId }] : [] }
            },
            accounts: accounts.map(accId => {
              const acc = { id: accId };
              if (scheduleDate && !autoSchedule) {
                acc.scheduled_at = scheduleDate;
              }
              return acc;
            })
          }
        ]
      }
    };

    if (autoSchedule || scheduleDate) {
      postPayload.bulk.state = 'scheduled';
    }

    // 4. Send Post Request
    const headers = {
      'Authorization': `Bearer-API ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (workspaceId) headers['Publer-Workspace-Id'] = workspaceId;

    const endpoint = (scheduleDate || autoSchedule)
      ? 'https://app.publer.com/api/v1/posts/schedule' 
      : 'https://app.publer.com/api/v1/posts/schedule/publish';

    const postRes = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(postPayload)
    });

    const rawPost = await postRes.text();
    let postData;
    try {
      postData = JSON.parse(rawPost);
    } catch(e) {
      postData = { error: rawPost || 'No response body' };
    }
    
    if (!postRes.ok) {
      throw new Error('Failed to publish post: ' + JSON.stringify(postData));
    }

    // Save image locally for history
    let localImagePath = null;
    if (image) {
      try {
        const fs = require('fs');
        const path = require('path');
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `pub_${post_id}_${Date.now()}.png`;
        const filepath = path.join(__dirname, '../client/public/uploads', filename);
        fs.writeFileSync(filepath, buffer);
        localImagePath = `/uploads/${filename}`;
      } catch (err) {
        console.error('Failed to save local image:', err);
        localImagePath = 'attached'; // fallback
      }
    }

    // 5. Log to history
    // We log one row per account we requested to publish to
    // Note: Publer returns an async job_id for scheduling/publishing immediately.
    for (const acc of accounts) {
      await pool.query(
        'INSERT INTO published_history (post_id, platform, external_id, text, image_url) VALUES (?, ?, ?, ?, ?)',
        [post_id, `publer_${acc}`, postData.job_id || postData.id || postData.post_id || null, text, localImagePath]
      );
    }

    return res.status(200).json({ success: true, data: postData });

  } catch (error) {
    console.error('Publer publish error:', error);
    return res.status(500).json({ error: error.message });
  }
};
