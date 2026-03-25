const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        // Step 1: Apply migration (creates order_status_logs + views)
        console.log('🔧 Applying MIGRATION.sql...');
        const migration = fs.readFileSync(path.join(__dirname, 'MIGRATION.sql'), 'utf-8');
        await client.query(migration);
        console.log('✅ Migration applied!');

        // Step 2: Apply views
        console.log('🔧 Applying CREATE_VIEWS.sql...');
        const views = fs.readFileSync(path.join(__dirname, 'CREATE_VIEWS.sql'), 'utf-8');
        await client.query(views);
        console.log('✅ Views created!');

        // Step 3: Apply seed data
        console.log('⏳ Inserting sample orders...');
        const seed = fs.readFileSync(path.join(__dirname, 'SAMPLE_ORDERS.sql'), 'utf-8');
        await client.query(seed);
        console.log('✅ Sample orders inserted!');

        // Summary
        const orders = await client.query('SELECT COUNT(*) FROM orders');
        const paid = await client.query("SELECT COALESCE(SUM(total_amount),0) AS rev FROM orders WHERE payment_status='paid'");
        const users = await client.query("SELECT COUNT(*) FROM users WHERE role='customer'");
        console.log('\n📊 Database Summary:');
        console.log(`  👥 Customers : ${users.rows[0].count}`);
        console.log(`  🛒 Orders    : ${orders.rows[0].count}`);
        console.log(`  💰 Revenue   : ฿${Number(paid.rows[0].rev).toLocaleString('th-TH')}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}
run();
