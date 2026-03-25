const productSvc = require('../services/productService');

// ── Send helper ──────────────────────────────────────────────────────────────
const send = (res, status, data) => res.status(status).json(data);
const ok = (res, data, status = 200) => send(res, status, { success: true, data });
const fail = (res, err) => send(res, err.status || 500, { success: false, message: err.message });

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /admin/products
 * Query: ?category=&search=&active=true|false
 */
const listProducts = async (req, res) => {
    try {
        const { category, search, active } = req.query;
        const data = await productSvc.getAll({
            category: category || null,
            search: search || null,
            active: active !== undefined ? active === 'true' : undefined
        });
        ok(res, data);
    } catch (e) { fail(res, e); }
};

/**
 * GET /admin/products/:id
 */
const getProduct = async (req, res) => {
    try {
        const product = await productSvc.getById(req.params.id);
        if (!product) return fail(res, { status: 404, message: 'Product not found' });
        ok(res, product);
    } catch (e) { fail(res, e); }
};

/**
 * POST /admin/products
 * Body: { name, description?, category_id?, is_active?, variants?: [...] }
 */
const createProduct = async (req, res) => {
    try {
        const product = await productSvc.create(req.body);
        ok(res, product, 201);
    } catch (e) { fail(res, e); }
};

/**
 * PUT /admin/products/:id
 * Body: { name, description?, category_id?, is_active?, variants?: [...] }
 */
const updateProduct = async (req, res) => {
    try {
        const product = await productSvc.update(req.params.id, req.body);
        ok(res, product);
    } catch (e) { fail(res, e); }
};

/**
 * PATCH /admin/products/:id/toggle
 * Toggle is_active
 */
const toggleProduct = async (req, res) => {
    try {
        const product = await productSvc.toggle(req.params.id);
        ok(res, product);
    } catch (e) { fail(res, e); }
};

/**
 * DELETE /admin/products/:id
 * Soft delete (sets is_active = false)
 */
const deleteProduct = async (req, res) => {
    try {
        const product = await productSvc.getById(req.params.id);
        if (!product) return fail(res, { status: 404, message: 'Product not found' });

        if (product.is_active) {
            await productSvc.softDelete(req.params.id);
            ok(res, { message: 'Product deactivated successfully' });
        } else {
            await productSvc.remove(req.params.id);
            ok(res, { message: 'Product permanently deleted' });
        }
    } catch (e) { fail(res, e); }
};

module.exports = { listProducts, getProduct, createProduct, updateProduct, toggleProduct, deleteProduct };
