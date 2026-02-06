const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customers.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for customer photo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/uploads/customers');
        // Ensure directory exists
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'customer-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept empty files (when no photo is uploaded)
        cb(null, true);
    }
});

// Optional upload middleware - only processes if photo field exists
const optionalUpload = (req, res, next) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        return upload.single('photo')(req, res, next);
    }
    next();
};

// All routes require authentication
router.use(verifyToken);

// Get all customers
router.get('/', customersController.getAllCustomers);

// Get a single customer by ID
router.get('/:id', customersController.getCustomerById);

// Upload customer photo
router.post('/:id/upload-photo', upload.single('photo'), customersController.uploadCustomerPhoto);

// Create a new customer
router.post('/', optionalUpload, customersController.createCustomer);

// Update an existing customer
router.put('/:id', optionalUpload, customersController.updateCustomer);

// Delete a customer
router.delete('/:id', customersController.deleteCustomer);

module.exports = router;