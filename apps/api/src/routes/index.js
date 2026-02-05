const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth.routes');
const productsRoutes = require('./products.routes');
const servicesRoutes = require('./services.routes');
const packagesRoutes = require('./packages.routes');
const mechanicsRoutes = require('./mechanics.routes');
const customersRoutes = require('./customers.routes');
const vehiclesRoutes = require('./vehicles.routes');
const transactionsRoutes = require('./transactions.routes');
const paymentsRoutes = require('./payments.routes');
const inventoryRoutes = require('./inventory.routes');
const expensesRoutes = require('./expenses.routes');
const reportsRoutes = require('./reports.routes');
const settingsRoutes = require('./settings.routes');
const auditLogsRoutes = require('./audit-logs.routes');

// API Info
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'AutoWorkshop MMS API v1.0',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            products: '/api/products',
            services: '/api/services',
            packages: '/api/packages',
            mechanics: '/api/mechanics',
            customers: '/api/customers',
            vehicles: '/api/vehicles',
            transactions: '/api/transactions',
            payments: '/api/payments',
            inventory: '/api/inventory',
            expenses: '/api/expenses',
            reports: '/api/reports',
            settings: '/api/settings',
            auditLogs: '/api/audit-logs'
        }
    });
});

// Use routes
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/services', servicesRoutes);
router.use('/packages', packagesRoutes);
router.use('/mechanics', mechanicsRoutes);
router.use('/customers', customersRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/expenses', expensesRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditLogsRoutes);

module.exports = router;