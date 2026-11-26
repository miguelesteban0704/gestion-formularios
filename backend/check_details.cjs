const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, title, visibility, status, is_archived, published_at FROM forms WHERE visibility = 'public' AND status = 'published'").then(r => console.table(r.rows)).catch(e => console.error(e)).finally(() => pool.end());