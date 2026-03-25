const express = require('express');
const router = express.Router();
const stockCtrl = require('../controllers/adminStockController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(requireAdmin);

router.post('/restock', stockCtrl.restock);
router.post('/adjust', stockCtrl.adjust);
router.post('/cancel', stockCtrl.cancel);
router.get('/low', stockCtrl.getLowStock);
router.get('/history', stockCtrl.getHistory);
router.get('/history/:variantId', stockCtrl.getHistory);

module.exports = router;
