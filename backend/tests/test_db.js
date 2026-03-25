const db = require('./src/config/supabaseClient');
async function test() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        console.log('Columns in users table:', res.rows.map(r => r.column_name));
    } catch (err) {
        console.error('Error fetching columns:', err.message);
    } finally {
        process.exit();
    }
}
test();
