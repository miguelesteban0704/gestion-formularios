const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT count(*) as total FROM forms WHERE visibility = 'public' AND status = 'published' AND is_archived = false AND published_at IS NOT NULL").then(r => console.log('Public forms ready to respond:', r.rows[0].total)).catch(e => console.error(e)).finally(() => pool.end());