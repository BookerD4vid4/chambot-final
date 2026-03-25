require('dotenv').config();
const db = require('./src/config/supabaseClient');

async function test() {
    try {
        console.log("=== COCA COLA VARIANTS ===");
        const { rows } = await db.query(`
            SELECT p.product_id, p.name, v.variant_id, v.sku, v.unit, v.price, v.stock_quantity, v.is_main
            FROM products p
            JOIN product_variants v ON p.product_id = v.product_id
            WHERE p.name ILIKE '%cola%' OR p.name ILIKE '%โค้ก%'
        `);
        console.table(rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
