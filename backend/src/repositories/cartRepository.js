const db = require("../config/supabaseClient");

const getCartByUserId = async (user_id) => {
    // Upsert cart for user
    const cartRes = await db.query(
        "INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING cart_id",
        [user_id]
    );
    const cart_id = cartRes.rows[0].cart_id;

    const itemsRes = await db.query(
        `SELECT ci.variant_id, ci.quantity, pv.sku, pv.price, pv.image_url, pv.unit,
                (pv.stock_quantity - pv.reserved_quantity) AS stock_quantity,
                p.product_id, p.name AS product_name
         FROM cart_items ci
         JOIN product_variants pv ON ci.variant_id = pv.variant_id
         JOIN products p ON pv.product_id = p.product_id
         WHERE ci.cart_id = $1`,
        [cart_id]
    );

    return { cart_id, user_id, items: itemsRes.rows };
};

const addItem = async (user_id, variant_id, quantity) => {
    const cartRes = await db.query(
        "INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING cart_id",
        [user_id]
    );
    const cart_id = cartRes.rows[0].cart_id;

    // Insert or update existing item
    await db.query(
        `INSERT INTO cart_items (cart_id, variant_id, quantity) 
         VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, variant_id) 
         DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
        [cart_id, variant_id, quantity]
    );

    return getCartByUserId(user_id);
};

const updateItemQuantity = async (user_id, variant_id, quantity) => {
    const cartRes = await db.query("SELECT cart_id FROM carts WHERE user_id = $1", [user_id]);
    if (!cartRes.rows.length) return null;
    const cart_id = cartRes.rows[0].cart_id;

    await db.query(
        "UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND variant_id = $3",
        [quantity, cart_id, variant_id]
    );

    return getCartByUserId(user_id);
};

const removeItem = async (user_id, variant_id) => {
    const cartRes = await db.query("SELECT cart_id FROM carts WHERE user_id = $1", [user_id]);
    if (!cartRes.rows.length) return null;
    const cart_id = cartRes.rows[0].cart_id;

    await db.query("DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2", [cart_id, variant_id]);

    return getCartByUserId(user_id);
};

const clearCart = async (user_id) => {
    const cartRes = await db.query("SELECT cart_id FROM carts WHERE user_id = $1", [user_id]);
    if (!cartRes.rows.length) return null;
    const cart_id = cartRes.rows[0].cart_id;

    await db.query("DELETE FROM cart_items WHERE cart_id = $1", [cart_id]);

    return getCartByUserId(user_id);
};

module.exports = { getCartByUserId, addItem, updateItemQuantity, removeItem, clearCart };
