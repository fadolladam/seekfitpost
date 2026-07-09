const mysql = require('mysql2/promise');
const fs = require('fs');

let pool;

async function initDB() {
  if (pool) return pool;

  // First connect without database to create it if it doesn't exist
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await connection.query('CREATE DATABASE IF NOT EXISTS `seekfitjob_post`');
  await connection.end();

  // Now create the connection pool with the database selected
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'seekfitjob_post',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Initialize tables
  const createPostsTable = `
    CREATE TABLE IF NOT EXISTS telegram_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id VARCHAR(100) NOT NULL,
      channel VARCHAR(100) NOT NULL,
      original_text TEXT,
      url VARCHAR(500),
      image_path VARCHAR(500),
      original_date TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_post (post_id, channel)
    )
  `;

  const createGeneratedTable = `
    CREATE TABLE IF NOT EXISTS generated_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id VARCHAR(100) NOT NULL,
      channel VARCHAR(100) NOT NULL,
      generated_text TEXT,
      image_keyword VARCHAR(255),
      is_manual BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_generated_post (post_id, channel)
    )
  `;

  const createSourceChannelsTable = `
    CREATE TABLE IF NOT EXISTS source_channels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      channel_username VARCHAR(100) NOT NULL UNIQUE,
      channel_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createAppSettingsTable = `
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT
    )
  `;

  const createPublishedHistoryTable = `
    CREATE TABLE IF NOT EXISTS published_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id VARCHAR(100) NOT NULL,
      platform VARCHAR(100) NOT NULL,
      external_id VARCHAR(255),
      text TEXT,
      image_url VARCHAR(500),
      published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post_id (post_id)
    )
  `;

  await pool.query(createPostsTable);
  await pool.query(createGeneratedTable);
  await pool.query(createSourceChannelsTable);
  await pool.query(createAppSettingsTable);
  await pool.query(createPublishedHistoryTable);

  try {
    await pool.query('ALTER TABLE telegram_posts ADD COLUMN original_date TIMESTAMP NULL');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error('Failed to add original_date column:', err);
    }
  }

  try {
    await pool.query('ALTER TABLE generated_posts ADD COLUMN image_keyword VARCHAR(255)');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.error('Failed to add image_keyword column:', err);
    }
  }

  return pool;
}

module.exports = {
  initDB,
  getPool: () => pool
};
