// inventory.controller.js

const inventoryService = require('../services/inventory.service');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/async-handler');
const { INVENTORY_TYPE } = require('../utils/constants');

// Get all inventory logs
exports.getInventoryLogs = asyncHandler(async (req, res) => {
    const logs = await inventoryService.getAllLogs();
    res.status(200).json({ success: true, data: logs });
});

// Add new inventory log
exports.addInventoryLog = asyncHandler(async (req, res) => {
    const { productId, type, qty, referenceId, notes } = req.body;

    const newLog = await inventoryService.addLog({ productId, type, qty, referenceId, notes });

    // Audit log
    await auditService.logCreate(req.user?.id, 'inventory_logs', newLog.id, {
        product_id: productId, type, qty, notes
    }, req);

    res.status(201).json({ success: true, message: 'Inventory log created', data: newLog });
});

// Update inventory log
exports.updateInventoryLog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { qty, notes } = req.body;

    const updatedLog = await inventoryService.updateLog(id, { qty, notes });
    if (!updatedLog) {
        return res.status(404).json({ success: false, message: 'Inventory log not found' });
    }

    // Audit log
    await auditService.logUpdate(req.user?.id, 'inventory_logs', id, {}, {
        qty, notes
    }, req);

    res.status(200).json({ success: true, message: 'Inventory log updated', data: updatedLog });
});

// Delete inventory log
exports.deleteInventoryLog = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deletedLog = await inventoryService.deleteLog(id);
    if (!deletedLog) {
        return res.status(404).json({ success: false, message: 'Inventory log not found' });
    }

    // Audit log
    await auditService.logDelete(req.user?.id, 'inventory_logs', id, {}, req);

    res.status(200).json({ success: true, message: 'Inventory log deleted' });
});

/**
 * Stock In (Barang Masuk) dengan HPP Moving Average
 * POST /api/inventory/in
 * Body: { product_id, qty, buy_price, notes }
 *
 * Rumus Moving Average:
 * NewPrice = (CurrentStock × OldPrice + IncomingQty × IncomingPrice) / (CurrentStock + IncomingQty)
 */
exports.addInventoryIn = asyncHandler(async (req, res) => {
    const { product_id, qty, buy_price, notes } = req.body;

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
        product_id, qty, buy_price, notes, type: INVENTORY_TYPE.IN
    }, req);

    res.status(201).json({
        success: true,
        message: 'Stock added successfully with Moving Average calculation',
        data: result
    });
});

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
exports.stockAudit = asyncHandler(async (req, res) => {
    const { product_id, actual_stock, reason, notes } = req.body;

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
});

/**
 * Bulk Stock Audit
 * POST /api/inventory/stock-audit/bulk
 * Body: { items: [{ product_id, actual_stock, reason, notes }, ...] }
 */
exports.bulkStockAudit = asyncHandler(async (req, res) => {
    const { items } = req.body;

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
});

/**
 * Get Stock Audit History
 * GET /api/inventory/stock-audit/history?product_id=1&date_from=2026-01-01&date_to=2026-12-31
 */
exports.getStockAuditHistory = asyncHandler(async (req, res) => {
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
});

/**
 * Get Stock Discrepancy Report
 * GET /api/inventory/stock-audit/report?date_from=2026-01-01&date_to=2026-12-31
 *
 * Laporan ini menampilkan semua penyesuaian stok dengan ringkasan nilai
 * TIDAK termasuk dalam laporan penjualan atau keuntungan
 */
exports.getStockDiscrepancyReport = asyncHandler(async (req, res) => {
    const { date_from, date_to } = req.query;

    const result = await inventoryService.getStockDiscrepancyReport({
        date_from,
        date_to
    });

    res.status(200).json({
        success: true,
        data: result
    });
});
