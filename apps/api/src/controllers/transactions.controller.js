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

// ============================================
// ERROR HANDLING HELPERS
// ============================================

/**
 * Get detailed error message based on error type
 */
const getDetailedErrorMessage = (error) => {
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => `${err.path}: ${err.message}`);
        return `Validation Error: ${messages.join(', ')}`;
    }

    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
        return `Duplicate entry error: ${error.errors[0]?.message || 'Unique constraint violated'}`;
    }

    // Handle Sequelize foreign key constraint errors
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return `Foreign key constraint error: Invalid reference in ${error.table}`;
    }

    // Handle custom business logic errors
    if (error.message.includes('Insufficient stock')) {
        return error.message; // Already descriptive
    }

    if (error.message.includes('not found')) {
        return error.message; // Already descriptive
    }

    // Handle database connection errors
    if (error.name === 'SequelizeConnectionError') {
        return 'Database connection error. Please try again later.';
    }

    // Handle transaction rollback errors
    if (error.message.includes('rollback')) {
        return 'Transaction failed and was rolled back. Please check your data and try again.';
    }

    // Generic fallback
    return error.message || 'An unexpected error occurred while processing the transaction';
};

/**
 * Log error with context for debugging
 */
const logTransactionError = (error, context) => {
    console.error('=== TRANSACTION ERROR ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error Type:', error.name || 'Unknown');
    console.error('Error Message:', error.message);
    console.error('Context:', context);
    if (error.stack) {
        console.error('Stack Trace:', error.stack);
    }
    console.error('=== END ERROR ===');
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate next service date and KM for vehicle
 * Called when transaction status becomes 'PAID'
 * 
 * Formula (from spec.md Section 3.G):
 * - Time Based: NextDate = Transaction Date + 3 Months
 * - Usage Based: NextKM = current_km + 2,000 KM
 */
const calculateNextServiceReminder = async (vehicleId, currentKm, transactionDate, t) => {
    if (!vehicleId) return null;

    const vehicle = await Vehicle.findByPk(vehicleId, { transaction: t });
    if (!vehicle) return null;

    // Calculate next service date (3 months from transaction)
    const nextServiceDate = new Date(transactionDate);
    nextServiceDate.setMonth(nextServiceDate.getMonth() + 3);

    // Calculate next service KM (+2000 KM from current)
    const kmAtTransaction = currentKm || vehicle.current_km || 0;
    const nextServiceKm = kmAtTransaction + 2000;

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
 * Validate and get item details based on type
 * Returns item info with stock validation
 */
const getItemDetails = async (itemType, itemId, requestedQty, t) => {
    let itemData = null;
    let componentsToDeduct = []; // For package explosion

    switch (itemType) {
        case 'PRODUCT':
            const product = await Product.findOne({
                where: { id: itemId },
                transaction: t,
                lock: t.LOCK.UPDATE // Lock row for update
            });

            if (!product) {
                return { error: `Product with ID ${itemId} not found` };
            }

            // Check stock availability
            if (product.stock < requestedQty) {
                return { 
                    error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${requestedQty}` 
                };
            }

            itemData = {
                item_name: product.name,
                base_price: parseFloat(product.price_sell),
                cost_price: parseFloat(product.price_buy), // HPP for profit calculation
            };

            componentsToDeduct.push({
                product_id: product.id,
                product_name: product.name,
                qty: requestedQty,
                current_stock: product.stock
            });
            break;

        case 'SERVICE':
            const service = await Service.findByPk(itemId, { transaction: t });

            if (!service) {
                return { error: `Service with ID ${itemId} not found` };
            }

            itemData = {
                item_name: service.name,
                base_price: parseFloat(service.price),
                cost_price: 0, // Services have no COGS
            };
            // No stock deduction for services
            break;

        case 'PACKAGE':
            const pkg = await Package.findOne({
                where: { id: itemId, is_active: true },
                include: [{
                    model: PackageItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product' },
                        { model: Service, as: 'service' }
                    ]
                }],
                transaction: t
            });

            if (!pkg) {
                return { error: `Package with ID ${itemId} not found or inactive` };
            }

            // Validate stock for all product components in package
            let totalComponentCost = 0;
            for (const pkgItem of pkg.items) {
                if (pkgItem.product_id) {
                    // This is a product item, check if it's deleted and validate stock
                    const productCheck = await Product.findByPk(pkgItem.product_id, { 
                        paranoid: false
                    });
                    
                    if (!productCheck || productCheck.deletedAt !== null) {
                        // Product has been soft deleted - reject transaction
                        return { 
                            error: `Package "${pkg.name}" contains a deleted product and cannot be sold. Please contact administrator to update the package.` 
                        };
                    }

                    const requiredQty = pkgItem.qty * requestedQty;
                    
                    // Lock product for update using the product_id
                    const lockedProduct = await Product.findByPk(pkgItem.product_id, {
                        transaction: t,
                        lock: t.LOCK.UPDATE
                    });

                    if (lockedProduct.stock < requiredQty) {
                        return { 
                            error: `Insufficient stock for package component "${lockedProduct.name}". Available: ${lockedProduct.stock}, Required: ${requiredQty}` 
                        };
                    }

                    componentsToDeduct.push({
                        product_id: lockedProduct.id,
                        product_name: lockedProduct.name,
                        qty: requiredQty,
                        current_stock: lockedProduct.stock,
                        is_package_component: true,
                        package_name: pkg.name
                    });

                    totalComponentCost += parseFloat(lockedProduct.price_buy) * pkgItem.qty;
                }
                // Skip service items - they don't have stock constraints
            }

            itemData = {
                item_name: pkg.name,
                base_price: parseFloat(pkg.price),
                cost_price: totalComponentCost * requestedQty, // Dynamic COGS from components
            };
            break;

        case 'EXTERNAL':
            // External items (vendor services) - no stock, manual price
            itemData = {
                item_name: 'External Service', // Will be overwritten by request
                base_price: 0,
                cost_price: 0,
            };
            break;

        default:
            return { error: `Invalid item type: ${itemType}` };
    }

    return {
        itemData,
        componentsToDeduct
    };
};

/**
 * Deduct stock and create inventory logs
 */
const deductInventory = async (componentsToDeduct, transactionId, userId, t) => {
    for (const component of componentsToDeduct) {
        const product = await Product.findByPk(component.product_id, {
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        const stockBefore = product.stock;
        const stockAfter = stockBefore - component.qty;

        // Update product stock
        await product.update({ stock: stockAfter }, { transaction: t });

        // Create inventory log
        await InventoryLog.create({
            product_id: component.product_id,
            user_id: userId,
            type: 'OUT',
            qty: component.qty,
            stock_before: stockBefore,
            stock_after: stockAfter,
            reference_type: 'TRANSACTION',
            reference_id: `TRX-${transactionId}`,
            notes: component.is_package_component 
                ? `Out via Package "${component.package_name}" - Transaction #${transactionId}`
                : `Sale - Transaction #${transactionId}`
        }, { transaction: t });
    }
};

/**
 * Restore stock when transaction is cancelled
 */
const restoreInventory = async (transactionId, userId, t) => {
    // Get all inventory logs for this transaction
    const logs = await InventoryLog.findAll({
        where: {
            reference_id: `TRX-${transactionId}`,
            reference_type: 'TRANSACTION',
            type: 'OUT'
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
                type: 'IN',
                qty: log.qty,
                stock_before: stockBefore,
                stock_after: stockAfter,
                reference_type: 'RETURN',
                reference_id: `TRX-${transactionId}`,
                notes: `Stock returned - Transaction #${transactionId} cancelled`
            }, { transaction: t });
        }
    }
};

/**
 * Calculate transaction totals
 */
const calculateTotals = (items, globalDiscount = 0) => {
    let subtotal = 0;
    let totalCost = 0;

    for (const item of items) {
        const itemSubtotal = (parseFloat(item.base_price) - parseFloat(item.discount_amount || 0)) * item.qty;
        subtotal += itemSubtotal;
        totalCost += parseFloat(item.cost_price || 0) * item.qty;
    }

    const totalAmount = subtotal - globalDiscount;

    return {
        subtotal,
        total_amount: totalAmount,
        total_cost: totalCost,
        profit: totalAmount - totalCost
    };
};

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Create new transaction (ATOMIC)
 * POST /api/transactions
 */
exports.createTransaction = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const {
            vehicle_id,
            mechanic_id,
            current_km,
            discount_amount = 0,
            notes,
            items,
            initial_payment
        } = req.body;

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
            if (item.item_type === 'PRODUCT' && item.item_id) {
                productIds.add(item.item_id);
            } else if (item.item_type === 'SERVICE' && item.item_id) {
                serviceIds.add(item.item_id);
            } else if (item.item_type === 'PACKAGE' && item.item_id) {
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

            if (item.item_type !== 'EXTERNAL' && !item.item_id) {
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
            if (item.item_type === 'PRODUCT') {
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
            } else if (item.item_type === 'SERVICE') {
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
            } else if (item.item_type === 'PACKAGE') {
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
            } else if (item.item_type === 'EXTERNAL') {
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

        // Determine initial status
        let initialStatus = 'UNPAID';
        let paidAmount = 0;
        if (initial_payment && initial_payment.amount > 0) {
            paidAmount = parseFloat(initial_payment.amount);
            if (paidAmount >= totalAmount) {
                initialStatus = 'PAID';
            } else if (paidAmount > 0) {
                initialStatus = 'PARTIAL';
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
                        type: 'OUT',
                        qty: component.qty,
                        stock_before: stockBefore,
                        stock_after: stockAfter,
                        reference_type: 'TRANSACTION',
                        reference_id: `TRX-${transaction.id}`,
                        notes: component.is_package_component ? `Out via Package "${component.package_name}" - Transaction #${transaction.id}` : `Sale - Transaction #${transaction.id}`
                    }, { transaction: t });
                }
            }
        }

        // Create initial payment if provided
        if (initial_payment && initial_payment.amount > 0) {
            await Payment.create({
                transaction_id: transaction.id,
                user_id: userId,
                amount: paidAmount,
                payment_method: initial_payment.payment_method || 'CASH',
                reference_number: initial_payment.reference_number || null,
                date: new Date()
            }, { transaction: t });
        }

        // If PAID, calculate service reminder
        let serviceReminder = null;
        if (initialStatus === 'PAID' && vehicle_id) {
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
        // Ensure transaction is rolled back
        if (t && !t.finished) {
            try {
                await t.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }

        // Log detailed error for debugging
        logTransactionError(error, {
            userId: req.user?.id,
            payload: req.body,
            transactionStep: 'create_transaction',
            itemCount: req.body?.items?.length || 0
        });

        // Return user-friendly error message
        const errorMessage = getDetailedErrorMessage(error);

        res.status(500).json({
            success: false,
            message: 'Failed to create transaction',
            error: errorMessage,
            code: error.name || 'TRANSACTION_ERROR'
        });
    }
};

/**
 * Get transaction by ID with full details
 * GET /api/transactions/:id
 */
exports.getTransactionById = async (req, res) => {
    try {
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

    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transaction',
            error: error.message
        });
    }
};

/**
 * Get all transactions with filters
 * GET /api/transactions?status=PAID&date_from=2024-01-01&date_to=2024-12-31
 */
exports.getAllTransactions = async (req, res) => {
    try {
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
            order: [[sort_by, sort_order.toUpperCase()]],
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

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transactions',
            error: error.message
        });
    }
};

/**
 * Add payment to transaction
 * POST /api/transactions/:id/pay
 */
exports.addPayment = async (req, res) => {
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
        if (transaction.status === 'CANCELLED') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Cannot add payment to cancelled transaction'
            });
        }

        if (transaction.status === 'PAID') {
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

        // Create payment
        const payment = await Payment.create({
            transaction_id: transaction.id,
            user_id: userId,
            amount: parseFloat(amount),
            payment_method: payment_method,
            reference_number: reference_number || null,
            date: new Date()
        }, { transaction: t });

        // Calculate new totals
        const newTotalPaid = currentPaid + parseFloat(amount);
        const newRemaining = parseFloat(transaction.total_amount) - newTotalPaid;

        // Determine new status
        let newStatus = transaction.status;
        let statusChanged = false;

        if (newRemaining <= 0) {
            newStatus = 'PAID';
            statusChanged = transaction.status !== 'PAID';
        } else if (newTotalPaid > 0) {
            newStatus = 'PARTIAL';
        }

        // Update transaction status if changed
        if (newStatus !== transaction.status) {
            await transaction.update({ status: newStatus }, { transaction: t });
        }

        // If status changed to PAID, calculate service reminder
        let serviceReminder = null;
        if (statusChanged && newStatus === 'PAID' && transaction.vehicle_id) {
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
            message: newStatus === 'PAID' 
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
        await t.rollback();
        console.error('Add payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding payment',
            error: error.message
        });
    }
};

/**
 * Cancel transaction
 * PUT /api/transactions/:id/cancel
 */
exports.cancelTransaction = async (req, res) => {
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

        if (transaction.status === 'CANCELLED') {
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
                payment_method: 'REFUND',
                reference_number: `REFUND-TRX-${transaction.id}`,
                date: new Date()
            }, { transaction: t });
        }

        // Restore inventory
        await restoreInventory(transaction.id, userId, t);

        // Update transaction status
        await transaction.update({
            status: 'CANCELLED',
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
        await t.rollback();
        console.error('Cancel transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling transaction',
            error: error.message
        });
    }
};

/**
 * Get transaction for printing
 * GET /api/transactions/:id/print?type=receipt|workorder
 */
exports.getTransactionForPrint = async (req, res) => {
    try {
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

        // For Work Order, explode packages to show components
        if (type === 'workorder') {
            const explodedItems = [];
            
            for (const item of transaction.items) {
                if (item.item_type === 'PACKAGE') {
                    explodedItems.push({
                        name: `📦 ${item.item_name}`,
                        qty: item.qty,
                        price: parseFloat(item.sell_price),
                        subtotal: parseFloat(item.sell_price) * item.qty,
                        type: 'PACKAGE_HEADER',
                        is_header: true
                    });

                    const pkg = await Package.findByPk(item.item_id, {
                        include: [{
                            model: PackageItem,
                            as: 'items',
                            include: [
                                { model: Product, as: 'product' },
                                { model: Service, as: 'service' }
                            ]
                        }]
                    });

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
                                type: pkgItem.product ? 'PRODUCT' : 'SERVICE',
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

    } catch (error) {
        console.error('Get print data error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating print data',
            error: error.message
        });
    }
};