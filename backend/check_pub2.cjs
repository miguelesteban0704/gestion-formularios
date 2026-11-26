const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT count(*) as total FROM forms WHERE visibility = 'public' AND status = 'published' AND is_archived = false").then(r => console.log('Public + published + not archived:', r.rows[0].total)).catch(e => console.error(e)).finally(() => pool.end());