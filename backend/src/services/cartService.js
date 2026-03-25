const db = require("../config/supabaseClient");
const repo = require("../repositories/cartRepository");

const getCart = async (user_id) => {
    return repo.getCartByUserId(user_id);
};

const getAvailableStock = async (variant_id) => {
    const { rows } = await db.query(
        "SELECT (stock_quantity - reserved_quantity) AS available FROM product_variants WHERE variant_id = $1",
        [variant_id]
    );
    return rows.length ? Number(rows[0].available) : 0;
};

const addItem = async (user_id, variant_id, quantity) => {
    if (!variant_id || !quantity || quantity <= 0) {
        throw Object.assign(new Error("Invalid item parameters"), { statusCode: 400 });
    }
    // Check current cart quantity for this variant
    const cart = await repo.getCartByUserId(user_id);
    const existing = cart.items.find(i => i.variant_id === variant_id);
    const currentInCart = existing ? existing.quantity : 0;

    const available = await getAvailableStock(variant_id);
    if (currentInCart + quantity > available) {
        throw Object.assign(
            new Error(`สินค้าคงเหลือในสต็อกเพียง ${available} ชิ้น (ในตะกร้ามีอยู่แล้ว ${currentInCart} ชิ้น)`),
            { statusCode: 400 }
        );
    }
    return repo.addItem(user_id, variant_id, quantity);
};

const updateItemQuantity = async (user_id, variant_id, quantity) => {
    if (!variant_id || quantity <= 0) {
        throw Object.assign(new Error("Invalid item parameters"), { statusCode: 400 });
    }
    const available = await getAvailableStock(variant_id);
    if (quantity > available) {
        throw Object.assign(
            new Error(`สินค้าคงเหลือในสต็อกเพียง ${available} ชิ้น`),
            { statusCode: 400 }
        );
    }
    return repo.updateItemQuantity(user_id, variant_id, quantity);
};

const removeItem = async (user_id, variant_id) => {
    if (!variant_id) throw Object.assign(new Error("Invalid variant_id"), { statusCode: 400 });
    return repo.removeItem(user_id, variant_id);
};

const clearCart = async (user_id) => {
    return repo.clearCart(user_id);
};

module.exports = { getCart, addItem, updateItemQuantity, removeItem, clearCart };
