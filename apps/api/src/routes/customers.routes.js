const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customers.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// Get all customers
router.get('/', customersController.getAllCustomers);

// Get a single customer by ID
router.get('/:id', customersController.getCustomerById);

// Create a new customer
router.post('/', customersController.createCustomer);

// Update an existing customer
router.put('/:id', customersController.updateCustomer);

// Delete a customer
router.delete('/:id', customersController.deleteCustomer);

module.exports = router;