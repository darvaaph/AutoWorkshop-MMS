// transactions.controller.js - POS Transaction System (Jantung Aplikasi)
'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Transaction = require('../models/transaction.model');
const TransactionItem = require('../models/transaction-item.model');
const Payment = require('../models/payment.model');
const Product = require('../models/product.model');
const Service = require('../models/service.model');
const Package = require('../models/package.model');
const PackageItem = require('../models/package-item.model');
const Vehicle = require('../models/vehicle.model');
const Customer = require('../models/customer.model');
const Mechanic = require('../models/mechanic.model');
const User = require('../models/user.model');
const InventoryLog = require('../models/inventory-log.model');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/async-handler');
const AppError = require('../utils/app-error');
const transactionService = require('../services/transaction.service');
const {
    TRANSACTION_STATUS,
    EDITABLE_STATUSES,
    ITEM_TYPE,
    INVENTORY_TYPE,
    INVENTORY_REFERENCE,
    PAYMENT_METHOD,
    SERVICE_INTERVAL_MONTHS,
    SERVICE_INTERVAL_KM,
    MAX_ITEMS_PER_TRANSACTION,
} = require('../utils/constants');

// Sequelize error mapping + structured 5xx logging now live in the centralized
// error middleware; controllers just roll back their transaction and rethrow.

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate next service date and KM for vehicle
 * Called when transaction status becomes TRANSACTION_STATUS.PAID
 *
 * Formula (from spec.md Section 3.G):
 * - Time Based: NextDate = Transaction Date + 3 Months
 * - Usage Based: NextKM = current_km + 2,000 KM
 */
const calculateNextServiceReminder = async (vehicleId, currentKm, transactionDate, t) => {
    if (!vehicleId) return null;

    const vehicle = await Vehicle.findByPk(vehicleId, { transaction: t });
    if (!vehicle) return null;

    // Calculate next service date (default: 3 months from transaction)
    const nextServiceDate = new Date(transactionDate);
    nextServiceDate.setMonth(nextServiceDate.getMonth() + SERVICE_INTERVAL_MONTHS);

    // Calculate next service KM (default: +2,000 KM from current)
    const kmAtTransaction = currentKm || vehicle.current_km || 0;
    const nextServiceKm = kmAtTransaction + SERVICE_INTERVAL_KM;

    // Update vehicle with new service reminder
    await vehicle.update({
        current_km: kmAtTransaction,
        next_service_date: nextServiceDate.toISOString().split('T')[0],
        next_service_km: nextServiceKm
    }, { transaction: t });

    return {
        vehicle_id: vehicleId,
        next_service_date: nextServiceDate,
        next_service_km: nextServiceKm
    };
};

/**
 * Restore stock when transaction is cancelled
 */
const restoreInventory = async (transactionId, userId, t) => {
    // Get all inventory logs for this transaction
    const logs = await InventoryLog.findAll({
        where: {
            reference_id: `TRX-${transactionId}`,
            reference_type: INVENTORY_REFERENCE.TRANSACTION,
            type: INVENTORY_TYPE.OUT
        },
        transaction: t
    });

    for (const log of logs) {
        const product = await Product.findByPk(log.product_id, {
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (product) {
            const stockBefore = product.stock;
            const stockAfter = stockBefore + log.qty;

            await product.update({ stock: stockAfter }, { transaction: t });

            // Create return log
            await InventoryLog.create({
                product_id: log.product_id,
                user_id: userId,
                type: INVENTORY_TYPE.IN,
                qty: log.qty,
                stock_before: stockBefore,
                stock_after: stockAfter,
                reference_type: INVENTORY_REFERENCE.RETURN,
                reference_id: `TRX-${transactionId}`,
                notes: `Stock returned - Transaction #${transactionId} cancelled`
            }, { transaction: t });
        }
    }
};

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Create new transaction (ATOMIC)
 * POST /api/transactions
 */
exports.createTransaction = asyncHandler(async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const {
            vehicle_id,
            mechanic_id,
            current_km,
            discount_amount = 0,
            notes,
            items,
            initial_payment,
            save_as_pending
        } = req.body;

        // "Bon sementara / rawat inap": open bill that stays editable.
        // Accept JSON boolean true or form-encoded "true".
        const isPending = save_as_pending === true || save_as_pending === 'true';

        const userId = req.user.id;

        // Validation: required items + optional vehicle/mechanic references.
        if (!items || items.length === 0) {
            throw new AppError(400, 'Transaction must have at least one item');
        }
        await transactionService.assertVehicleAndMechanic(vehicle_id, mechanic_id, t);

        // Bulk-fetch the catalog (avoids N+1) with product rows locked for the txn.
        const maps = await transactionService.fetchItemCatalog(items, t);

        // Validate + price every line item against the catalog.
        const { processedItems, allComponentsToDeduct, subtotal } =
            transactionService.priceItems(items, maps);

        // Calculate totals
        const totalAmount = subtotal - parseFloat(discount_amount);

        // Determine initial status.
        // Base status is PENDING for an open "bon sementara", otherwise UNPAID.
        // A payment still upgrades it to PARTIAL/PAID (bill remains editable while PARTIAL).
        let initialStatus = isPending ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.UNPAID;
        let paidAmount = 0;
        if (initial_payment && initial_payment.amount > 0) {
            // Cap recorded payment at the bill total. Cash overpayment is "change given",
            // not revenue — storing the full tendered amount would inflate financial reports.
            paidAmount = Math.min(parseFloat(initial_payment.amount), totalAmount);
            if (paidAmount >= totalAmount) {
                initialStatus = TRANSACTION_STATUS.PAID;
            } else if (paidAmount > 0) {
                initialStatus = TRANSACTION_STATUS.PARTIAL;
            }
        }

        // Create transaction header
        const transaction = await Transaction.create({
            user_id: userId,
            vehicle_id: vehicle_id || null,
            mechanic_id: mechanic_id || null,
            date: new Date(),
            status: initialStatus,
            subtotal: subtotal,
            discount_amount: parseFloat(discount_amount),
            total_amount: totalAmount,
            current_km: current_km || null,
            notes: notes || null
        }, { transaction: t });

        // Create transaction items
        const transactionItems = processedItems.map(item => ({
            transaction_id: transaction.id,
            ...item
        }));
        await TransactionItem.bulkCreate(transactionItems, { transaction: t });

        // Deduct inventory for all product components.
        await transactionService.deductInventory(allComponentsToDeduct, {
            userId,
            transactionId: transaction.id,
            t,
        });

        // Create initial payment if provided (paidAmount is already capped at total)
        if (paidAmount > 0) {
            await Payment.create({
                transaction_id: transaction.id,
                user_id: userId,
                amount: paidAmount,
                payment_method: initial_payment.payment_method || PAYMENT_METHOD.CASH,
                reference_number: initial_payment.reference_number || null,
                date: new Date()
            }, { transaction: t });
        }

        // If PAID, calculate service reminder
        let serviceReminder = null;
        if (initialStatus === TRANSACTION_STATUS.PAID && vehicle_id) {
            serviceReminder = await calculateNextServiceReminder(vehicle_id, current_km, new Date(), t);
        }

        // Commit transaction
        await t.commit();

        // Fetch complete transaction with relations
        const completeTransaction = await Transaction.findByPk(transaction.id, {
            include: [
                { model: TransactionItem, as: 'items' },
                { model: Payment, as: 'payments' },
                { model: Vehicle, as: 'vehicle', include: [{ model: Customer, as: 'customer' }] },
                { model: Mechanic, as: 'mechanic' },
                { model: User, as: 'user', attributes: ['id', 'username', 'full_name'] }
            ]
        });

        // Audit log for transaction creation
        await auditService.logCreate(userId, 'transactions', transaction.id, {
            vehicle_id,
            mechanic_id,
            total_amount: totalAmount,
            status: initialStatus,
            items_count: items.length
        }, req);

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            data: {
                transaction: completeTransaction,
                service_reminder: serviceReminder,
                summary: {
                    subtotal: subtotal,
                    discount: parseFloat(discount_amount),
                    total: totalAmount,
                    paid: paidAmount,
                    remaining: Math.max(0, totalAmount - paidAmount),
                    status: initialStatus,
                    estimated_profit: totalAmount - processedItems.reduce((sum, item) => sum + item.cost_price * item.qty, 0)
                }
            }
        });

    } catch (error) {
        // Roll back the open transaction, then delegate response shaping to the
        // centralized error handler (Sequelize mapping + 5xx logging live there).
        if (t && !t.finished) {
            try { await t.rollback(); } catch (rb) { console.error('Rollback error (createTransaction):', rb); }
        }
        throw error;
    }
});

/**
 * Update items of an open transaction ("bon sementara / rawat inap").
 * Editable only when status is PENDING / UNPAID / PARTIAL.
 *
 * Item contract:
 *   - Existing item kept/changed -> send { id, qty }  (price is preserved from DB row)
 *   - New item                   -> send { item_type, item_id?, qty, item_name?, base_price?, custom_price?, discount_amount?, cost_price? }
 *   - Existing item omitted       -> removed (stock returned)
 *
 * Stock is adjusted with TRUE DELTA per product (net = newQty - oldQty); only a
 * non-zero net produces one stock update + one InventoryLog. PACKAGE items are
 * immutable here (cannot add/remove/change) to avoid component-reversal drift.
 *
 * PUT /api/transactions/:id
 */
exports.updateTransaction = asyncHandler(async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { items, discount_amount, notes, mechanic_id, current_km } = req.body;

        // ---- Basic payload validation ----
        if (!Array.isArray(items) || items.length === 0) {
            throw new AppError(400, 'Transaksi harus memiliki minimal satu item');
        }
        if (items.length > MAX_ITEMS_PER_TRANSACTION) {
            throw new AppError(400, `Maksimal ${MAX_ITEMS_PER_TRANSACTION} item per transaksi`);
        }

        // ---- Load + lock transaction header (race-safe vs addPayment) ----
        const transaction = await Transaction.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!transaction) {
            throw new AppError(404, 'Transaksi tidak ditemukan');
        }
        if (!EDITABLE_STATUSES.includes(transaction.status)) {
            throw new AppError(400, `Transaksi berstatus ${transaction.status} tidak dapat diedit (hanya PENDING, UNPAID, atau PARTIAL).`);
        }

        const beforeStatus = transaction.status;
        const beforeTotal = parseFloat(transaction.total_amount);

        // ---- Load existing items + payments inside the lock ----
        const existingItems = await TransactionItem.findAll({ where: { transaction_id: id }, transaction: t });
        const payments = await Payment.findAll({ where: { transaction_id: id }, transaction: t });
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Parse + validate the edit payload (kept vs new, qty, PACKAGE immutability).
        const { keptInputs, processedNew, keptIds } =
            transactionService.parseEditItems(items, existingItems);

        // Fetch + lock catalog rows (new items + any product whose qty may change).
        const { productMap, serviceMap } =
            await transactionService.fetchEditCatalog(existingItems, processedNew, t);

        // Build rows to persist + subtotal (kept rows keep their stored price).
        const { newRowsToCreate, subtotal } =
            transactionService.buildEditedRows(keptInputs, processedNew, productMap, serviceMap, transaction.id);

        // ---- Discount + total ----
        let discountAmount;
        if (discount_amount !== undefined && discount_amount !== null && discount_amount !== '') {
            discountAmount = parseFloat(discount_amount);
            if (isNaN(discountAmount) || discountAmount < 0) {
                throw new AppError(400, 'Diskon transaksi tidak valid');
            }
        } else {
            discountAmount = parseFloat(transaction.discount_amount);
        }

        const totalAmount = subtotal - discountAmount;
        if (totalAmount < 0) {
            throw new AppError(400, 'Diskon melebihi subtotal');
        }

        // True per-product stock delta, validated for availability before any write.
        const stockChanges =
            transactionService.computeEditStockDeltas(existingItems, keptInputs, processedNew, productMap);

        // ================= WRITE PHASE (all validations passed) =================

        // 1) Apply stock deltas + inventory logs
        await transactionService.applyEditStockDeltas(stockChanges, { userId, transactionId: transaction.id, t });

        // 2) Remove items no longer present
        for (const it of existingItems) {
            if (!keptIds.has(it.id)) {
                await it.destroy({ transaction: t });
            }
        }

        // 3) Update kept items whose qty changed
        for (const k of keptInputs) {
            if (k.qtyParsed !== k.existing.qty) {
                await k.existing.update({ qty: k.qtyParsed }, { transaction: t });
            }
        }

        // 4) Insert new items
        if (newRowsToCreate.length > 0) {
            await TransactionItem.bulkCreate(newRowsToCreate, { transaction: t });
        }

        // 5) Recompute status against existing payments (edit never adds a payment)
        const newStatus = transactionService.deriveEditedStatus(totalPaid, totalAmount, beforeStatus);

        // 6) Update header (only set optional fields when provided)
        const headerUpdate = {
            subtotal,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            status: newStatus,
        };
        if (notes !== undefined) headerUpdate.notes = notes || null;
        if (current_km !== undefined && current_km !== null && current_km !== '') {
            headerUpdate.current_km = parseInt(current_km, 10) || null;
        }
        if (mechanic_id !== undefined && mechanic_id !== null && mechanic_id !== '') {
            const mechanic = await Mechanic.findOne({ where: { id: mechanic_id, is_active: true }, transaction: t });
            if (!mechanic) {
                throw new AppError(400, 'Mekanik tidak ditemukan atau tidak aktif');
            }
            headerUpdate.mechanic_id = mechanic_id;
        }
        await transaction.update(headerUpdate, { transaction: t });

        await t.commit();

        // ---- Audit (after commit; failure must not roll back the real change) ----
        try {
            await auditService.logUpdate(userId, 'transactions', transaction.id,
                { status: beforeStatus, total_amount: beforeTotal, item_count: existingItems.length },
                { status: newStatus, total_amount: totalAmount, item_count: keptIds.size + newRowsToCreate.length },
                req
            );
        } catch (auditError) {
            console.warn('Audit logging failed (updateTransaction):', auditError.message);
        }

        // ---- Re-fetch complete transaction for response ----
        const complete = await Transaction.findByPk(transaction.id, {
            include: [
                { model: TransactionItem, as: 'items' },
                { model: Payment, as: 'payments' },
                { model: Vehicle, as: 'vehicle', include: [{ model: Customer, as: 'customer' }] },
                { model: Mechanic, as: 'mechanic' },
                { model: User, as: 'user', attributes: ['id', 'username', 'full_name'] }
            ]
        });

        const overpayment = Math.max(0, totalPaid - totalAmount);

        return res.status(200).json({
            success: true,
            message: 'Transaksi berhasil diperbarui',
            data: {
                transaction: complete,
                summary: {
                    subtotal,
                    discount: discountAmount,
                    total: totalAmount,
                    paid: totalPaid,
                    remaining: Math.max(0, totalAmount - totalPaid),
                    overpayment,
                    status: newStatus
                }
            }
        });

    } catch (error) {
        if (t && !t.finished) {
            try { await t.rollback(); } catch (rb) { console.error('Rollback error (updateTransaction):', rb); }
        }
        throw error;
    }
});

/**
 * Get transaction by ID with full details
 * GET /api/transactions/:id
 */
exports.getTransactionById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const transaction = await Transaction.findByPk(id, {
        include: [
            { model: TransactionItem, as: 'items' },
            { model: Payment, as: 'payments' },
            {
                model: Vehicle,
                as: 'vehicle',
                include: [{
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'phone', 'address']
                }]
            },
            { model: Mechanic, as: 'mechanic', attributes: ['id', 'name'] },
            { model: User, as: 'user', attributes: ['id', 'username', 'full_name'] }
        ]
    });

    if (!transaction) {
        return res.status(404).json({
            success: false,
            message: 'Transaction not found'
        });
    }

    // Calculate payment summary
    const totalPaid = transaction.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remaining = Math.max(0, parseFloat(transaction.total_amount) - totalPaid);

    // Calculate profit
    const totalCost = transaction.items.reduce((sum, item) => {
        return sum + (parseFloat(item.cost_price || 0) * item.qty);
    }, 0);
    const profit = parseFloat(transaction.total_amount) - totalCost;

    res.status(200).json({
        success: true,
        data: {
            transaction,
            payment_summary: {
                total_amount: parseFloat(transaction.total_amount),
                total_paid: totalPaid,
                remaining: remaining,
                is_fully_paid: remaining <= 0
            },
            profit_info: {
                revenue: parseFloat(transaction.total_amount),
                cost: totalCost,
                profit: profit,
                margin_percent: parseFloat(transaction.total_amount) > 0
                    ? ((profit / parseFloat(transaction.total_amount)) * 100).toFixed(2)
                    : 0
            }
        }
    });
});

/**
 * Get all transactions with filters
 * GET /api/transactions?status=PAID&date_from=2024-01-01&date_to=2024-12-31
 */
exports.getAllTransactions = asyncHandler(async (req, res) => {
    const {
        status,
        vehicle_id,
        mechanic_id,
        date_from,
        date_to,
        page = 1,
        limit = 20,
        sort_by = 'date',
        sort_order = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};

    if (status) {
        where.status = status;
    }

    if (vehicle_id) {
        where.vehicle_id = vehicle_id;
    }

    if (mechanic_id) {
        where.mechanic_id = mechanic_id;
    }

    if (date_from || date_to) {
        where.date = {};
        if (date_from) {
            where.date[Op.gte] = new Date(date_from);
        }
        if (date_to) {
            const endDate = new Date(date_to);
            endDate.setHours(23, 59, 59, 999);
            where.date[Op.lte] = endDate;
        }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Whitelist sortable columns; an unknown sort_by would otherwise make Sequelize throw.
    const ALLOWED_SORT = ['date', 'total_amount', 'status', 'id', 'created_at'];
    const sortBy = ALLOWED_SORT.includes(sort_by) ? sort_by : 'date';
    const sortOrder = String(sort_order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: transactions } = await Transaction.findAndCountAll({
        where,
        include: [
            {
                model: Vehicle,
                as: 'vehicle',
                attributes: ['id', 'license_plate', 'brand', 'model'],
                include: [{
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'phone']
                }]
            },
            { model: Mechanic, as: 'mechanic', attributes: ['id', 'name'] },
            { model: Payment, as: 'payments', attributes: ['id', 'amount', 'payment_method', 'date'] }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset
    });

    // Add payment summary to each transaction
    const transactionsWithSummary = transactions.map(trx => {
        const data = trx.toJSON();
        const totalPaid = data.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        data.payment_summary = {
            total_paid: totalPaid,
            remaining: Math.max(0, parseFloat(data.total_amount) - totalPaid)
        };
        return data;
    });

    res.status(200).json({
        success: true,
        data: {
            transactions: transactionsWithSummary,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(count / parseInt(limit))
            }
        }
    });
});

/**
 * Add payment to transaction
 * POST /api/transactions/:id/pay
 */
exports.addPayment = asyncHandler(async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { amount, payment_method, reference_number } = req.body;
        const userId = req.user.id;

        // Validation
        if (!amount || amount <= 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be greater than 0'
            });
        }

        if (!payment_method) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Payment method is required'
            });
        }

        // Get transaction with lock
        const transaction = await Transaction.findByPk(id, {
            include: [{ model: Payment, as: 'payments' }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!transaction) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Check if transaction can accept payment
        if (transaction.status === TRANSACTION_STATUS.CANCELLED) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot add payment to cancelled transaction'
            });
        }

        if (transaction.status === TRANSACTION_STATUS.PAID) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Transaction is already fully paid'
            });
        }

        // Calculate current paid amount
        const currentPaid = transaction.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const remaining = parseFloat(transaction.total_amount) - currentPaid;

        if (remaining <= 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Transaction is already fully paid'
            });
        }

        // Cap recorded payment at the outstanding balance. Cash overpayment is
        // "change given", not revenue — storing the full tendered amount would inflate reports.
        const appliedAmount = Math.min(parseFloat(amount), remaining);

        // Create payment
        const payment = await Payment.create({
            transaction_id: transaction.id,
            user_id: userId,
            amount: appliedAmount,
            payment_method: payment_method,
            reference_number: reference_number || null,
            date: new Date()
        }, { transaction: t });

        // Calculate new totals
        const newTotalPaid = currentPaid + appliedAmount;
        const newRemaining = parseFloat(transaction.total_amount) - newTotalPaid;

        // Determine new status
        let newStatus = transaction.status;
        let statusChanged = false;

        if (newRemaining <= 0) {
            newStatus = TRANSACTION_STATUS.PAID;
            statusChanged = transaction.status !== TRANSACTION_STATUS.PAID;
        } else if (newTotalPaid > 0) {
            newStatus = TRANSACTION_STATUS.PARTIAL;
        }

        // Update transaction status if changed
        if (newStatus !== transaction.status) {
            await transaction.update({ status: newStatus }, { transaction: t });
        }

        // If status changed to PAID, calculate service reminder
        let serviceReminder = null;
        if (statusChanged && newStatus === TRANSACTION_STATUS.PAID && transaction.vehicle_id) {
            serviceReminder = await calculateNextServiceReminder(
                transaction.vehicle_id,
                transaction.current_km,
                transaction.date,
                t
            );
        }

        await t.commit();

        // Fetch updated transaction
        const updatedTransaction = await Transaction.findByPk(id, {
            include: [
                { model: TransactionItem, as: 'items' },
                { model: Payment, as: 'payments' },
                { model: Vehicle, as: 'vehicle' }
            ]
        });

        res.status(201).json({
            success: true,
            message: newStatus === TRANSACTION_STATUS.PAID
                ? 'Payment successful. Transaction is now fully paid.'
                : 'Payment added successfully',
            data: {
                payment,
                transaction: updatedTransaction,
                payment_summary: {
                    total_amount: parseFloat(transaction.total_amount),
                    total_paid: newTotalPaid,
                    remaining: Math.max(0, newRemaining),
                    status: newStatus
                },
                service_reminder: serviceReminder
            }
        });

    } catch (error) {
        if (t && !t.finished) {
            try { await t.rollback(); } catch (rb) { console.error('Rollback error (addPayment):', rb); }
        }
        throw error;
    }
});

/**
 * Cancel transaction
 * PUT /api/transactions/:id/cancel
 */
exports.cancelTransaction = asyncHandler(async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        const transaction = await Transaction.findByPk(id, {
            include: [{ model: Payment, as: 'payments' }],
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!transaction) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        if (transaction.status === TRANSACTION_STATUS.CANCELLED) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Transaction is already cancelled'
            });
        }

        // Check if transaction has payments
        const totalPaid = transaction.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        if (totalPaid > 0) {
            // Create refund payment (negative amount)
            await Payment.create({
                transaction_id: transaction.id,
                user_id: userId,
                amount: -totalPaid,
                payment_method: PAYMENT_METHOD.REFUND,
                reference_number: `REFUND-TRX-${transaction.id}`,
                date: new Date()
            }, { transaction: t });
        }

        // Restore inventory
        await restoreInventory(transaction.id, userId, t);

        // Roll back the vehicle service reminder if THIS paid transaction set one.
        // Recompute from the vehicle's latest remaining PAID transaction (reusing the
        // same reminder logic), or clear it when no prior paid service exists.
        if (transaction.status === TRANSACTION_STATUS.PAID && transaction.vehicle_id) {
            const lastPaid = await Transaction.findOne({
                where: {
                    vehicle_id: transaction.vehicle_id,
                    status: TRANSACTION_STATUS.PAID,
                    id: { [Op.ne]: transaction.id }
                },
                order: [['date', 'DESC']],
                transaction: t
            });
            if (lastPaid) {
                await calculateNextServiceReminder(transaction.vehicle_id, lastPaid.current_km, lastPaid.date, t);
            } else {
                await Vehicle.update(
                    { next_service_date: null, next_service_km: null },
                    { where: { id: transaction.vehicle_id }, transaction: t }
                );
            }
        }

        // Update transaction status
        await transaction.update({
            status: TRANSACTION_STATUS.CANCELLED,
            notes: transaction.notes
                ? `${transaction.notes}\n\n[CANCELLED] ${reason || 'No reason provided'}`
                : `[CANCELLED] ${reason || 'No reason provided'}`
        }, { transaction: t });

        await t.commit();

        const cancelledTransaction = await Transaction.findByPk(id, {
            include: [
                { model: TransactionItem, as: 'items' },
                { model: Payment, as: 'payments' }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Transaction cancelled successfully. Stock has been restored.',
            data: {
                transaction: cancelledTransaction,
                refunded_amount: totalPaid
            }
        });

    } catch (error) {
        if (t && !t.finished) {
            try { await t.rollback(); } catch (rb) { console.error('Rollback error (cancelTransaction):', rb); }
        }
        throw error;
    }
});

/**
 * Get transaction for printing
 * GET /api/transactions/:id/print?type=receipt|workorder
 */
exports.getTransactionForPrint = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type = 'receipt' } = req.query;

    const transaction = await Transaction.findByPk(id, {
        include: [
            { model: TransactionItem, as: 'items' },
            { model: Payment, as: 'payments' },
            { model: Vehicle, as: 'vehicle', include: [{ model: Customer, as: 'customer' }] },
            { model: Mechanic, as: 'mechanic' },
            { model: User, as: 'user', attributes: ['id', 'full_name'] }
        ]
    });

    if (!transaction) {
        return res.status(404).json({
            success: false,
            message: 'Transaction not found'
        });
    }

    // Format items based on print type
    let formattedItems = transaction.items.map(item => ({
        name: item.item_name,
        qty: item.qty,
        price: parseFloat(item.sell_price),
        subtotal: parseFloat(item.sell_price) * item.qty,
        type: item.item_type
    }));

    // For Work Order, explode packages to show components.
    if (type === 'workorder') {
        // Bulk-fetch every package referenced on this work order in a single query
        // (avoids an N+1 findByPk per PACKAGE line).
        const packageItemIds = [...new Set(
            transaction.items
                .filter(it => it.item_type === ITEM_TYPE.PACKAGE && it.item_id)
                .map(it => it.item_id)
        )];

        const packageMap = {};
        if (packageItemIds.length > 0) {
            const pkgs = await Package.findAll({
                where: { id: packageItemIds },
                include: [{
                    model: PackageItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: Service, as: 'service' }
                    ]
                }]
            });
            for (const pkg of pkgs) packageMap[pkg.id] = pkg;
        }

        const explodedItems = [];

        for (const item of transaction.items) {
            if (item.item_type === ITEM_TYPE.PACKAGE) {
                explodedItems.push({
                    name: `📦 ${item.item_name}`,
                    qty: item.qty,
                    price: parseFloat(item.sell_price),
                    subtotal: parseFloat(item.sell_price) * item.qty,
                    type: 'PACKAGE_HEADER',
                    is_header: true
                });

                const pkg = packageMap[item.item_id];

                if (pkg) {
                    for (const pkgItem of pkg.items) {
                        const componentName = pkgItem.product
                            ? pkgItem.product.name
                            : pkgItem.service?.name || 'Unknown';

                        explodedItems.push({
                            name: `   ↳ ${componentName}`,
                            qty: pkgItem.qty * item.qty,
                            price: null,
                            subtotal: null,
                            type: pkgItem.product ? ITEM_TYPE.PRODUCT : ITEM_TYPE.SERVICE,
                            is_component: true
                        });
                    }
                }
            } else {
                explodedItems.push({
                    name: item.item_name,
                    qty: item.qty,
                    price: parseFloat(item.sell_price),
                    subtotal: parseFloat(item.sell_price) * item.qty,
                    type: item.item_type
                });
            }
        }

        formattedItems = explodedItems;
    }

    const totalPaid = transaction.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.status(200).json({
        success: true,
        data: {
            print_type: type,
            transaction_id: transaction.id,
            date: transaction.date,
            status: transaction.status,
            cashier: transaction.user?.full_name,
            mechanic: transaction.mechanic?.name,
            customer: transaction.vehicle?.customer ? {
                name: transaction.vehicle.customer.name,
                phone: transaction.vehicle.customer.phone
            } : null,
            vehicle: transaction.vehicle ? {
                license_plate: transaction.vehicle.license_plate,
                brand: transaction.vehicle.brand,
                model: transaction.vehicle.model,
                current_km: transaction.current_km
            } : null,
            items: formattedItems,
            subtotal: parseFloat(transaction.subtotal),
            discount: parseFloat(transaction.discount_amount),
            total: parseFloat(transaction.total_amount),
            paid: totalPaid,
            remaining: Math.max(0, parseFloat(transaction.total_amount) - totalPaid),
            payments: transaction.payments.map(p => ({
                method: p.payment_method,
                amount: parseFloat(p.amount),
                date: p.date,
                reference: p.reference_number
            })),
            notes: transaction.notes
        }
    });
});