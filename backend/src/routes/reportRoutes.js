const router = require("express").Router();
const ctrl = require("../controllers/reportController");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.use(authenticate, requireAdmin);

router.get("/sales", ctrl.sales);
router.get("/products", ctrl.products);
router.get("/inventory", ctrl.inventory);
router.get("/customers", ctrl.customers);
router.get("/financial", ctrl.financial);

module.exports = router;
