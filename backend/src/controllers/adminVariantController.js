const variantSvc = require('../services/variantService');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, err) => res.status(err.status || 500).json({ success: false, message: err.message });

/**
 * GET /admin/products/:productId/variants
 */
const listVariants = async (req, res) => {
    try {
        const data = await variantSvc.getByProduct(req.params.productId);
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * POST /admin/products/:productId/variants
 * Body: { sku?, price, stock_quantity?, image_url?, unit?, low_stock_threshold?, is_main? }
 */
const addVariant = async (req, res) => {
    try {
        if (req.body.price === undefined) return fail(res, { status: 400, message: 'price is required' });
        const data = await variantSvc.addVariant(req.params.productId, req.body);
        ok(res, data, 201);
    } catch (e) { fail(res, e); }
};

/**
 * PUT /admin/variants/:variantId
 * Body: { sku?, price?, image_url?, unit?, low_stock_threshold?, is_main? }
 * NOTE: stock_quantity cannot be changed here — use /admin/stock/* endpoints
 */
const updateVariant = async (req, res) => {
    try {
        const data = await variantSvc.updateVariant(req.params.variantId, req.body);
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * PATCH /admin/variants/:variantId/toggle
 * Toggle is_active
 */
const toggleVariant = async (req, res) => {
    try {
        const data = await variantSvc.toggleVariant(req.params.variantId);
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * GET /admin/variants/all  (also served at /products/variants for StockPage)
 */
const getAllVariants = async (req, res) => {
    try {
        const data = await variantSvc.getAllVariants({ category: req.query.category });
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * PATCH /products/variants/:variantId/set-main
 */
const setMain = async (req, res) => {
    try {
        const data = await variantSvc.setMain(req.params.variantId);
        ok(res, data);
    } catch (e) { fail(res, e); }
};


module.exports = { listVariants, addVariant, updateVariant, toggleVariant, getAllVariants, setMain };
