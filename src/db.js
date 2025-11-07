require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // 로컬 Postgres면 false
});

module.exports = { pool };