const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/orderController");
const { authenticate, requireAdmin } = require("../middleware/auth");

// All admin order routes require authentication + admin role
router.use(authenticate);

// GET /api/admin/orders  — list with filters & pagination
router.get("/", requireAdmin, ctrl.getAllOrders);

// GET /api/admin/orders/:id  — full detail + timeline
router.get("/:id", requireAdmin, ctrl.getOrderById);

// PATCH /api/admin/orders/:id/status  — status transition + log
router.patch("/:id/status", requireAdmin, ctrl.updateStatus);

// DELETE /api/admin/orders/:id  — delete order (permanent)
router.delete("/:id", requireAdmin, ctrl.deleteOrder);

module.exports = router;
