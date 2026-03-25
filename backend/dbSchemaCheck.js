require('dotenv').config();
const db = require('./src/config/supabaseClient');

async function checkSchema() {
    try {
        console.log("=== PRODUCT_VARIANTS COLUMNS ===");
        const { rows: variantCols } = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'product_variants'
        `);
        console.table(variantCols);

        console.log("\n=== ORDERS COLUMNS ===");
        const { rows: orderCols } = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders'
        `);
        console.table(orderCols);

        console.log("\n=== ORDER_ITEMS COLUMNS ===");
        const { rows: itemCols } = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'order_items'
        `);
        console.table(itemCols);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkSchema();
