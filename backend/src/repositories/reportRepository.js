const db = require("../config/supabaseClient");

// ─── Helper: date range WHERE clause ──────────────────────────────────────────
const dateRange = (alias, start, end, params) => {
    const clauses = [];
    if (start) { params.push(start); clauses.push(`${alias}.created_at >= $${params.length}`); }
    if (end) { params.push(end); clauses.push(`${alias}.created_at <= $${params.length}::date + interval '1 day'`); }
    return clauses;
};

// ─── 1. SALES REPORT ──────────────────────────────────────────────────────────
const getSalesReport = async ({ startDate, endDate, groupBy = "day" }) => {
    const params = [];
    const whereClauses = dateRange("o", startDate, endDate, params);
    // Only count delivered orders
    whereClauses.push(`o.status = 'delivered'`);
    const where = `WHERE ${whereClauses.join(" AND ")}`;

    // groupFormat: hour | day | week (ISO Mon start) | month
    const groupFormat =
        groupBy === "month" ? `TO_CHAR(o.created_at, 'YYYY-MM')` :
            groupBy === "week" ? `TO_CHAR(DATE_TRUNC('week', o.created_at AT TIME ZONE 'Asia/Bangkok'), 'YYYY-MM-DD')` :
                groupBy === "hour" ? `TO_CHAR(o.created_at AT TIME ZONE 'Asia/Bangkok', 'HH24:00')` :
                    `TO_CHAR(o.created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD')`;

    const [summary, byPeriod, byProduct, byCategory] = await Promise.all([
        // Summary stats
        db.query(
            `SELECT
                COUNT(*)::int                       AS total_orders,
                COALESCE(SUM(o.total_amount), 0)    AS total_revenue,
                COALESCE(MIN(o.total_amount), 0)    AS min_order,
                COALESCE(MAX(o.total_amount), 0)    AS max_order
             FROM orders o ${where}`, params
        ),

        // Revenue by day/month
        db.query(
            `SELECT
                ${groupFormat} AS period,
                COUNT(*)::int  AS orders,
                SUM(o.total_amount) AS revenue
             FROM orders o ${where}
             GROUP BY period ORDER BY period`, params
        ),

        // Revenue by product
        db.query(
            `SELECT
                p.product_id,
                p.name AS product_name,
                SUM(oi.quantity)             AS units_sold,
                SUM(oi.price * oi.quantity)  AS revenue
             FROM order_items oi
             JOIN product_variants pv ON oi.variant_id = pv.variant_id
             JOIN products p ON pv.product_id = p.product_id
             JOIN orders o ON oi.order_id = o.order_id
             ${where}
             GROUP BY p.product_id, p.name
             ORDER BY revenue DESC LIMIT 20`, params
        ),

        // Revenue by category
        db.query(
            `SELECT
                c.category_id,
                c.name AS category_name,
                COUNT(DISTINCT o.order_id)::int AS order_count,
                SUM(oi.quantity)::int            AS units_sold,
                SUM(oi.price * oi.quantity)      AS revenue
             FROM order_items oi
             JOIN product_variants pv ON oi.variant_id = pv.variant_id
             JOIN products p ON pv.product_id = p.product_id
             JOIN categories c ON p.category_id = c.category_id
             JOIN orders o ON oi.order_id = o.order_id
             ${where}
             GROUP BY c.category_id, c.name
             ORDER BY revenue DESC`, params
        ),
    ]);

    return {
        summary: summary.rows[0],
        by_period: byPeriod.rows,
        by_product: byProduct.rows,
        by_category: byCategory.rows,
    };
};

// ─── 2. PRODUCT PERFORMANCE REPORT ────────────────────────────────────────────
const getProductReport = async ({ startDate, endDate }) => {
    const params = [];
    const dClauses = dateRange("o", startDate, endDate, params);
    // Only count delivered orders
    dClauses.push(`o.status = 'delivered'`);
    const dateWhere = dClauses.length ? `AND ${dClauses.join(" AND ")}` : "";

    // Shared product query template
    const productQuery = (orderBy, limit = 10) => `
        SELECT
            p.product_id,
            p.name AS product_name,
            c.name AS category_name,
            SUM(oi.quantity)            AS units_sold,
            SUM(oi.price * oi.quantity) AS revenue,
            MIN(pv.price)               AS min_price,
            MAX(pv.price)               AS max_price,
            SUM(pv.stock_quantity)      AS stock_remaining
         FROM order_items oi
         JOIN product_variants pv ON oi.variant_id = pv.variant_id
         JOIN products p ON pv.product_id = p.product_id
         LEFT JOIN categories c ON p.category_id = c.category_id
         JOIN orders o ON oi.order_id = o.order_id
         WHERE 1=1 ${dateWhere}
         GROUP BY p.product_id, p.name, c.name
         ORDER BY ${orderBy} DESC LIMIT ${limit}
    `;

    const [topSelling, topByRevenue, lowSelling, staleProducts, byCategory] = await Promise.all([
        // Top 10 by units sold
        db.query(productQuery("units_sold", 10), params),

        // Top 10 by revenue (฿)
        db.query(productQuery("revenue", 10), params),

        // Low selling (Products with no 'Sale Fix' movement for > 7 days)
        db.query(
            `SELECT
                p.product_id,
                p.name AS product_name,
                c.name AS category_name,
                lt.last_sale,
                SUM(pv.stock_quantity)::int AS stock_remaining
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.category_id
             LEFT JOIN product_variants pv ON pv.product_id = p.product_id
             LEFT JOIN (
                 SELECT pv2.product_id, MAX(it.created_at) as last_sale
                 FROM inventory_transactions it
                 JOIN product_variants pv2 ON it.variant_id = pv2.variant_id
                 WHERE it.notes LIKE '%แก้ไขจากการขาย%'
                 GROUP BY pv2.product_id
             ) lt ON lt.product_id = p.product_id
             WHERE p.is_active = true
             GROUP BY p.product_id, p.name, c.name, lt.last_sale
             HAVING (lt.last_sale IS NULL OR lt.last_sale < NOW() - INTERVAL '7 days')
             ORDER BY lt.last_sale ASC NULLS FIRST
             LIMIT 20`, []
        ),

        // Stock remaining per variant
        db.query(
            `SELECT
                p.product_id,
                p.name AS product_name,
                pv.variant_id,
                pv.sku,
                pv.price,
                pv.stock_quantity,
                pv.low_stock_threshold,
                CASE
                    WHEN pv.stock_quantity = 0 THEN 'out_of_stock'
                    WHEN pv.stock_quantity <= pv.low_stock_threshold THEN 'low_stock'
                    ELSE 'ok'
                END AS stock_status
             FROM product_variants pv
             JOIN products p ON pv.product_id = p.product_id
             WHERE p.is_active = true
             ORDER BY stock_quantity ASC LIMIT 50`, []
        ),

        // Category performance
        db.query(
            `SELECT 
                c.category_id,
                c.name as category_name,
                SUM(oi.quantity)::int as units_sold,
                SUM(oi.price * oi.quantity) as revenue
             FROM categories c
             JOIN products p ON p.category_id = c.category_id
             JOIN product_variants pv ON pv.product_id = p.product_id
             JOIN order_items oi ON oi.variant_id = pv.variant_id
             JOIN orders o ON oi.order_id = o.order_id
             WHERE 1=1 ${dateWhere}
             GROUP BY c.category_id, c.name
             ORDER BY revenue DESC`, params
        )
    ]);

    return {
        top_selling: topSelling.rows,       // Ranked by units sold
        top_by_revenue: topByRevenue.rows,  // Ranked by revenue (฿)
        low_selling: lowSelling.rows,
        stock_detail: staleProducts.rows,
        by_category: byCategory.rows,
    };
};

// ─── 3. INVENTORY REPORT ──────────────────────────────────────────────────────
const getInventoryReport = async () => {
    const [lowStock, outOfStock, inventoryValue, recentMovements] = await Promise.all([
        db.query(
            `SELECT
                p.product_id,
                p.name AS product_name,
                pv.variant_id,
                pv.sku,
                pv.stock_quantity,
                pv.low_stock_threshold
             FROM product_variants pv
             JOIN products p ON pv.product_id = p.product_id
             WHERE pv.stock_quantity > 0
               AND pv.stock_quantity <= pv.low_stock_threshold
               AND p.is_active = true
             ORDER BY pv.stock_quantity ASC`, []
        ),

        db.query(
            `SELECT p.product_id, p.name AS product_name, pv.variant_id, pv.sku
             FROM product_variants pv
             JOIN products p ON pv.product_id = p.product_id
             WHERE pv.stock_quantity = 0 AND p.is_active = true
             ORDER BY p.name`, []
        ),

        db.query(
            `SELECT
                SUM(pv.stock_quantity)          AS total_units,
                COUNT(DISTINCT pv.variant_id)   AS total_variants,
                COUNT(DISTINCT p.product_id)    AS total_products,
                SUM(pv.stock_quantity * pv.price) AS inventory_value_at_price
             FROM product_variants pv
             JOIN products p ON pv.product_id = p.product_id
             WHERE p.is_active = true`, []
        ),

        db.query(
            `SELECT
                it.transaction_id,
                it.transaction_type,
                it.quantity_changed,
                it.notes,
                it.created_at,
                pv.sku,
                p.name AS product_name
             FROM inventory_transactions it
             JOIN product_variants pv ON it.variant_id = pv.variant_id
             JOIN products p ON pv.product_id = p.product_id
             ORDER BY it.created_at DESC LIMIT 30`, []
        ),
    ]);

    return {
        low_stock: lowStock.rows,
        out_of_stock: outOfStock.rows,
        summary: inventoryValue.rows[0],
        recent_movements: recentMovements.rows,
    };
};

// ─── 4. CUSTOMER REPORT ───────────────────────────────────────────────────────
const getCustomerReport = async ({ startDate, endDate }) => {
    const params = [];
    const dClauses = dateRange("u", startDate, endDate, params);
    const userWhere = dClauses.length ? `WHERE ${dClauses.join(" AND ")}` : "";

    const orderParams = [];
    const oDClauses = dateRange("o", startDate, endDate, orderParams);
    // Only count delivered orders
    oDClauses.push(`o.status = 'delivered'`);
    const orderWhere = oDClauses.length ? `AND ${oDClauses.join(" AND ")}` : "";

    const [newCustomers, topSpenders, repeatBuyers] = await Promise.all([
        // New users in range
        db.query(
            `SELECT COUNT(*)::int AS new_customers FROM users u ${userWhere}`, params
        ),

        // Top spenders
        db.query(
            `SELECT
                u.id,
                u.full_name,
                u.phone_number,
                COUNT(DISTINCT o.order_id)::int AS total_orders,
                SUM(o.total_amount)             AS total_spent,
                AVG(o.total_amount)             AS avg_order_value,
                MAX(o.created_at)               AS last_order_at
             FROM users u
             JOIN orders o ON o.user_id = u.id
             WHERE u.role != 'admin' ${orderWhere}
             GROUP BY u.id, u.full_name, u.phone_number
             ORDER BY total_spent DESC LIMIT 10`, orderParams
        ),

        // Repeat purchasers (>1 order)
        db.query(
            `SELECT
                u.id,
                u.full_name,
                u.phone_number,
                COUNT(DISTINCT o.order_id)::int AS order_count,
                SUM(o.total_amount)             AS lifetime_value
             FROM users u
             JOIN orders o ON o.user_id = u.id
             WHERE u.role != 'admin' ${orderWhere}
             GROUP BY u.id, u.full_name, u.phone_number
             HAVING COUNT(DISTINCT o.order_id) > 1
             ORDER BY order_count DESC LIMIT 20`, orderParams
        ),
    ]);

    return {
        new_customers: newCustomers.rows[0].new_customers,
        top_spenders: topSpenders.rows,
        repeat_buyers: repeatBuyers.rows,
    };
};

// ─── 5. FINANCIAL SUMMARY ─────────────────────────────────────────────────────
const getFinancialSummary = async ({ startDate, endDate }) => {
    const params = [];
    const dClauses = dateRange("o", startDate, endDate, params);
    const [revenue, statusBreakdown, paymentMethods, shippingMethods] = await Promise.all([
        // Summary: Delivered only
        db.query(
            `SELECT
                COUNT(*)::int                    AS total_orders,
                COALESCE(SUM(o.total_amount), 0) AS total_revenue,
                COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
                COALESCE(MIN(o.total_amount), 0) AS min_order,
                COALESCE(MAX(o.total_amount), 0) AS max_order
             FROM orders o 
             WHERE ${[...dClauses, "o.status = 'delivered'"].join(" AND ")}`, params
        ),

        // statusBreakdown: All statuses in range
        db.query(
            `SELECT
                status,
                COUNT(*)::int       AS count,
                SUM(o.total_amount) AS total
             FROM orders o 
             WHERE ${dClauses.join(" AND ")}
             GROUP BY status ORDER BY count DESC`, params
        ),

        // paymentMethods: All statuses in range
        db.query(
            `SELECT
                o.payment_method     AS method,
                COUNT(*)::int       AS count,
                SUM(o.total_amount) AS total
             FROM orders o
             WHERE ${dClauses.join(" AND ")}
             GROUP BY o.payment_method ORDER BY total DESC`, params
        ),

        // shippingMethods: All statuses in range
        db.query(
            `SELECT
                shipping_provider,
                COUNT(*)::int AS count
             FROM orders o
             WHERE ${dClauses.join(" AND ")}
             GROUP BY shipping_provider ORDER BY count DESC`, params
        ),
    ]);

    const rev = revenue.rows[0];
    return {
        summary: rev,
        by_status: statusBreakdown.rows,
        by_payment_method: paymentMethods.rows,
        by_shipping_method: shippingMethods.rows,
    };
};

module.exports = { getSalesReport, getProductReport, getInventoryReport, getCustomerReport, getFinancialSummary };
