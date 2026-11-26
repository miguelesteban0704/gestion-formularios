const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT status, count(*) as cnt FROM forms WHERE is_archived = false AND visibility <> 'private' GROUP BY status").then(r => console.table(r.rows)).catch(e => console.error(e)).finally(() => pool.end());