const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT count(*) as total FROM forms WHERE visibility = 'public' AND status = 'published'").then(r => console.log('Public + published:', r.rows[0].total)).catch(e => console.error(e)).finally(() => pool.end());