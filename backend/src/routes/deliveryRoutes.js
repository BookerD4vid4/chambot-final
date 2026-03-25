"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/deliveryController");
const { authenticate, requireAdmin } = require("../middleware/auth");

/**
 * deliveryRoutes.js
 * GET /api/delivery-settings (Public)
 * PATCH /api/delivery-settings (Admin)
 */

router.get("/", controller.getSettings);
router.patch("/", authenticate, requireAdmin, controller.updateSettings);

module.exports = router;
