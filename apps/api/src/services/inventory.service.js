// inventory.service.js is responsible for managing inventory-related logic, including stock management, inventory logs, and product/service adjustments.

const { Product, Service, InventoryLog } = require('../models'); // Import models
const { Op } = require('sequelize');

class InventoryService {
    // Method to add stock for a product
    async addStock(productId, quantity, referenceId, notes) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        product.stock += quantity;
        await product.save();

        // Log the inventory change
        await InventoryLog.create({
            productId,
            type: 'IN',
            qty: quantity,
            referenceId,
            notes,
            createdAt: new Date(),
        });

        return product;
    }

    // Method to remove stock for a product
    async removeStock(productId, quantity, referenceId, notes) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        if (product.stock < quantity) {
            throw new Error('Insufficient stock');
        }

        product.stock -= quantity;
        await product.save();

        // Log the inventory change
        await InventoryLog.create({
            productId,
            type: 'OUT',
            qty: quantity,
            referenceId,
            notes,
            createdAt: new Date(),
        });

        return product;
    }

    // Method to adjust stock for a product
    async adjustStock(productId, quantity, referenceId, notes) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        const adjustment = quantity - product.stock;
        product.stock = quantity;
        await product.save();

        // Log the inventory adjustment
        await InventoryLog.create({
            productId,
            type: 'ADJUSTMENT',
            qty: adjustment,
            referenceId,
            notes,
            createdAt: new Date(),
        });

        return product;
    }

    // Additional methods for inventory management can be added here
    
    // Get all inventory logs
    async getAllLogs() {
        return await InventoryLog.findAll({
            include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name'] }],
            order: [['created_at', 'DESC']]
        });
    }

    // Add new inventory log
    async addLog({ productId, type, qty, referenceId, notes }) {
        // Update product stock based on type
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        const stockBefore = product.stock;
        let stockAfter;

        if (type === 'IN') {
            stockAfter = stockBefore + qty;
        } else if (type === 'OUT') {
            if (stockBefore < qty) {
                throw new Error('Insufficient stock');
            }
            stockAfter = stockBefore - qty;
        } else if (type === 'ADJUSTMENT') {
            stockAfter = qty;
        }
        
        product.stock = stockAfter;
        await product.save();

        return await InventoryLog.create({
            product_id: productId,
            type,
            qty,
            stock_before: stockBefore,
            stock_after: stockAfter,
            reference_id: referenceId || null,
            notes,
            created_at: new Date()
        });
    }

    // Update inventory log
    async updateLog(id, { qty, notes }) {
        const log = await InventoryLog.findByPk(id);
        if (!log) return null;
        
        log.qty = qty;
        log.notes = notes;
        await log.save();
        return log;
    }

    // Delete inventory log
    async deleteLog(id) {
        const log = await InventoryLog.findByPk(id);
        if (!log) return null;
        
        await log.destroy();
        return true;
    }

    /**
     * Add Stock In dengan HPP Moving Average
     * Rumus: NewPrice = (CurrentStock × OldPrice + IncomingQty × IncomingPrice) / (CurrentStock + IncomingQty)
     * 
     * @param {number} product_id - Product ID
     * @param {number} qty - Jumlah barang masuk
     * @param {number} buy_price - Harga beli per unit (optional, jika tidak diberikan pakai harga lama)
     * @param {string} notes - Catatan
     * @param {number} user_id - User yang menambah stok
     */
    async addStockIn({ product_id, qty, buy_price, notes, user_id }) {
        const product = await Product.findByPk(product_id);
        if (!product) {
            throw new Error('Product not found');
        }

        const stockBefore = product.stock;
        const oldPrice = parseFloat(product.price_buy) || 0;
        const incomingPrice = buy_price !== undefined ? parseFloat(buy_price) : oldPrice;
        
        // Calculate new average price (Moving Average)
        let newPriceBuy = oldPrice;
        if (stockBefore + qty > 0) {
            newPriceBuy = ((stockBefore * oldPrice) + (qty * incomingPrice)) / (stockBefore + qty);
        }
        
        // Round to 2 decimal places
        newPriceBuy = Math.round(newPriceBuy * 100) / 100;

        const stockAfter = stockBefore + qty;

        // Update product stock and price_buy
        product.stock = stockAfter;
        product.price_buy = newPriceBuy;
        await product.save();

        // Create inventory log
        const log = await InventoryLog.create({
            product_id,
            type: 'IN',
            qty,
            stock_before: stockBefore,
            stock_after: stockAfter,
            reference_id: `STOCK-IN-${Date.now()}`,
            notes: notes || `Barang masuk @ Rp ${incomingPrice.toLocaleString('id-ID')}`,
            created_at: new Date()
        });

        return {
            log,
            product: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                stock_before: stockBefore,
                stock_after: stockAfter,
                old_price_buy: oldPrice,
                incoming_price: incomingPrice,
                new_price_buy: newPriceBuy
            }
        };
    }

    /**
     * Stock Audit / Stock Opname
     * Menyesuaikan stok sistem dengan stok fisik aktual
     * Tidak mempengaruhi perhitungan penjualan atau keuntungan
     * 
     * @param {number} userId - User yang melakukan audit
     * @param {number} productId - Product ID
     * @param {number} actualStock - Stok fisik aktual
     * @param {string} reason - Alasan penyesuaian
     * @param {string} notes - Catatan tambahan
     */
    async stockAudit(userId, productId, actualStock, reason, notes) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        const stockBefore = product.stock;
        const difference = actualStock - stockBefore;

        // Jika tidak ada perbedaan, tidak perlu adjustment
        if (difference === 0) {
            return {
                product_id: productId,
                product_name: product.name,
                sku: product.sku,
                stock_before: stockBefore,
                stock_after: actualStock,
                difference: 0,
                message: 'Stok sudah sesuai, tidak ada penyesuaian'
            };
        }

        // Update product stock
        product.stock = actualStock;
        await product.save();

        // Create inventory log dengan type ADJUSTMENT
        // reference_type ADJUSTMENT artinya ini adalah stock opname
        const log = await InventoryLog.create({
            product_id: productId,
            user_id: userId,
            type: 'ADJUSTMENT',
            qty: difference,
            stock_before: stockBefore,
            stock_after: actualStock,
            reference_type: 'ADJUSTMENT',
            reference_id: `AUDIT-${Date.now()}`,
            notes: `[STOCK AUDIT] ${reason || 'Stock Opname'}${notes ? ` - ${notes}` : ''}`,
            created_at: new Date()
        });

        return {
            log_id: log.id,
            product_id: productId,
            product_name: product.name,
            sku: product.sku,
            stock_before: stockBefore,
            stock_after: actualStock,
            difference: difference,
            adjustment_type: difference > 0 ? 'INCREASE' : 'DECREASE',
            reason: reason,
            notes: notes
        };
    }

    /**
     * Bulk Stock Audit - untuk audit banyak produk sekaligus
     * @param {number} userId - User yang melakukan audit
     * @param {Array} items - Array of { product_id, actual_stock, reason, notes }
     */
    async bulkStockAudit(userId, items) {
        const results = [];
        const errors = [];

        for (const item of items) {
            try {
                const result = await this.stockAudit(
                    userId,
                    item.product_id,
                    item.actual_stock,
                    item.reason || 'Bulk Stock Opname',
                    item.notes
                );
                results.push(result);
            } catch (error) {
                errors.push({
                    product_id: item.product_id,
                    error: error.message
                });
            }
        }

        return {
            success_count: results.length,
            error_count: errors.length,
            results,
            errors
        };
    }

    /**
     * Get Stock Audit History
     * Hanya menampilkan log dengan type ADJUSTMENT dan reference_type ADJUSTMENT
     */
    async getStockAuditHistory(options = {}) {
        const { product_id, date_from, date_to, limit = 50, page = 1 } = options;

        const where = {
            type: 'ADJUSTMENT',
            reference_type: 'ADJUSTMENT'
        };

        if (product_id) {
            where.product_id = product_id;
        }

        if (date_from || date_to) {
            where.created_at = {};
            if (date_from) {
                where.created_at[Op.gte] = new Date(date_from);
            }
            if (date_to) {
                const endDate = new Date(date_to);
                endDate.setHours(23, 59, 59, 999);
                where.created_at[Op.lte] = endDate;
            }
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: logs } = await InventoryLog.findAndCountAll({
            where,
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'sku', 'name', 'category', 'stock']
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        return {
            logs,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(count / parseInt(limit))
            }
        };
    }

    /**
     * Get Stock Discrepancy Report
     * Menampilkan semua adjustment dengan ringkasan
     */
    async getStockDiscrepancyReport(options = {}) {
        const { date_from, date_to } = options;

        const where = {
            type: 'ADJUSTMENT',
            reference_type: 'ADJUSTMENT'
        };

        if (date_from || date_to) {
            where.created_at = {};
            if (date_from) {
                where.created_at[Op.gte] = new Date(date_from);
            }
            if (date_to) {
                const endDate = new Date(date_to);
                endDate.setHours(23, 59, 59, 999);
                where.created_at[Op.lte] = endDate;
            }
        }

        const logs = await InventoryLog.findAll({
            where,
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'sku', 'name', 'category', 'price_buy']
            }],
            order: [['created_at', 'DESC']]
        });

        // Calculate summary
        let totalIncrease = 0;
        let totalDecrease = 0;
        let totalIncreaseValue = 0;
        let totalDecreaseValue = 0;

        const details = logs.map(log => {
            const qty = log.qty;
            const priceBuy = parseFloat(log.product?.price_buy || 0);
            const value = Math.abs(qty) * priceBuy;

            if (qty > 0) {
                totalIncrease += qty;
                totalIncreaseValue += value;
            } else {
                totalDecrease += Math.abs(qty);
                totalDecreaseValue += value;
            }

            return {
                id: log.id,
                product_id: log.product_id,
                product_sku: log.product?.sku,
                product_name: log.product?.name,
                category: log.product?.category,
                stock_before: log.stock_before,
                stock_after: log.stock_after,
                difference: qty,
                value_impact: qty > 0 ? value : -value,
                notes: log.notes,
                created_at: log.created_at
            };
        });

        return {
            summary: {
                total_adjustments: logs.length,
                total_increase_qty: totalIncrease,
                total_decrease_qty: totalDecrease,
                net_qty_change: totalIncrease - totalDecrease,
                total_increase_value: totalIncreaseValue,
                total_decrease_value: totalDecreaseValue,
                net_value_impact: totalIncreaseValue - totalDecreaseValue
            },
            details
        };
    }
}

module.exports = new InventoryService();