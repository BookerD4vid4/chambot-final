const express = require('express');
const router = express.Router();
const productCtrl = require('../controllers/adminProductController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All product admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/', productCtrl.listProducts);
router.post('/', productCtrl.createProduct);
router.get('/:id', productCtrl.getProduct);
router.put('/:id', productCtrl.updateProduct);
router.patch('/:id/toggle', productCtrl.toggleProduct);
router.delete('/:id', productCtrl.deleteProduct);

module.exports = router;
