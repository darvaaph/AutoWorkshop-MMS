const express = require('express');
const router = express.Router();
const mechanicsController = require('../controllers/mechanics.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for mechanic photo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/uploads/mechanics');
        // Ensure directory exists
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'mechanic-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    }
});

// All routes require authentication
router.use(verifyToken);

// Get all mechanics
router.get('/', mechanicsController.getAllMechanics);

// Upload mechanic photo (Admin only) - harus sebelum :id route
router.post('/:id/upload-photo', requireRole('ADMIN'), upload.single('photo'), mechanicsController.uploadMechanicPhoto);

// Admin-only routes for sensitive mechanic details
router.get('/:id/details', requireRole('ADMIN'), mechanicsController.getMechanicDetails);
router.put('/:id/details', requireRole('ADMIN'), mechanicsController.updateMechanicDetails);

// Get a mechanic by ID
router.get('/:id', mechanicsController.getMechanicById);

// Create a new mechanic
router.post('/', requireRole('ADMIN'), upload.single('photo'), mechanicsController.createMechanic);

// Update a mechanic by ID
router.put('/:id', requireRole('ADMIN'), upload.single('photo'), mechanicsController.updateMechanic);

// Delete a mechanic by ID
router.delete('/:id', requireRole('ADMIN'), mechanicsController.deleteMechanic);

module.exports = router;