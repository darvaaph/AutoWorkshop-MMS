const express = require('express');
const expensesController = require('../controllers/expenses.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validateExpense, handleValidationErrors } = require('../middleware/validation.middleware');

const router = express.Router();

// Get all expenses
router.get('/', verifyToken, expensesController.getAllExpenses);

// Get a single expense by ID
router.get('/:id', verifyToken, expensesController.getExpenseById);

// Create a new expense
router.post('/', verifyToken, requireRole('ADMIN'), validateExpense, handleValidationErrors, expensesController.createExpense);

// Update an existing expense
router.put('/:id', verifyToken, requireRole('ADMIN'), validateExpense, handleValidationErrors, expensesController.updateExpense);

// Delete an expense
router.delete('/:id', verifyToken, requireRole('ADMIN'), expensesController.deleteExpense);

module.exports = router;