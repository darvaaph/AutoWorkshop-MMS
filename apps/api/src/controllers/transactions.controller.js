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

        // Validation: Check required fields
        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Transaction must have at least one item'
            });
        }

        // Validate vehicle if provided
        if (vehicle_id) {
            const vehicle = await Vehicle.findByPk(vehicle_id, { transaction: t });
            if (!vehicle) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Vehicle not found'
                });
            }
        }

        // Validate mechanic if provided
        if (mechanic_id) {
            const mechanic = await Mechanic.findOne({
                where: { id: mechanic_id, is_active: true },
                transaction: t
            });
            if (!mechanic) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Mechanic not found or inactive'
                });
            }
        }

        // ============================================
        // OPTIMIZATION: Bulk queries to avoid N+1 problem
        // ============================================

        // Collect all IDs by type for bulk queries
        const productIds = new Set();
        const serviceIds = new Set();
        const packageIds = new Set();

        for (const item of items) {
            if (item.item_type === ITEM_TYPE.PRODUCT && item.item_id) {
                productIds.add(item.item_id);
            } else if (item.item_type === ITEM_TYPE.SERVICE && item.item_id) {
                serviceIds.add(item.item_id);
            } else if (item.item_type === ITEM_TYPE.PACKAGE && item.item_id) {
                packageIds.add(item.item_id);
            }
        }

        // Bulk fetch all required data
        const [products, services, packages] = await Promise.all([
            productIds.size > 0 ? Product.findAll({
                where: { id: Array.from(productIds) },
                transaction: t,
                lock: t.LOCK.UPDATE
            }) : [],
            serviceIds.size > 0 ? Service.findAll({
                where: { id: Array.from(serviceIds) },
                transaction: t
            }) : [],
            packageIds.size > 0 ? Package.findAll({
                where: {
                    id: Array.from(packageIds),
                    is_active: true
                },
                include: [{
                    model: PackageItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: Service, as: 'service' }
                    ]
                }],
                transaction: t
            }) : []
        ]);

        // Create lookup maps for O(1) access
        const productMap = products.reduce((map, p) => { map[p.id] = p; return map; }, {});
        const serviceMap = services.reduce((map, s) => { map[s.id] = s; return map; }, {});
        const packageMap = packages.reduce((map, pkg) => { map[pkg.id] = pkg; return map; }, {});

        // Collect all package component product IDs for additional bulk query
        const packageProductIds = new Set();
        for (const pkg of packages) {
            for (const pkgItem of pkg.items) {
                if (pkgItem.product_id) {
                    packageProductIds.add(pkgItem.product_id);
                }
            }
        }

        // Bulk fetch package component products (if any new ones)
        const packageProducts = packageProductIds.size > 0 ?
            await Product.findAll({
                where: { id: Array.from(packageProductIds) },
                transaction: t,
                lock: t.LOCK.UPDATE
            }) : [];

        const packageProductMap = packageProducts.reduce((map, p) => { map[p.id] = p; return map; }, {});

        // ============================================
        // Process each item using cached data
        // ============================================

        // Process each item and determine prices
        const processedItems = [];
        const allComponentsToDeduct = [];
        let subtotal = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Validate item structure
            if (!item.item_type) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Item ${i + 1}: item_type is required`
                });
            }

            if (item.item_type !== ITEM_TYPE.EXTERNAL && !item.item_id) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Item ${i + 1}: item_id is required for type ${item.item_type}`
                });
            }

            const qty = item.qty || 1;
            let basePrice = 0;
            let sellPrice = 0;
            let costPrice = 0;
            let itemName = '';

            // Price determination logic using cached data
            if (item.item_type === ITEM_TYPE.PRODUCT) {
                const product = productMap[item.item_id];
                if (!product) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Product with ID ${item.item_id} not found`
                    });
                }
                if (product.stock < qty) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`
                    });
                }
                basePrice = parseFloat(product.price_sell); // Use database price, ignore frontend
                sellPrice = basePrice - parseFloat(item.discount_amount || 0);
                costPrice = parseFloat(product.price_buy);
                itemName = product.name;
                allComponentsToDeduct.push({
                    product_id: product.id,
                    product_name: product.name,
                    qty: qty,
                    current_stock: product.stock
                });
            } else if (item.item_type === ITEM_TYPE.SERVICE) {
                const service = serviceMap[item.item_id];
                if (!service) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Service with ID ${item.item_id} not found`
                    });
                }
                basePrice = item.custom_price ? parseFloat(item.custom_price) : parseFloat(service.price); // Use custom_price if provided
                sellPrice = basePrice - parseFloat(item.discount_amount || 0);
                costPrice = 0; // Services have no COGS
                itemName = service.name;
            } else if (item.item_type === ITEM_TYPE.PACKAGE) {
                const pkg = packageMap[item.item_id];
                if (!pkg) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Package with ID ${item.item_id} not found or inactive`
                    });
                }
                basePrice = parseFloat(pkg.price); // Use database price, ignore frontend
                sellPrice = basePrice - parseFloat(item.discount_amount || 0);
                itemName = pkg.name;
                let totalComponentCost = 0;
                for (const pkgItem of pkg.items) {
                    if (pkgItem.product_id) {
                        // Use cached package product data
                        const product = packageProductMap[pkgItem.product_id] || pkgItem.product;
                        if (!product || product.stock < (pkgItem.qty * qty)) {
                            await t.rollback();
                            return res.status(400).json({
                                success: false,
                                message: `Insufficient stock for package component "${product?.name || 'Unknown'}". Available: ${product?.stock || 0}, Required: ${pkgItem.qty * qty}`
                            });
                        }
                        totalComponentCost += parseFloat(product.price_buy) * pkgItem.qty;
                        allComponentsToDeduct.push({
                            product_id: product.id,
                            product_name: product.name,
                            qty: pkgItem.qty * qty,
                            current_stock: product.stock,
                            is_package_component: true,
                            package_name: pkg.name
                        });
                    }
                }
                costPrice = totalComponentCost * qty;
            } else if (item.item_type === ITEM_TYPE.EXTERNAL) {
                basePrice = parseFloat(item.base_price || 0);
                sellPrice = basePrice - parseFloat(item.discount_amount || 0);
                costPrice = parseFloat(item.cost_price || 0);
                itemName = item.item_name;
            } else {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Invalid item type: ${item.item_type}`
                });
            }

            processedItems.push({
                item_type: item.item_type,
                item_id: item.item_id || 0,
                item_name: itemName,
                qty: qty,
                base_price: basePrice,
                discount_amount: parseFloat(item.discount_amount || 0),
                sell_price: sellPrice,
                cost_price: costPrice
            });

            subtotal += sellPrice * qty;
        }

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

        // Deduct inventory for all product components (optimized - no additional queries)
        if (allComponentsToDeduct.length > 0) {
            // Group by product_id to avoid duplicate updates
            const productUpdates = new Map();

            for (const component of allComponentsToDeduct) {
                if (!productUpdates.has(component.product_id)) {
                    productUpdates.set(component.product_id, {
                        product_id: component.product_id,
                        product_name: component.product_name,
                        total_qty: 0,
                        current_stock: component.current_stock,
                        components: []
                    });
                }
                const update = productUpdates.get(component.product_id);
                update.total_qty += component.qty;
                update.components.push(component);
            }

            // Update stock and create inventory logs for each unique product
            for (const [productId, update] of productUpdates) {
                const stockBefore = update.current_stock;
                const stockAfter = stockBefore - update.total_qty;

                // Update product stock
                await Product.update(
                    { stock: stockAfter },
                    { where: { id: productId }, transaction: t }
                );

                // Create inventory log for each component (to maintain detailed tracking)
                for (const component of update.components) {
                    await InventoryLog.create({
                        product_id: component.product_id,
                        user_id: userId,
                        type: INVENTORY_TYPE.OUT,
                        qty: component.qty,
                        stock_before: stockBefore,
                        stock_after: stockAfter,
                        reference_type: INVENTORY_REFERENCE.TRANSACTION,
                        reference_id: `TRX-${transaction.id}`,
                        notes: component.is_package_component ? `Out via Package "${component.package_name}" - Transaction #${transaction.id}` : `Sale - Transaction #${transaction.id}`
                    }, { transaction: t });
                }
            }
        }

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
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Transaksi harus memiliki minimal satu item' });
        }
        if (items.length > MAX_ITEMS_PER_TRANSACTION) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Maksimal ${MAX_ITEMS_PER_TRANSACTION} item per transaksi` });
        }

        // ---- Load + lock transaction header (race-safe vs addPayment) ----
        const transaction = await Transaction.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
        }

        if (!EDITABLE_STATUSES.includes(transaction.status)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Transaksi berstatus ${transaction.status} tidak dapat diedit (hanya PENDING, UNPAID, atau PARTIAL).`
            });
        }

        const beforeStatus = transaction.status;
        const beforeTotal = parseFloat(transaction.total_amount);

        // ---- Load existing items + payments inside the lock ----
        const existingItems = await TransactionItem.findAll({ where: { transaction_id: id }, transaction: t });
        const payments = await Payment.findAll({ where: { transaction_id: id }, transaction: t });
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        const existingById = new Map(existingItems.map(it => [it.id, it]));

        // ---- Split incoming items into kept (has id) vs new ----
        const keptInputs = [];
        const newInputs = [];
        for (let i = 0; i < items.length; i++) {
            const raw = items[i];
            if (raw === null || typeof raw !== 'object') {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Item ke-${i + 1} tidak valid` });
            }
            if (raw.id !== undefined && raw.id !== null && raw.id !== '') {
                const parsedId = parseInt(raw.id, 10);
                if (!Number.isInteger(parsedId) || parsedId < 1) {
                    await t.rollback();
                    return res.status(400).json({ success: false, message: `Item ke-${i + 1}: id tidak valid` });
                }
                keptInputs.push({ index: i, id: parsedId, qty: raw.qty });
            } else {
                newInputs.push({ index: i, raw });
            }
        }

        // ---- Validate kept items belong to this transaction + qty ----
        const keptIds = new Set();
        for (const k of keptInputs) {
            const existing = existingById.get(k.id);
            if (!existing) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Item dengan id ${k.id} bukan milik transaksi ini` });
            }
            if (keptIds.has(k.id)) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Item dengan id ${k.id} terkirim ganda` });
            }
            keptIds.add(k.id);

            const qty = parseInt(k.qty, 10);
            if (!Number.isInteger(qty) || qty < 1) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Qty item "${existing.item_name}" harus bilangan bulat minimal 1` });
            }
            k.qtyParsed = qty;
            k.existing = existing;

            // PACKAGE is immutable: qty must stay the same
            if (existing.item_type === ITEM_TYPE.PACKAGE && qty !== existing.qty) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Qty paket "${existing.item_name}" tidak dapat diubah lewat edit. Batalkan transaksi bila perlu mengubah paket.` });
            }
        }

        // ---- PACKAGE immutability: every existing package must be kept ----
        for (const it of existingItems) {
            if (it.item_type === ITEM_TYPE.PACKAGE && !keptIds.has(it.id)) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Paket "${it.item_name}" tidak dapat dihapus lewat edit. Batalkan transaksi bila perlu.` });
            }
        }

        // ---- Process new items (fetch master prices; PACKAGE not allowed) ----
        const processedNew = [];
        for (const n of newInputs) {
            const raw = n.raw;
            const pos = n.index + 1;

            if (!raw.item_type) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Item ke-${pos}: item_type wajib diisi` });
            }
            if (raw.item_type === ITEM_TYPE.PACKAGE) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Menambah paket lewat edit belum didukung. Tambahkan produk/jasa satuan.' });
            }
            if (![ITEM_TYPE.PRODUCT, ITEM_TYPE.SERVICE, ITEM_TYPE.EXTERNAL].includes(raw.item_type)) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Item ke-${pos}: item_type tidak valid (${raw.item_type})` });
            }

            const qty = parseInt(raw.qty ?? 1, 10);
            if (!Number.isInteger(qty) || qty < 1) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Item ke-${pos}: qty harus bilangan bulat minimal 1` });
            }
            const discount = parseFloat(raw.discount_amount || 0);
            if (isNaN(discount) || discount < 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Item ke-${pos}: diskon tidak valid` });
            }

            processedNew.push({ pos, raw, qty, discount });
        }

        // ---- Bulk fetch + lock products (for new product items AND any product whose qty may change) ----
        const newProductIds = new Set();
        const newServiceIds = new Set();
        for (const p of processedNew) {
            if (p.raw.item_type === ITEM_TYPE.PRODUCT) {
                if (!p.raw.item_id) {
                    await t.rollback();
                    return res.status(400).json({ success: false, message: `Item ke-${p.pos}: item_id wajib untuk PRODUCT` });
                }
                newProductIds.add(p.raw.item_id);
            } else if (p.raw.item_type === ITEM_TYPE.SERVICE) {
                if (!p.raw.item_id) {
                    await t.rollback();
                    return res.status(400).json({ success: false, message: `Item ke-${p.pos}: item_id wajib untuk SERVICE` });
                }
                newServiceIds.add(p.raw.item_id);
            } else if (p.raw.item_type === ITEM_TYPE.EXTERNAL) {
                if (!p.raw.item_name || String(p.raw.item_name).trim() === '') {
                    await t.rollback();
                    return res.status(400).json({ success: false, message: `Item ke-${p.pos}: item_name wajib untuk EXTERNAL` });
                }
            }
        }

        // Existing standalone PRODUCT item ids (kept or removed) also need their stock rows
        const existingProductIds = new Set(
            existingItems.filter(it => it.item_type === ITEM_TYPE.PRODUCT && it.item_id).map(it => it.item_id)
        );
        const allProductIds = new Set([...existingProductIds, ...newProductIds]);

        const [productRows, serviceRows] = await Promise.all([
            allProductIds.size > 0
                ? Product.findAll({ where: { id: Array.from(allProductIds) }, transaction: t, lock: t.LOCK.UPDATE })
                : [],
            newServiceIds.size > 0
                ? Service.findAll({ where: { id: Array.from(newServiceIds) }, transaction: t })
                : [],
        ]);
        const productMap = productRows.reduce((m, p) => { m[p.id] = p; return m; }, {});
        const serviceMap = serviceRows.reduce((m, s) => { m[s.id] = s; return m; }, {});

        // ---- Build the final list of rows to persist + compute subtotal ----
        // Kept rows: keep stored price, only qty may change.
        // New rows: price derived from master data (PRODUCT/SERVICE) or payload (EXTERNAL).
        const newRowsToCreate = [];
        let subtotal = 0;

        for (const k of keptInputs) {
            subtotal += parseFloat(k.existing.sell_price) * k.qtyParsed;
        }

        for (const p of processedNew) {
            const { raw, qty, discount } = p;
            let basePrice = 0, sellPrice = 0, costPrice = 0, itemName = '';

            if (raw.item_type === ITEM_TYPE.PRODUCT) {
                const product = productMap[raw.item_id];
                if (!product) {
                    await t.rollback();
                    return res.status(400).json({ success: false, message: `Produk dengan id ${raw.item_id} tidak ditemukan` });
                }
                basePrice = parseFloat(product.price_sell);
                sellPrice = basePrice - discount;
                costPrice = parseFloat(product.price_buy);
                itemName = product.name;
            } else if (raw.item_type === ITEM_TYPE.SERVICE) {
                const service = serviceMap[raw.item_id];
                if (!service) {
                    await t.rollback();
                    return res.status(400).json({ success: false, message: `Jasa dengan id ${raw.item_id} tidak ditemukan` });
                }
                basePrice = raw.custom_price ? parseFloat(raw.custom_price) : parseFloat(service.price);
                sellPrice = basePrice - discount;
                costPrice = 0;
                itemName = service.name;
            } else { // EXTERNAL
                basePrice = parseFloat(raw.base_price || 0);
                sellPrice = basePrice - discount;
                costPrice = parseFloat(raw.cost_price || 0);
                itemName = String(raw.item_name).trim();
            }

            if (sellPrice < 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Item ke-${p.pos}: diskon melebihi harga` });
            }

            subtotal += sellPrice * qty;
            newRowsToCreate.push({
                transaction_id: transaction.id,
                item_type: raw.item_type,
                item_id: raw.item_id || 0,
                item_name: itemName,
                qty,
                base_price: basePrice,
                discount_amount: discount,
                sell_price: sellPrice,
                cost_price: costPrice,
            });
        }

        // ---- Discount + total ----
        let discountAmount;
        if (discount_amount !== undefined && discount_amount !== null && discount_amount !== '') {
            discountAmount = parseFloat(discount_amount);
            if (isNaN(discountAmount) || discountAmount < 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Diskon transaksi tidak valid' });
            }
        } else {
            discountAmount = parseFloat(transaction.discount_amount);
        }

        const totalAmount = subtotal - discountAmount;
        if (totalAmount < 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Diskon melebihi subtotal' });
        }

        // ---- Compute product stock delta (PRODUCT items only) ----
        const oldQtyByProduct = new Map();
        for (const it of existingItems) {
            if (it.item_type === ITEM_TYPE.PRODUCT && it.item_id) {
                oldQtyByProduct.set(it.item_id, (oldQtyByProduct.get(it.item_id) || 0) + it.qty);
            }
        }
        const newQtyByProduct = new Map();
        for (const k of keptInputs) {
            if (k.existing.item_type === ITEM_TYPE.PRODUCT && k.existing.item_id) {
                newQtyByProduct.set(k.existing.item_id, (newQtyByProduct.get(k.existing.item_id) || 0) + k.qtyParsed);
            }
        }
        for (const p of processedNew) {
            if (p.raw.item_type === ITEM_TYPE.PRODUCT) {
                newQtyByProduct.set(p.raw.item_id, (newQtyByProduct.get(p.raw.item_id) || 0) + p.qty);
            }
        }

        // Validate stock availability for net increases BEFORE any write
        const stockChanges = [];
        const productIdsUnion = new Set([...oldQtyByProduct.keys(), ...newQtyByProduct.keys()]);
        for (const pid of productIdsUnion) {
            const net = (newQtyByProduct.get(pid) || 0) - (oldQtyByProduct.get(pid) || 0);
            if (net === 0) continue;
            const product = productMap[pid];
            if (!product) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Produk id ${pid} tidak ditemukan untuk penyesuaian stok` });
            }
            if (net > 0 && product.stock < net) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Stok "${product.name}" tidak cukup. Tersedia: ${product.stock}, tambahan dibutuhkan: ${net}`
                });
            }
            stockChanges.push({ product, net });
        }

        // ================= WRITE PHASE (all validations passed) =================

        // 1) Apply stock deltas + inventory logs
        for (const { product, net } of stockChanges) {
            const stockBefore = product.stock;
            const stockAfter = stockBefore - net; // net>0 deducts, net<0 returns
            await Product.update({ stock: stockAfter }, { where: { id: product.id }, transaction: t });
            await InventoryLog.create({
                product_id: product.id,
                user_id: userId,
                type: net > 0 ? INVENTORY_TYPE.OUT : INVENTORY_TYPE.IN,
                qty: Math.abs(net),
                stock_before: stockBefore,
                stock_after: stockAfter,
                reference_type: net > 0 ? INVENTORY_REFERENCE.TRANSACTION : INVENTORY_REFERENCE.RETURN,
                reference_id: `TRX-${transaction.id}`,
                notes: net > 0
                    ? `Edit transaksi #${transaction.id} - tambah qty`
                    : `Edit transaksi #${transaction.id} - kurangi/hapus item`
            }, { transaction: t });
        }

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
        let newStatus;
        if (totalPaid <= 0) {
            newStatus = beforeStatus === TRANSACTION_STATUS.PENDING ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.UNPAID;
        } else if (totalPaid >= totalAmount) {
            newStatus = TRANSACTION_STATUS.PAID;
        } else {
            newStatus = TRANSACTION_STATUS.PARTIAL;
        }

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
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Mekanik tidak ditemukan atau tidak aktif' });
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