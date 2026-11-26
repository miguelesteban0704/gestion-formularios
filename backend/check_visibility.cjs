const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT DISTINCT visibility FROM forms").then(r => console.log('Visibility values:', r.rows)).catch(e => console.error(e)).finally(() => pool.end());