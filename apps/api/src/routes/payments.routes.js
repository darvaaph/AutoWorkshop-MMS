const express = require('express');
const paymentsController = require('../controllers/payments.controller');
const { validatePayment } = require('../middleware/validation.middleware');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// All payment routes require authentication
router.use(verifyToken);

// Create a new payment
router.post('/', validatePayment, paymentsController.createPayment);

// Get all payments
router.get('/', paymentsController.getPayments);

// Get a payment by ID
router.get('/:id', paymentsController.getPaymentById);

// Update a payment by ID
router.put('/:id', validatePayment, paymentsController.updatePayment);

// Delete a payment by ID
router.delete('/:id', paymentsController.deletePayment);

module.exports = router;