const db = require('../config/supabaseClient');
const { embedProduct } = require('./embeddingService');

// Fire-and-forget helper — never throws, never blocks response
const triggerEmbed = (productId) => {
    setImmediate(() =>
        embedProduct(productId).catch(err =>
            console.error(`[embedding] product #${productId}:`, err.message)
        )
    );
};

// ── Slug helper ──────────────────────────────────────────────────────────────
const generateSlug = (name) =>
    name.trim().toLowerCase()
        .replace(/[^\u0000-\u007E]/g, '') // strip non-ASCII (Thai chars)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
    `product-${Date.now()}`;

const ensureUniqueSlug = async (base, excludeId = null) => {
    let slug = base;
    let counter = 1;
    while (true) {
        const res = await db.query(
            `SELECT product_id FROM products WHERE slug = $1 ${excludeId ? 'AND product_id <> $2' : ''}`,
            excludeId ? [slug, excludeId] : [slug]
        );
        if (res.rows.length === 0) return slug;
        slug = `${base}-${counter++}`;
    }
};

// ── SKU uniqueness helper ────────────────────────────────────────────────────
const ensureUniqueSku = async (base, excludeVariantId = null) => {
    let sku = base || `SKU-${Date.now()}`;
    let counter = 1;
    while (true) {
        const res = await db.query(
            `SELECT variant_id FROM product_variants WHERE sku = $1 ${excludeVariantId ? 'AND variant_id <> $2' : ''}`,
            excludeVariantId ? [sku, excludeVariantId] : [sku]
        );
        if (res.rows.length === 0) return sku;
        sku = counter === 1 ? `${base}-${Date.now()}` : `${base}-${Date.now()}-${counter}`;
        counter++;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * List all products with optional category / search filter.
 */
const getAll = async ({ category, search, active } = {}) => {
    let q = 'SELECT * FROM product_list_view WHERE 1=1';
    const params = [];
    if (category) { params.push(category); q += ` AND category_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); q += ` AND product_name ILIKE $${params.length}`; }
    if (active !== undefined) { params.push(active); q += ` AND is_active = $${params.length}`; }
    q += ' ORDER BY product_id DESC';
    const r = await db.query(q, params);
    return r.rows;
};

/**
 * Get single product with variants.
 */
const getById = async (id) => {
    const [pr, vr] = await Promise.all([
        db.query(
            `SELECT p.*, c.name AS category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.category_id
             WHERE p.product_id = $1`, [id]
        ),
        db.query(
            'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY is_main DESC, variant_id ASC', [id]
        )
    ]);
    if (pr.rows.length === 0) return null;
    const product = pr.rows[0];
    product.product_name = product.name;
    product.variants = vr.rows;
    return product;
};

/**
 * Create product + initial variants inside a transaction.
 */
const create = async ({ name, description, category_id, is_active = true, variants = [] }) => {
    if (!name || !name.trim()) throw Object.assign(new Error('Product name is required'), { status: 400 });

    const slug = await ensureUniqueSlug(generateSlug(name));

    await db.query('BEGIN');
    try {
        const pr = await db.query(
            `INSERT INTO products (name, description, category_id, is_active, slug, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
            [name.trim(), description || null, category_id || null, is_active, slug]
        );
        const product = pr.rows[0];

        let hasMain = false;
        for (const [i, v] of variants.entries()) {
            if (Number(v.price) < 0) throw Object.assign(new Error('Price cannot be negative'), { status: 400 });
            const sku = await ensureUniqueSku(v.sku?.trim() || null);
            const isMain = v.is_main === true || (!hasMain && i === 0);
            if (isMain) hasMain = true;

            const vRes = await db.query(
                `INSERT INTO product_variants
                    (product_id, sku, price, stock_quantity, image_url, unit, low_stock_threshold, is_main)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING variant_id`,
                [product.product_id, sku, Number(v.price) || 0, Number(v.stock_quantity) || 0,
                v.image_url || null, v.unit || null, Number(v.low_stock_threshold) || 5, isMain]
            );
            const variantId = vRes.rows[0].variant_id;

            // Record initial stock transaction if > 0
            if (Number(v.stock_quantity) > 0) {
                const qty = Number(v.stock_quantity);
                await db.query(
                    `INSERT INTO inventory_transactions
                        (variant_id, quantity_before, quantity_changed, quantity_after, transaction_type, notes)
                     VALUES ($1, $2, $3, $4, 'restock', 'Initial stock on creation')`,
                    [variantId, 0, qty, qty]
                );
            }
        }

        await db.query('COMMIT');
        // ── Trigger embedding async (does not block response) ──
        triggerEmbed(product.product_id);
        return product;
    } catch (e) {
        await db.query('ROLLBACK');
        throw e;
    }
};

/**
 * Update product fields + sync variants.
 */
const update = async (id, { name, description, category_id, is_active, variants }) => {
    if (!name || !name.trim()) throw Object.assign(new Error('Product name is required'), { status: 400 });

    const slug = await ensureUniqueSlug(generateSlug(name), id);

    await db.query('BEGIN');
    try {
        const pr = await db.query(
            `UPDATE products SET name=$1, description=$2, category_id=$3, is_active=$4, slug=$5, updated_at=NOW()
             WHERE product_id=$6 RETURNING *`,
            [name.trim(), description || null, category_id || null, is_active, slug, id]
        );
        if (pr.rows.length === 0) throw Object.assign(new Error('Product not found'), { status: 404 });

        if (Array.isArray(variants)) {
            const existingRes = await db.query('SELECT variant_id FROM product_variants WHERE product_id=$1', [id]);
            const existingIds = existingRes.rows.map(v => v.variant_id);
            const keepIds = variants.map(v => v.variant_id).filter(Boolean);

            // Delete removed variants
            const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
            if (toDelete.length) await db.query('DELETE FROM product_variants WHERE variant_id = ANY($1)', [toDelete]);

            for (const v of variants) {
                if (Number(v.price) < 0) throw Object.assign(new Error('Price cannot be negative'), { status: 400 });
                if (v.variant_id) {
                    // Update existing (stock_quantity NOT changed here — use stock endpoints)
                    await db.query(
                        `UPDATE product_variants
                         SET sku=$1, price=$2, image_url=$3, unit=$4, low_stock_threshold=$5, is_main=$6, updated_at=NOW()
                         WHERE variant_id=$7 AND product_id=$8`,
                        [v.sku, Number(v.price), v.image_url || null, v.unit || null,
                        Number(v.low_stock_threshold) || 5, v.is_main || false, v.variant_id, id]
                    );
                } else {
                    const sku = await ensureUniqueSku(v.sku?.trim() || null);
                    await db.query(
                        `INSERT INTO product_variants
                            (product_id, sku, price, stock_quantity, image_url, unit, low_stock_threshold, is_main)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                        [id, sku, Number(v.price) || 0, Number(v.stock_quantity) || 0,
                            v.image_url || null, v.unit || null, Number(v.low_stock_threshold) || 5, v.is_main || false]
                    );
                }
            }
        }

        await db.query('COMMIT');
        // ── Trigger embedding async (does not block response) ──
        triggerEmbed(Number(id));
        return pr.rows[0];
    } catch (e) {
        await db.query('ROLLBACK');
        throw e;
    }
};

/**
 * Soft delete (sets is_active = false).
 */
const softDelete = async (id) => {
    const r = await db.query(
        `UPDATE products SET is_active=false, updated_at=NOW() WHERE product_id=$1 RETURNING *`, [id]
    );
    if (r.rows.length === 0) throw Object.assign(new Error('Product not found'), { status: 404 });
    return r.rows[0];
};

/**
 * Toggle is_active.
 */
const toggle = async (id) => {
    const r = await db.query(
        `UPDATE products SET is_active = NOT is_active, updated_at=NOW() WHERE product_id=$1 RETURNING *`, [id]
    );
    if (r.rows.length === 0) throw Object.assign(new Error('Product not found'), { status: 404 });
    return r.rows[0];
};

/**
 * Hard delete product + variants.
 */
const remove = async (id) => {
    await db.query('BEGIN');
    try {
        // 1. Check if product exists in order_items (cannot hard delete if sold)
        const orderCheck = await db.query(
            `SELECT oi.order_id FROM order_items oi
             JOIN product_variants pv ON oi.variant_id = pv.variant_id
             WHERE pv.product_id = $1 LIMIT 1`, [id]
        );
        if (orderCheck.rows.length > 0) {
            throw Object.assign(new Error('ไม่สามารถลบสินค้าได้ เนื่องจากมีการสั่งซื้อสินค้าไปแล้ว (กรุณาใช้การ "ปิดการใช้งาน" แทน)'), { status: 400 });
        }

        // 2. Clear related data that can be safely deleted
        // Delete embeddings
        await db.query('DELETE FROM product_embeddings WHERE product_id = $1', [id]);
        
        // Delete from carts
        await db.query(
            `DELETE FROM cart_items WHERE variant_id IN (SELECT variant_id FROM product_variants WHERE product_id = $1)`, [id]
        );

        // Delete stock reservations
        await db.query(
            `DELETE FROM stock_reservations WHERE variant_id IN (SELECT variant_id FROM product_variants WHERE product_id = $1)`, [id]
        );

        // Delete inventory transactions (history of stock)
        await db.query(
            `DELETE FROM inventory_transactions WHERE variant_id IN (SELECT variant_id FROM product_variants WHERE product_id = $1)`, [id]
        );

        // 3. Delete variants and product
        await db.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
        const r = await db.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [id]);
        
        if (r.rows.length === 0) throw Object.assign(new Error('Product not found'), { status: 404 });
        
        await db.query('COMMIT');
        return r.rows[0];
    } catch (e) {
        await db.query('ROLLBACK');
        throw e;
    }
};

module.exports = { getAll, getById, create, update, softDelete, toggle, remove };
