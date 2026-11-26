const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT count(*) as total FROM forms WHERE status IN ('published', 'visible', 'publico') AND is_archived = false AND visibility <> 'private'").then(r => console.log('total guest:', r.rows[0].total)).catch(e => console.error(e)).finally(() => pool.end());