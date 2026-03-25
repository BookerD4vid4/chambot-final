const express = require("express");
const router = express.Router();
const adminVariantCtrl = require("../controllers/adminVariantController");
const adminStockCtrl = require("../controllers/adminStockController");

// Points to new admin variant controller methods
router.put("/:variantId", adminVariantCtrl.updateVariant);
router.patch("/:variantId/toggle", adminVariantCtrl.toggleVariant);

// Stock adjustment endpoint
// The old one was .patch("/:id/stock", ...) in variantRoutes.js
// I'll map it to the stock adjust method
router.patch("/:variantId/stock", async (req, res) => {
    // Map single delta from body to the new array-based adjust
    const { delta, reason, notes } = req.body;
    const { variantId } = req.params;
    try {
        const results = await require('../services/stockService').adjust({ variant_id: variantId, delta, reason, notes });
        res.status(200).json({ success: true, data: results[0] });
    } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.message });
    }
});

module.exports = router;
