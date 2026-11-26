const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT count(*) as total FROM forms WHERE status IN ('visible', 'publico') AND is_archived = false").then(r => console.log('visible/publico:', r.rows[0].total)).catch(e => console.error(e)).finally(() => pool.end());