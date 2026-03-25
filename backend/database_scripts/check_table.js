const db = require('./src/config/supabaseClient');
async function run() {
    try {
        const res = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_otps')");
        console.log('Exists:', res.rows[0].exists);
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit();
    }
}
run();
