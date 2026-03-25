const db = require('../config/supabaseClient');
const axios = require('axios'); // Optional for LINE Notify

/**
 * Sends an alert when stock falls at or below threshold.
 * It logs to console and has a placeholder for LINE Notify integration.
 */
const sendLowStockAlert = async (variantId, sku, remainingStock, threshold) => {
    try {
        // Fetch product name for context
        const { rows } = await db.query(
            `SELECT p.name AS product_name, pv.unit
             FROM product_variants pv 
             JOIN products p ON pv.product_id = p.product_id 
             WHERE pv.variant_id = $1`,
            [variantId]
        );
        
        const productName = rows[0]?.product_name || 'Unknown Product';
        const unit = rows[0]?.unit || 'ชิ้น';
        const variantName = sku && sku.toLowerCase() !== 'default' ? ` [${sku}]` : '';

        const msg = `🚨 แจ้งเตือนสต็อกเหลือน้อย!\n\n📦 สินค้า: ${productName}${variantName}\n📉 คงเหลือ: ${remainingStock} ${unit}\n⚠️ เกณฑ์แจ้งเตือน: ${threshold} ${unit}\n\nกรุณาเติมสต็อกให้เพียงพอต่อการจำหน่ายครับ`;

        // 1. Log to server console
        console.log("\n==========================================");
        console.log(msg);
        console.log("==========================================\n");

        // 2. LINE Notify Hook (if configured in .env)
        const lineToken = process.env.LINE_NOTIFY_TOKEN;
        if (lineToken) {
            await axios.post('https://notify-api.line.me/api/notify', 
                `message=${encodeURIComponent(msg)}`, 
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Bearer ${lineToken}`
                    }
                }
            );
        }
    } catch (err) {
        console.error("[sendLowStockAlert] Failed:", err.message);
    }
};

module.exports = {
    sendLowStockAlert
};
