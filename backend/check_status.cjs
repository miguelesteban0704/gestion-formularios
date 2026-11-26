const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT DISTINCT status FROM forms").then(r => console.log('Status values:', r.rows)).catch(e => console.error(e)).finally(() => pool.end());