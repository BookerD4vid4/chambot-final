const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.fjblsnkdqgkuoimhhayr:Sriinnop5745@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const { rows } = await pool.query("SELECT * FROM delivery_settings LIMIT 1");
    console.log('Current Delivery Settings:', JSON.stringify(rows[0], null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
