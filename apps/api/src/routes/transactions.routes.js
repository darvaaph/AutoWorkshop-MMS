const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactions.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validateTransaction, validatePayment, handleValidationErrors } = require('../middleware/validation.middleware');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/transactions
 * @desc    Create new transaction (POS)
 * @access  Private (ADMIN, CASHIER)
 */
router.post('/', validateTransaction, handleValidationErrors, transactionsController.createTransaction);

/**
 * @route   GET /api/transactions
 * @desc    Get all transactions with filters
 * @access  Private
 */
router.get('/', transactionsController.getAllTransactions);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get transaction by ID with full details
 * @access  Private
 */
router.get('/:id', transactionsController.getTransactionById);

/**
 * @route   GET /api/transactions/:id/print
 * @desc    Get transaction formatted for printing
 * @access  Private
 */
router.get('/:id/print', transactionsController.getTransactionForPrint);

/**
 * @route   POST /api/transactions/:id/pay
 * @desc    Add payment to transaction
 * @access  Private
 */
router.post('/:id/pay', validatePayment, transactionsController.addPayment);

/**
 * @route   PUT /api/transactions/:id/cancel
 * @desc    Cancel transaction and restore stock
 * @access  Private (ADMIN only)
 */
router.put('/:id/cancel', requireRole('ADMIN'), transactionsController.cancelTransaction);

module.exports = router;