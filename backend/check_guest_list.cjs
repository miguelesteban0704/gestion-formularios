const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, title, visibility, status, is_archived FROM forms WHERE status IN ('published', 'visible', 'publico') AND is_archived = false AND visibility <> 'unlisted' AND visibility <> 'private'").then(r => console.table(r.rows)).catch(e => console.error(e)).finally(() => pool.end());