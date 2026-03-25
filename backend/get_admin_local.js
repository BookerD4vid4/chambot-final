const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.fjblsnkdqgkuoimhhayr:Sriinnop5745@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT phone_number, role FROM users WHERE role = 'admin' LIMIT 1")
  .then(res => {
    console.log('ADMIN_USER:', res.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
