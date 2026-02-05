const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for logo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../public/uploads/logos'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

// Get settings (public for display)
router.get('/', settingsController.getSettings);

// Update settings (Admin only)
router.put('/', verifyToken, requireRole('ADMIN'), settingsController.updateSettings);

// Upload logo (Admin only)
router.post('/upload-logo', verifyToken, requireRole('ADMIN'), upload.single('logo'), settingsController.uploadLogo);

module.exports = router;