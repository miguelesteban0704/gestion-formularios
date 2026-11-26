const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'forms'").then(r => console.log(r.rows.map(c => c.column_name))).catch(e => console.error(e)).finally(() => pool.end());