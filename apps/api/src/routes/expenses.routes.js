const express = require('express');
const expensesController = require('../controllers/expenses.controller');
const { authMiddleware, roleMiddleware } = require('../middleware');

const router = express.Router();

// Get all expenses
router.get('/', authMiddleware, expensesController.getAllExpenses);

// Get a single expense by ID
router.get('/:id', authMiddleware, expensesController.getExpenseById);

// Create a new expense
router.post('/', authMiddleware, roleMiddleware('ADMIN'), expensesController.createExpense);

// Update an existing expense
router.put('/:id', authMiddleware, roleMiddleware('ADMIN'), expensesController.updateExpense);

// Delete an expense
router.delete('/:id', authMiddleware, roleMiddleware('ADMIN'), expensesController.deleteExpense);

module.exports = router;