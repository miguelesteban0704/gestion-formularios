const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, title, visibility, status, is_archived FROM forms WHERE id = 'cd0680ab-75ed-4b28-9eeb-d683432950aa'").then(r => console.table(r.rows)).catch(e => console.error(e)).finally(() => pool.end());