const express = require('express');
const router = express.Router();
const variantCtrl = require('../controllers/adminVariantController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(requireAdmin);

router.get('/products/:productId', variantCtrl.listVariants);
router.post('/products/:productId', variantCtrl.addVariant);
router.put('/:variantId', variantCtrl.updateVariant);
router.patch('/:variantId/toggle', variantCtrl.toggleVariant);

module.exports = router;
