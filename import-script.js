require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { getPool, initDB } = require('./api/db');

async function main() {
  const pool = await initDB();
  console.log('Connected to DB');

  // Truncate table to reset IDs to 1
  console.log('Truncating generated_posts table...');
  await pool.query('TRUNCATE TABLE generated_posts');
  console.log('Table cleared.');

  // Read file
  const text = fs.readFileSync('SeekFitJob_Converted_All_Posts.txt', 'utf-8');
  const sections = text.split('=== POST_ID: ');
  
  let importedCount = 0;

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const endOfIdIndex = section.indexOf(' ===');
    if (endOfIdIndex === -1) continue;
    
    const postId = section.substring(0, endOfIdIndex).trim();
    const content = section.substring(endOfIdIndex + 4).trim();
    
    if (postId && content) {
      const channel = postId.split('/')[0];
      
      try {
        await pool.query(
          'INSERT INTO generated_posts (post_id, channel, generated_text, is_manual) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE generated_text = VALUES(generated_text)',
          [postId, channel, content, true]
        );
        importedCount++;
      } catch (err) {
        console.error('Failed to insert post:', postId, err.message);
      }
    }
  }

  console.log(`Successfully imported ${importedCount} posts.`);
  process.exit(0);
}

main().catch(console.error);
