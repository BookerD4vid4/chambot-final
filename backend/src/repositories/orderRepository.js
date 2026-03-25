const db = require("../config/supabaseClient");

// ─── Find All (admin) ────────────────────────────────────────────────────────
const findAll = async ({ status, search, date_from, date_to, page = 1, limit = 20 }) => {
    const conditions = [];
    const params = [];

    if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
    }
    if (search) {
        params.push(`%${search}%`);
        // Search by order_id or customer_name (via view)
        conditions.push(`(order_id::text LIKE $${params.length} OR customer_name ILIKE $${params.length})`);
    }
    if (date_from) {
        params.push(date_from);
        conditions.push(`created_at >= $${params.length}`);
    }
    if (date_to) {
        params.push(date_to);
        conditions.push(`created_at <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * limit;

    const countResult = await db.query(
        `SELECT COUNT(*) FROM order_list_view ${where}`, params
    );
    params.push(limit, offset);
    const dataResult = await db.query(
        `SELECT olv.*,
                cl.note         AS cancel_note,
                cl.changed_by   AS cancelled_by
         FROM order_list_view olv
         LEFT JOIN LATERAL (
             SELECT note, changed_by
             FROM order_status_logs
             WHERE order_id = olv.order_id AND status = 'cancelled'
             ORDER BY created_at DESC
             LIMIT 1
         ) cl ON true
         ${where.replace(/WHERE /i, 'WHERE olv.')}
         ORDER BY olv.order_id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );

    return {
        data: dataResult.rows,
        total: parseInt(countResult.rows[0].count, 10),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };
};

// ─── Find One by ID ───────────────────────────────────────────────────────────
const findById = async (id) => {
    const orderResult = await db.query(
        `SELECT o.*, u.full_name AS customer_name, u.phone_number AS customer_phone
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.order_id = $1`, [id]
    );
    if (orderResult.rows.length === 0) return null;

    const [items, timeline] = await Promise.all([
        db.query(
            `SELECT oi.*, pv.sku, p.name AS product_name, pv.image_url
             FROM order_items oi
             JOIN product_variants pv ON oi.variant_id = pv.variant_id
             JOIN products p ON pv.product_id = p.product_id
             WHERE oi.order_id = $1`,
            [id]
        ),
        db.query(
            "SELECT status, changed_by, note, created_at FROM order_status_logs WHERE order_id = $1 ORDER BY created_at ASC",
            [id]
        ),
    ]);

    const order = orderResult.rows[0];
    order.items = items.rows;
    order.timeline = timeline.rows;

    // Backward compatibility for frontend: map address_snapshot to 'shipment' property
    order.shipment = {
        address_snapshot: order.address_snapshot || {}
    };

    return order;
};

// ─── Find Orders by User ──────────────────────────────────────────────────────
const findByUserId = async (userId, { page = 1, limit = 10 } = {}) => {
    const offset = (page - 1) * limit;
    const result = await db.query(
        `SELECT * FROM order_list_view WHERE user_id = $1 ORDER BY order_id DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    const count = await db.query(
        "SELECT COUNT(*) FROM orders WHERE user_id = $1", [userId]
    );
    return {
        data: result.rows,
        total: parseInt(count.rows[0].count, 10),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };
};

// ─── Update Status ────────────────────────────────────────────────────────────
const updateStatus = async (id, { status }) => {
    const query = `UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2 RETURNING *`;
    const params = [status, id];
    const result = await db.query(query, params);
    return result.rows[0];
};

// ─── Add Status Log ───────────────────────────────────────────────────────────
const addStatusLog = async (order_id, { status, changed_by = "system", note = null }) => {
    const result = await db.query(
        `INSERT INTO order_status_logs (order_id, status, changed_by, note) VALUES ($1, $2, $3, $4) RETURNING *`,
        [order_id, status, changed_by, note]
    );
    return result.rows[0];
};

// ─── Get Timeline only ────────────────────────────────────────────────────────
const getTimeline = async (id) => {
    const order = await db.query(
        `SELECT o.order_id, o.status, o.total_amount
         FROM orders o
         WHERE o.order_id = $1`, [id]
    );
    if (order.rows.length === 0) return null;
    
    const [logs, items] = await Promise.all([
        db.query(
            `SELECT status, changed_by, note, created_at FROM order_status_logs WHERE order_id = $1 ORDER BY created_at ASC`,
            [id]
        ),
        db.query(
            `SELECT oi.*, pv.sku, p.name AS product_name, pv.image_url
             FROM order_items oi
             JOIN product_variants pv ON oi.variant_id = pv.variant_id
             JOIN products p ON pv.product_id = p.product_id
             WHERE oi.order_id = $1`,
            [id]
        )
    ]);
    
    return { ...order.rows[0], timeline: logs.rows, items: items.rows };
};

// ─── Get current status ───────────────────────────────────────────────────────
const getStatus = async (id) => {
    const result = await db.query("SELECT status FROM orders WHERE order_id = $1", [id]);
    return result.rows[0]?.status || null;
};

// ─── Create Order (transaction) ───────────────────────────────────────────────
const createOrder = async ({ user_id, items, total_amount, address_snapshot, address }) => {
    await db.query("BEGIN");
    try {
        // Resolve address_snapshot: if it's not provided but 'address' (string) is, use it
        const finalAddress = address_snapshot || (address ? { address_line: address } : {});

        // 1. Create Order (Simplified Table)
        const orderRes = await db.query(
            "INSERT INTO orders (user_id, total_amount, status, address_snapshot) VALUES ($1, $2, 'pending', $3) RETURNING *",
            [user_id, total_amount, typeof finalAddress === 'string' ? finalAddress : JSON.stringify(finalAddress)]
        );
        const newOrder = orderRes.rows[0];

        // 2. Insert Items & Reserve Stock
        for (const item of items) {
            await db.query(
                "INSERT INTO order_items (order_id, variant_id, price, quantity) VALUES ($1, $2, $3, $4)",
                [newOrder.order_id, item.variant_id, item.price, item.quantity]
            );
            
            // Update reserved_quantity in product_variants
            await db.query(
                "UPDATE product_variants SET reserved_quantity = reserved_quantity + $1 WHERE variant_id = $2",
                [item.quantity, item.variant_id]
            );
        }

        // 3. Log initial status
        await db.query(
            "INSERT INTO order_status_logs (order_id, status, changed_by, note) VALUES ($1, 'pending', 'system', 'Order created')",
            [newOrder.order_id]
        );

        await db.query("COMMIT");
        return newOrder;
    } catch (err) {
        await db.query("ROLLBACK");
        throw err;
    }
};

// ─── Delete Order (admin only) ────────────────────────────────────────────────
const deleteOrder = async (id) => {
    const result = await db.query("DELETE FROM orders WHERE order_id = $1 RETURNING *", [id]);
    return result.rows[0] || null;
};

module.exports = { findAll, findById, findByUserId, updateStatus, addStatusLog, getTimeline, getStatus, createOrder, deleteOrder };
