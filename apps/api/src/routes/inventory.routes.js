const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// All routes require authentication
router.use(verifyToken);

// ============ STOCK IN (BARANG MASUK) ============
// Stock In dengan HPP Moving Average
router.post('/in', inventoryController.addInventoryIn);

// ============ STOCK AUDIT / STOCK OPNAME ============
// Stock Audit - Penyesuaian stok sesuai inventaris aktual
// Tidak mempengaruhi laporan penjualan/keuntungan
router.post('/stock-audit', inventoryController.stockAudit);

// Bulk Stock Audit - Audit banyak produk sekaligus
router.post('/stock-audit/bulk', inventoryController.bulkStockAudit);

// Stock Audit History
router.get('/stock-audit/history', inventoryController.getStockAuditHistory);

// Stock Discrepancy Report
router.get('/stock-audit/report', inventoryController.getStockDiscrepancyReport);

// ============ INVENTORY LOGS ============
// Get all inventory logs
router.get('/', inventoryController.getInventoryLogs);

// Create a new inventory log
router.post('/', inventoryController.addInventoryLog);

// Update an inventory log by ID
router.put('/:id', inventoryController.updateInventoryLog);

// Delete an inventory log by ID (soft delete)
router.delete('/:id', inventoryController.deleteInventoryLog);

module.exports = router;