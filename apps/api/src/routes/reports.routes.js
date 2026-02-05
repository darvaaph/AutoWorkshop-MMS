const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// All report routes require authentication
router.use(verifyToken);

// Define routes for reports
router.get('/dashboard', reportsController.getDashboardReport);
router.get('/financial', reportsController.getFinancialReport);
router.get('/inventory', reportsController.getInventoryReport);
router.get('/sales', reportsController.getSalesReport);

module.exports = router;