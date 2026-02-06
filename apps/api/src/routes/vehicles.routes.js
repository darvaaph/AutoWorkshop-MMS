const express = require('express');
const router = express.Router();
const vehiclesController = require('../controllers/vehicles.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for vehicle image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/uploads/vehicles');
        // Ensure directory exists
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'vehicle-' + uniqueSuffix + path.extname(file.originalname));
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

// All routes require authentication
router.use(verifyToken);

// Get vehicles due for service (MUST be before /:id route)
router.get('/due-service', vehiclesController.getDueForService);

// Get all vehicles
router.get('/', vehiclesController.getAllVehicles);

// Get a vehicle by ID
router.get('/:id', vehiclesController.getVehicleById);

// Upload vehicle image (MUST be before /:id route)
router.post('/:id/upload-image', upload.single('image'), vehiclesController.uploadVehicleImage);

// Create a new vehicle
router.post('/', optionalUpload, vehiclesController.createVehicle);

// Update a vehicle by ID
router.put('/:id', optionalUpload, vehiclesController.updateVehicle);

// Delete a vehicle by ID
router.delete('/:id', vehiclesController.deleteVehicle);

// Mark vehicle as contacted for service reminder
router.post('/:id/mark-contacted', vehiclesController.markAsContacted);

// Reset reminder status
router.post('/:id/reset-reminder', vehiclesController.resetReminderStatus);

module.exports = router;