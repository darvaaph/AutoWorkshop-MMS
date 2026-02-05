const express = require('express');
const router = express.Router();
const packagesController = require('../controllers/packages.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validatePackage } = require('../middleware/validation.middleware');

// Public routes
router.get('/', packagesController.getAllPackages);
router.get('/:id', packagesController.getPackageById);
router.get('/:id/check-availability', packagesController.checkPackageAvailability);

// Protected routes (Admin only)
router.post('/', verifyToken, requireRole('ADMIN'), validatePackage, packagesController.createPackage);
router.put('/:id', verifyToken, requireRole('ADMIN'), packagesController.updatePackage);
router.delete('/:id', verifyToken, requireRole('ADMIN'), packagesController.deletePackage);

module.exports = router;