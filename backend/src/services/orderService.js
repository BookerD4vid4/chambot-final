const repo = require("../repositories/orderRepository");
const stockService = require("./stockService");

// ─── Valid Status Transitions (matches order_status ENUM in SCHEMA.sql) ──────
// ENUM: 'pending','shipped','delivered','cancelled'
const TRANSITIONS = {
    pending: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
};


const validateTransition = (from, to) => {
    if (!TRANSITIONS[from]) throw new Error(`Unknown status: ${from}`);
    if (!TRANSITIONS[from].includes(to)) {
        throw new Error(`Cannot transition from "${from}" to "${to}". Allowed: [${TRANSITIONS[from].join(", ") || "none"}]`);
    }
};

// ─── Get All Orders (Admin) ───────────────────────────────────────────────────
const getAllOrders = async (filters) => {
    return repo.findAll(filters);
};

// ─── Get Single Order Detail ──────────────────────────────────────────────────
const getOrderById = async (id) => {
    const order = await repo.findById(id);
    if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    return order;
};

// ─── Get User's Orders ────────────────────────────────────────────────────────
const getMyOrders = async (user_id, pagination) => {
    return repo.findByUserId(user_id, pagination);
};

// ─── Get Timeline (public tracking) ──────────────────────────────────────────
const trackOrder = async (id) => {
    const data = await repo.getTimeline(id);
    if (!data) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    return data;
};

// ─── Update Status (Admin) ────────────────────────────────────────────────────
const updateStatus = async (id, { status, note, changed_by }) => {
    // Validate transition
    const current = await repo.getStatus(id);
    if (!current) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    validateTransition(current, status);

    // Update order status
    await repo.updateStatus(id, { status });

    // Log
    await repo.addStatusLog(id, { status, changed_by: changed_by || "admin", note });

    // ── When shipping: deduct stock & release reservations ──────────────────
    if (status === "shipped") {
        // Fire-and-forget inside async block so errors are logged but don't break the response
        setImmediate(async () => {
            try {
                await stockService.deductStockOnShipped(id);
            } catch (err) {
                console.error(`[orderService] ❌ Stock deduction failed for order #${id}:`, err.message);
            }
        });
    }

    return repo.findById(id);
};

// ─── Create Order ─────────────────────────────────────────────────────────────
const createOrder = async (payload) => {
    if (!payload.items || payload.items.length === 0) {
        throw Object.assign(new Error("Order must have at least one item"), { statusCode: 400 });
    }
    return repo.createOrder(payload);
};

// ─── Cancel Order (user or admin) ─────────────────────────────────────────────
const cancelOrder = async (id, { changed_by, note }) => {
    return updateStatus(id, { status: "cancelled", changed_by, note });
};

// ─── Delete Order (admin only) ────────────────────────────────────────────────
const deleteOrder = async (id) => {
    const order = await repo.deleteOrder(id);
    if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    return order;
};

module.exports = { getAllOrders, getOrderById, getMyOrders, trackOrder, updateStatus, createOrder, cancelOrder, deleteOrder };
