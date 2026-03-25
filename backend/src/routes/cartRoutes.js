const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { authenticate, requireAuth } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate, requireAuth);

router.get("/", cartController.getMyCart);
router.post("/items", cartController.addItem);
router.patch("/items", cartController.updateItem);
router.delete("/items/:variant_id", cartController.removeItem);
router.delete("/", cartController.clearCart);

module.exports = router;
