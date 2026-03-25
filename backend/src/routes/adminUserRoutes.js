const express = require("express");
const router = express.Router();
const {
    getMembers,
    suspendMember,
    unsuspendMember,
    initiateAddAdmin,
    confirmAddAdmin,
} = require("../controllers/adminUserController");
const { authenticate, requireAdmin } = require("../middleware/auth");

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Member management
router.get("/", getMembers);
router.patch("/:id/suspend", suspendMember);
router.patch("/:id/unsuspend", unsuspendMember);

// Add admin flow (dual OTP)
router.post("/add-admin/initiate", initiateAddAdmin);
router.post("/add-admin/confirm", confirmAddAdmin);

module.exports = router;
