require('dotenv').config();
const db = require('./src/config/supabaseClient');

async function test() {
    try {
        console.log("=== CATEGORIES ===");
        const { rows: cats } = await db.query('SELECT * FROM categories');
        console.table(cats);

        console.log("\n=== CHATBOT GET CATEGORY LOGIC ===");
        const catName = "ขนมและของว่าง";
        const { rows: testCat } = await db.query(
            `SELECT category_id FROM categories WHERE LOWER(TRIM(name)) LIKE LOWER(TRIM($1)) LIMIT 1`,
            [`%${catName}%`]
        );
        console.dir(testCat);

        if (testCat.length > 0) {
            console.log("\n=== PRODUCTS IN THAT CATEGORY ===");
            const { rows: prods } = await db.query(
                `SELECT p.product_id, p.name, p.category_id, p.is_active 
                 FROM products p 
                 WHERE p.category_id = $1`,
                [testCat[0].category_id]
            );
            console.table(prods);
        }

        console.log("\n=== ALL PRODUCTS WITH 'ขนม' IN NAME OR CATEGORY 3 ===");
        const { rows: allProds } = await db.query(
            `SELECT p.product_id, p.name, p.category_id, p.is_active, c.name as cat_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.category_id
             WHERE p.name LIKE '%ขนม%' OR p.category_id = 3`
        );
        console.table(allProds);

    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

test();
