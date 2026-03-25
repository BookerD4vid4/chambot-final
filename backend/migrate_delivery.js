const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.fjblsnkdqgkuoimhhayr:Sriinnop5745@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Adding is_locked column to delivery_settings...');
    await pool.query("ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false");
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
