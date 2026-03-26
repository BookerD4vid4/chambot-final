const stockSvc = require('../services/stockService');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, err) => res.status(err.status || 500).json({ success: false, message: err.message });

/**
 * POST /admin/stock/restock
 * Body: { variant_id, quantity, notes? } OR [{ variant_id, quantity, notes? }, ...]
 */
const restock = async (req, res) => {
    try {
        const data = await stockSvc.restock(req.body, req.user?.id);
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * POST /admin/stock/adjust
 * Body: { variant_id, delta, reason?, notes? } OR [{ variant_id, delta, reason?, notes? }, ...]
 */
const adjust = async (req, res) => {
    try {
        const data = await stockSvc.adjust(req.body, req.user?.id);
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * POST /admin/stock/cancel
 * Body: { variant_id, quantity, notes?, reference_order_id? } OR array
 */
const cancel = async (req, res) => {
    try {
        const data = await stockSvc.cancel(req.body, req.user?.id);
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * GET /admin/stock/low
 */
const getLowStock = async (req, res) => {
    try {
        const data = await stockSvc.getLowStock();
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * GET /admin/stock/history
 * GET /admin/stock/history/:variantId
 * Query: ?limit=
 */
const getHistory = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { limit } = req.query;
        const data = await stockSvc.getHistory(variantId, limit);
        ok(res, data);
    } catch (e) { fail(res, e); }
};

module.exports = { restock, adjust, cancel, getLowStock, getHistory };
