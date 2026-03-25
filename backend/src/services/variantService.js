const db = require('../config/supabaseClient');

// ── SKU uniqueness helper ────────────────────────────────────────────────────
const ensureUniqueSku = async (base, excludeVariantId = null) => {
    let sku = (base || '').trim() || `SKU-${Date.now()}`;
    let counter = 1;
    while (true) {
        const res = await db.query(
            `SELECT variant_id FROM product_variants WHERE sku = $1 ${excludeVariantId ? 'AND variant_id <> $2' : ''}`,
            excludeVariantId ? [sku, excludeVariantId] : [sku]
        );
        if (res.rows.length === 0) return sku;
        sku = `${base || 'SKU'}-${Date.now()}-${counter++}`;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all variants for a product.
 */
const getByProduct = async (productId) => {
    const r = await db.query(
        `SELECT pv.*, p.name AS product_name
         FROM product_variants pv
         JOIN products p ON pv.product_id = p.product_id
         WHERE pv.product_id = $1
         ORDER BY pv.is_main DESC, pv.variant_id ASC`,
        [productId]
    );
    return r.rows;
};

/**
 * Add a new variant to a product.
 * Rules:
 *   - SKU must be unique
 *   - Only one is_main per product
 *   - Price >= 0 (enforced by DB, validated here too)
 *   - Stock is set only here at creation; changes must go via stock endpoints
 */
const addVariant = async (productId, { sku, price, stock_quantity = 0, image_url, unit, low_stock_threshold = 5, is_main = false }) => {
    if (Number(price) < 0) throw Object.assign(new Error('Price cannot be negative'), { status: 400 });

    await db.query('BEGIN');
    try {
        const uniqueSku = await ensureUniqueSku(sku);

        // Ensure only one main per product
        if (is_main) {
            await db.query('UPDATE product_variants SET is_main=false WHERE product_id=$1', [productId]);
        }

        const r = await db.query(
            `INSERT INTO product_variants
                (product_id, sku, price, stock_quantity, image_url, unit, low_stock_threshold, is_main)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING *`,
            [productId, uniqueSku, Number(price), Number(stock_quantity), image_url || null,
                unit || null, Number(low_stock_threshold), is_main]
        );

        await db.query('COMMIT');
        return r.rows[0];
    } catch (e) {
        await db.query('ROLLBACK');
        throw e;
    }
};

/**
 * Update variant fields (price, image, unit, thresholds, is_main).
 * stock_quantity is intentionally excluded — use stock service.
 */
const updateVariant = async (variantId, { sku, price, image_url, unit, low_stock_threshold, is_main }) => {
    if (price !== undefined && Number(price) < 0)
        throw Object.assign(new Error('Price cannot be negative'), { status: 400 });

    await db.query('BEGIN');
    try {
        // If setting as main, clear others in same product first
        if (is_main) {
            const pRes = await db.query('SELECT product_id FROM product_variants WHERE variant_id=$1', [variantId]);
            if (pRes.rows.length) {
                await db.query('UPDATE product_variants SET is_main=false WHERE product_id=$1', [pRes.rows[0].product_id]);
            }
        }

        // Build dynamic SET clause (only provided fields)
        const fields = [];
        const vals = [];
        const set = (col, val) => { if (val !== undefined) { vals.push(val); fields.push(`${col}=$${vals.length}`); } };

        if (sku !== undefined) {
            const uniqueSku = await ensureUniqueSku(sku, variantId);
            set('sku', uniqueSku);
        }
        set('price', price !== undefined ? Number(price) : undefined);
        set('image_url', image_url);
        set('unit', unit);
        set('low_stock_threshold', low_stock_threshold !== undefined ? Number(low_stock_threshold) : undefined);
        set('is_main', is_main);
        fields.push('updated_at=NOW()');

        vals.push(variantId);
        const r = await db.query(
            `UPDATE product_variants SET ${fields.join(',')} WHERE variant_id=$${vals.length} RETURNING *`,
            vals
        );
        if (r.rows.length === 0) throw Object.assign(new Error('Variant not found'), { status: 404 });

        await db.query('COMMIT');
        return r.rows[0];
    } catch (e) {
        await db.query('ROLLBACK');
        throw e;
    }
};

/**
 * Toggle variant is_active.
 */
const toggleVariant = async (variantId) => {
    const r = await db.query(
        `UPDATE product_variants SET is_active = NOT is_active, updated_at=NOW()
         WHERE variant_id=$1 RETURNING *`,
        [variantId]
    );
    if (r.rows.length === 0) throw Object.assign(new Error('Variant not found'), { status: 404 });
    return r.rows[0];
};

/**
 * Get all variants across all products (for stock management table).
 */
const getAllVariants = async ({ category } = {}) => {
    let q = `
        SELECT
            pv.variant_id,
            pv.sku,
            pv.price,
            pv.stock_quantity,
            pv.low_stock_threshold,
            pv.unit,
            pv.image_url,
            pv.is_active,
            pv.is_main,
            p.product_id,
            p.name AS product_name,
            c.category_id,
            c.name AS category_name
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.product_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        WHERE p.is_active = true
    `;
    const params = [];
    if (category) {
        params.push(category);
        q += ` AND c.category_id = $${params.length}`;
    }
    q += " ORDER BY p.name ASC, pv.sku ASC";

    const r = await db.query(q, params);
    return r.rows;
};


/**
 * Set a variant as the main (primary) variant for its product.
 * Clears is_main on all siblings, then sets the target.
 */
const setMain = async (variantId) => {
    await db.query('BEGIN');
    try {
        // Get product_id of this variant
        const res = await db.query('SELECT product_id FROM product_variants WHERE variant_id=$1', [variantId]);
        if (res.rows.length === 0) throw Object.assign(new Error('Variant not found'), { status: 404 });
        const { product_id } = res.rows[0];

        // Clear existing main
        await db.query('UPDATE product_variants SET is_main=false, updated_at=NOW() WHERE product_id=$1', [product_id]);

        // Set new main
        const r = await db.query(
            'UPDATE product_variants SET is_main=true, updated_at=NOW() WHERE variant_id=$1 RETURNING *',
            [variantId]
        );

        await db.query('COMMIT');
        return r.rows[0];
    } catch (e) {
        await db.query('ROLLBACK');
        throw e;
    }
};

module.exports = { getByProduct, addVariant, updateVariant, toggleVariant, getAllVariants, setMain };

