const express = require('express');
const router = express.Router();
const vehiclesController = require('../controllers/vehicles.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// Get vehicles due for service (MUST be before /:id route)
router.get('/due-service', vehiclesController.getDueForService);

// Get all vehicles
router.get('/', vehiclesController.getAllVehicles);

// Get a vehicle by ID
router.get('/:id', vehiclesController.getVehicleById);

// Create a new vehicle
router.post('/', vehiclesController.createVehicle);

// Update a vehicle by ID
router.put('/:id', vehiclesController.updateVehicle);

// Delete a vehicle by ID
router.delete('/:id', vehiclesController.deleteVehicle);

// Mark vehicle as contacted for service reminder
router.post('/:id/mark-contacted', vehiclesController.markAsContacted);

// Reset reminder status
router.post('/:id/reset-reminder', vehiclesController.resetReminderStatus);

module.exports = router;