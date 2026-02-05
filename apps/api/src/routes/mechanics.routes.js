const express = require('express');
const router = express.Router();
const mechanicsController = require('../controllers/mechanics.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// Get all mechanics
router.get('/', mechanicsController.getAllMechanics);

// Get a mechanic by ID
router.get('/:id', mechanicsController.getMechanicById);

// Create a new mechanic
router.post('/', mechanicsController.createMechanic);

// Update a mechanic by ID
router.put('/:id', mechanicsController.updateMechanic);

// Delete a mechanic by ID
router.delete('/:id', mechanicsController.deleteMechanic);

module.exports = router;