const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const sql = fs.readFileSync(path.join(__dirname, 'CREATE_VIEWS.sql'), 'utf-8');
    const client = await pool.connect();
    try {
        console.log('Creating views...');
        await client.query(sql);
        console.log('✅ product_list_view created successfully!');

        // Verify
        const res = await client.query('SELECT COUNT(*) FROM product_list_view');
        console.log(`✅ View works! Found ${res.rows[0].count} products.`);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
