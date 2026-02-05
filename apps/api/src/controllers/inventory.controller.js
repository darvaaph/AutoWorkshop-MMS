// inventory.controller.js

const inventoryService = require('../services/inventory.service');
const auditService = require('../services/audit.service');

// Get all inventory logs
exports.getInventoryLogs = async (req, res) => {
    try {
        const logs = await inventoryService.getAllLogs();
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving inventory logs', error: error.message });
    }
};

// Add new inventory log
exports.addInventoryLog = async (req, res) => {
    const { productId, type, qty, referenceId, notes } = req.body;

    try {
        const newLog = await inventoryService.addLog({ productId, type, qty, referenceId, notes });
        
        // Audit log
        await auditService.logCreate(req.user?.id, 'inventory_logs', newLog.id, {
            product_id: productId, type, qty, notes
        }, req);
        
        res.status(201).json({ success: true, message: 'Inventory log created', data: newLog });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding inventory log', error: error.message });
    }
};

// Update inventory log
exports.updateInventoryLog = async (req, res) => {
    const { id } = req.params;
    const { qty, notes } = req.body;

    try {
        const updatedLog = await inventoryService.updateLog(id, { qty, notes });
        if (!updatedLog) {
            return res.status(404).json({ success: false, message: 'Inventory log not found' });
        }
        
        // Audit log
        await auditService.logUpdate(req.user?.id, 'inventory_logs', id, {}, {
            qty, notes
        }, req);
        
        res.status(200).json({ success: true, message: 'Inventory log updated', data: updatedLog });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating inventory log', error: error.message });
    }
};

// Delete inventory log
exports.deleteInventoryLog = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedLog = await inventoryService.deleteLog(id);
        if (!deletedLog) {
            return res.status(404).json({ success: false, message: 'Inventory log not found' });
        }
        
        // Audit log
        await auditService.logDelete(req.user?.id, 'inventory_logs', id, {}, req);
        
        res.status(200).json({ success: true, message: 'Inventory log deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting inventory log', error: error.message });
    }
};

/**
 * Stock In (Barang Masuk) dengan HPP Moving Average
 * POST /api/inventory/in
 * Body: { product_id, qty, buy_price, notes }
 * 
 * Rumus Moving Average:
 * NewPrice = (CurrentStock × OldPrice + IncomingQty × IncomingPrice) / (CurrentStock + IncomingQty)
 */
exports.addInventoryIn = async (req, res) => {
    const { product_id, qty, buy_price, notes } = req.body;

    try {
        if (!product_id || !qty || qty <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'product_id and qty (positive) are required' 
            });
        }

        const result = await inventoryService.addStockIn({ 
            product_id, 
            qty, 
            buy_price, 
            notes,
            user_id: req.user?.id
        });
        
        // Audit log
        await auditService.logCreate(req.user?.id, 'inventory_logs', result.log.id, {
            product_id, qty, buy_price, notes, type: 'IN'
        }, req);
        
        res.status(201).json({ 
            success: true, 
            message: 'Stock added successfully with Moving Average calculation',
            data: result
        });
    } catch (error) {
        console.error('Error adding stock in:', error);
        res.status(500).json({ success: false, message: 'Error adding stock', error: error.message });
    }
};

/**
 * Stock Audit / Stock Opname
 * POST /api/inventory/stock-audit
 * Body: { product_id, actual_stock, reason, notes }
 * 
 * Penyesuaian stok ini TIDAK mempengaruhi:
 * - Laporan penjualan (sales report)
 * - Laporan keuntungan (profit calculation)
 * - Laporan keuangan (financial report)
 * 
 * Hanya mempengaruhi stok fisik di sistem
 */
exports.stockAudit = async (req, res) => {
    const { product_id, actual_stock, reason, notes } = req.body;

    try {
        if (!product_id || actual_stock === undefined) {
            return res.status(400).json({
                success: false,
                message: 'product_id dan actual_stock wajib diisi'
            });
        }

        if (actual_stock < 0) {
            return res.status(400).json({
                success: false,
                message: 'actual_stock tidak boleh negatif'
            });
        }

        const result = await inventoryService.stockAudit(
            req.user.id,
            product_id,
            actual_stock,
            reason,
            notes
        );

        // Audit log
        if (result.log_id) {
            await auditService.logCreate(req.user.id, 'inventory_logs', result.log_id, {
                product_id,
                stock_before: result.stock_before,
                stock_after: result.stock_after,
                difference: result.difference,
                reason,
                action: 'STOCK_AUDIT'
            }, req);
        }

        res.status(200).json({
            success: true,
            message: result.difference === 0 
                ? 'Stok sudah sesuai, tidak ada penyesuaian'
                : `Stock audit berhasil. Selisih: ${result.difference > 0 ? '+' : ''}${result.difference}`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error performing stock audit',
            error: error.message
        });
    }
};

/**
 * Bulk Stock Audit
 * POST /api/inventory/stock-audit/bulk
 * Body: { items: [{ product_id, actual_stock, reason, notes }, ...] }
 */
exports.bulkStockAudit = async (req, res) => {
    const { items } = req.body;

    try {
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'items array wajib diisi dan tidak boleh kosong'
            });
        }

        const result = await inventoryService.bulkStockAudit(req.user.id, items);

        // Audit log for bulk operation
        await auditService.logCreate(req.user.id, 'inventory_logs', null, {
            action: 'BULK_STOCK_AUDIT',
            success_count: result.success_count,
            error_count: result.error_count
        }, req);

        res.status(200).json({
            success: true,
            message: `Bulk stock audit selesai. Berhasil: ${result.success_count}, Gagal: ${result.error_count}`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error performing bulk stock audit',
            error: error.message
        });
    }
};

/**
 * Get Stock Audit History
 * GET /api/inventory/stock-audit/history?product_id=1&date_from=2026-01-01&date_to=2026-12-31
 */
exports.getStockAuditHistory = async (req, res) => {
    try {
        const { product_id, date_from, date_to, limit, page } = req.query;

        const result = await inventoryService.getStockAuditHistory({
            product_id,
            date_from,
            date_to,
            limit,
            page
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving stock audit history',
            error: error.message
        });
    }
};

/**
 * Get Stock Discrepancy Report
 * GET /api/inventory/stock-audit/report?date_from=2026-01-01&date_to=2026-12-31
 * 
 * Laporan ini menampilkan semua penyesuaian stok dengan ringkasan nilai
 * TIDAK termasuk dalam laporan penjualan atau keuntungan
 */
exports.getStockDiscrepancyReport = async (req, res) => {
    try {
        const { date_from, date_to } = req.query;

        const result = await inventoryService.getStockDiscrepancyReport({
            date_from,
            date_to
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating stock discrepancy report',
            error: error.message
        });
    }
};