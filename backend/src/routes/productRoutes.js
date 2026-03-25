const express = require("express");
const router = express.Router();
const adminProductCtrl = require("../controllers/adminProductController");
const adminStockCtrl = require("../controllers/adminStockController");
const variantCtrl = require("../controllers/adminVariantController");

// ─── Variants endpoints (used by frontend api/index.js) ──────────────────────
// These MUST come before /:id to avoid route conflicts

// GET  /api/products/variants         → StockPage getAllVariants()
router.get("/variants", variantCtrl.getAllVariants);

// GET  /api/products/variants/history → getAllStockHistory()
router.get("/variants/history", adminStockCtrl.getHistory);

// GET  /api/products/variants/:id/history → getStockHistory(variantId)
router.get("/variants/:variantId/history", adminStockCtrl.getHistory);

// PATCH /api/products/variants/:id/set-main → setMainVariant()
router.patch("/variants/:variantId/set-main", variantCtrl.setMain);

// PATCH /api/products/variants/:id/stock → adjustStock()
router.patch("/variants/:variantId/stock", async (req, res) => {
    const { delta, reason, notes, low_stock_threshold } = req.body;
    const { variantId } = req.params;
    try {
        // Handle threshold update without stock change
        if (delta === 0 && low_stock_threshold !== undefined) {
            const db = require("../config/supabaseClient");
            const r = await db.query(
                "UPDATE product_variants SET low_stock_threshold=$1, updated_at=NOW() WHERE variant_id=$2 RETURNING *",
                [Number(low_stock_threshold), variantId]
            );
            return res.status(200).json({ success: true, data: r.rows[0] });
        }
        const results = await require("../services/stockService").adjust({
            variant_id: variantId, delta, reason, notes
        });
        res.status(200).json({ success: true, data: results[0] });
    } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});

// ─── Low-stock alerts ────────────────────────────────────────────────────────
router.get("/alerts/low-stock", adminStockCtrl.getLowStock);

// ─── Product CRUD ────────────────────────────────────────────────────────────
// NOTE: /:id must come AFTER all specific sub-routes above
router.get("/", adminProductCtrl.listProducts);
router.post("/", adminProductCtrl.createProduct);
router.get("/:id", adminProductCtrl.getProduct);
router.put("/:id", adminProductCtrl.updateProduct);
router.patch("/:id/toggle", adminProductCtrl.toggleProduct);
router.delete("/:id", adminProductCtrl.deleteProduct);

module.exports = router;
