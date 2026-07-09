const { getPool, initDB } = require('./api/db');
initDB().then(async () => {
  const pool = getPool();
  await pool.query("DELETE FROM generated_posts WHERE channel = 'ALL'");
  console.log('Deleted bad rows');
  process.exit(0);
});
