const express = require('express');
const { getAdminProducts, addAdminProduct } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/products', protect, adminOnly, getAdminProducts);
router.post('/products', protect, adminOnly, addAdminProduct);

module.exports = router;
