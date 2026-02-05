const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validateProduct } = require('../middleware/validation.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for product image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/uploads/products');
        // Ensure directory exists
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

// Public routes
router.get('/', productsController.getAllProducts);
router.get('/low-stock', productsController.getLowStockProducts);

// Upload product image (Admin only) - harus sebelum :id route
router.post('/:id/upload-image', verifyToken, requireRole('ADMIN'), upload.single('image'), productsController.uploadProductImage);

router.get('/:id', productsController.getProductById);

module.exports = router;