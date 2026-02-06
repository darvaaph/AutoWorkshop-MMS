const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validateService } = require('../middleware/validation.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for service image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/uploads/services');
        // Ensure directory exists
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'service-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept empty files (when no image is uploaded)
        cb(null, true);
    }
});

// Optional upload middleware - only processes if image field exists
const optionalUpload = (req, res, next) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        return upload.single('image')(req, res, next);
    }
    next();
};

// Public routes
router.get('/', servicesController.getAllServices);

// Upload service image (Admin only) - harus sebelum :id route
router.post('/:id/upload-image', verifyToken, requireRole('ADMIN'), upload.single('image'), servicesController.uploadServiceImage);

router.get('/:id', servicesController.getServiceById);

// Protected routes (Admin only)
router.post('/', verifyToken, requireRole('ADMIN'), optionalUpload, validateService, servicesController.createService);
router.put('/:id', verifyToken, requireRole('ADMIN'), optionalUpload, servicesController.updateService);
router.delete('/:id', verifyToken, requireRole('ADMIN'), servicesController.deleteService);

module.exports = router;