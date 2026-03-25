const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.fjblsnkdqgkuoimhhayr:Sriinnop5745@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    console.log('Setting province to Samut Prakan...');
    await pool.query("UPDATE delivery_settings SET province = 'Samut Prakan', is_locked = true, district = NULL, tambon = NULL, postal_code = NULL WHERE id = 1");
    console.log('Fix successful!');
    process.exit(0);
  } catch (err) {
    console.error('Fix failed:', err);
    process.exit(1);
  }
}

fix();
