const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validateService } = require('../middleware/validation.middleware');

// Public routes
router.get('/', servicesController.getAllServices);
router.get('/:id', servicesController.getServiceById);

// Protected routes (Admin only)
router.post('/', verifyToken, requireRole('ADMIN'), validateService, servicesController.createService);
router.put('/:id', verifyToken, requireRole('ADMIN'), servicesController.updateService);
router.delete('/:id', verifyToken, requireRole('ADMIN'), servicesController.deleteService);

module.exports = router;