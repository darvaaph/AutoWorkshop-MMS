// packages.controller.js

const { Op } = require('sequelize');
const Package = require('../models/package.model');
const PackageItem = require('../models/package-item.model');
const Product = require('../models/product.model');
const Service = require('../models/service.model');
const { sequelize } = require('../config/database');
const auditService = require('../services/audit.service');

/**
 * Get all packages with items detail
 * GET /api/packages?search=paket&active_only=true
 */
exports.getAllPackages = async (req, res) => {
    try {
        const { search, active_only = 'true', page = 1, limit = 50 } = req.query;

        const where = {
            deleted_at: null
        };

        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }

        if (active_only === 'true') {
            where.is_active = true;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: packages } = await Package.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset,
            attributes: {
                exclude: ['deleted_at']
            },
            include: [
                {
                    model: PackageItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'sku', 'name', 'price_sell', 'price_buy', 'stock'],
                            required: false
                        },
                        {
                            model: Service,
                            as: 'service',
                            attributes: ['id', 'name', 'price'],
                            required: false
                        }
                    ]
                }
            ]
        });

        // Calculate package details (total component value, margin, stock availability)
        const packagesWithDetails = packages.map(pkg => {
            const packageData = pkg.toJSON();
            
            let totalComponentValue = 0;
            let totalComponentSellPrice = 0;
            let isAvailable = true;
            let unavailableReason = null;

            packageData.items.forEach(item => {
                if (item.product) {
                    // Product component
                    totalComponentValue += parseFloat(item.product.price_buy || 0) * item.qty;
                    totalComponentSellPrice += parseFloat(item.product.price_sell || 0) * item.qty;
                    
                    // Check stock availability
                    if (item.product.stock < item.qty) {
                        isAvailable = false;
                        unavailableReason = `Stok ${item.product.name} tidak cukup (butuh: ${item.qty}, tersedia: ${item.product.stock})`;
                    }
                } else if (item.service) {
                    // Service component (no stock, just price)
                    totalComponentSellPrice += parseFloat(item.service.price || 0) * item.qty;
                }
            });

            // Calculate margin
            const packagePrice = parseFloat(packageData.price);
            const margin = packagePrice - totalComponentValue;
            const marginPercent = totalComponentValue > 0 
                ? ((margin / totalComponentValue) * 100).toFixed(2) 
                : 0;

            // Savings for customer
            const savings = totalComponentSellPrice - packagePrice;
            const savingsPercent = totalComponentSellPrice > 0 
                ? ((savings / totalComponentSellPrice) * 100).toFixed(2) 
                : 0;

            return {
                ...packageData,
                calculated: {
                    component_cost: totalComponentValue,
                    component_retail_price: totalComponentSellPrice,
                    margin: margin,
                    margin_percent: parseFloat(marginPercent),
                    customer_savings: savings,
                    savings_percent: parseFloat(savingsPercent),
                    is_available: isAvailable,
                    unavailable_reason: unavailableReason,
                    low_margin_alert: parseFloat(marginPercent) < 10
                }
            };
        });

        res.status(200).json({
            success: true,
            data: {
                packages: packagesWithDetails,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total_pages: Math.ceil(count / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get packages error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving packages', 
            error: error.message 
        });
    }
};

/**
 * Get single package by ID with full details
 * GET /api/packages/:id
 */
exports.getPackageById = async (req, res) => {
    try {
        const { id } = req.params;

        const pkg = await Package.findOne({
            where: { id, deleted_at: null },
            attributes: { exclude: ['deleted_at'] },
            include: [
                {
                    model: PackageItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'sku', 'name', 'price_sell', 'price_buy', 'stock', 'category'],
                            required: false
                        },
                        {
                            model: Service,
                            as: 'service',
                            attributes: ['id', 'name', 'price'],
                            required: false
                        }
                    ]
                }
            ]
        });

        if (!pkg) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }

        // Calculate details
        const packageData = pkg.toJSON();
        let totalComponentValue = 0;
        let totalComponentSellPrice = 0;
        let isAvailable = true;
        const stockIssues = [];

        packageData.items.forEach(item => {
            if (item.product) {
                totalComponentValue += parseFloat(item.product.price_buy || 0) * item.qty;
                totalComponentSellPrice += parseFloat(item.product.price_sell || 0) * item.qty;
                
                if (item.product.stock < item.qty) {
                    isAvailable = false;
                    stockIssues.push({
                        product_id: item.product.id,
                        product_name: item.product.name,
                        required: item.qty,
                        available: item.product.stock,
                        shortage: item.qty - item.product.stock
                    });
                }
            } else if (item.service) {
                totalComponentSellPrice += parseFloat(item.service.price || 0) * item.qty;
            }
        });

        const packagePrice = parseFloat(packageData.price);
        const margin = packagePrice - totalComponentValue;
        const marginPercent = totalComponentValue > 0 
            ? ((margin / totalComponentValue) * 100).toFixed(2) 
            : 0;

        res.status(200).json({
            success: true,
            data: {
                ...packageData,
                calculated: {
                    component_cost: totalComponentValue,
                    component_retail_price: totalComponentSellPrice,
                    margin: margin,
                    margin_percent: parseFloat(marginPercent),
                    customer_savings: totalComponentSellPrice - packagePrice,
                    is_available: isAvailable,
                    stock_issues: stockIssues,
                    low_margin_alert: parseFloat(marginPercent) < 10
                }
            }
        });
    } catch (error) {
        console.error('Get package error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving package', 
            error: error.message 
        });
    }
};

/**
 * Create new package with items
 * POST /api/packages
 * Body: {
 *   name: "Paket Ganti Oli",
 *   price: 420000,
 *   description: "Paket hemat...",
 *   items: [
 *     { product_id: 1, qty: 1 },
 *     { service_id: 1, qty: 1 }
 *   ]
 * }
 */
exports.createPackage = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { name, price, description, is_active = true, items = [] } = req.body;

        // Validation
        if (!name || price === undefined) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Name and price are required'
            });
        }

        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Package must have at least one item'
            });
        }

        // Validate items exist
        for (const item of items) {
            if (!item.product_id && !item.service_id) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Each item must have either product_id or service_id'
                });
            }

            if (item.product_id) {
                const product = await Product.findOne({
                    where: { id: item.product_id, deleted_at: null }
                });
                if (!product) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Product with ID ${item.product_id} not found`
                    });
                }
            }

            if (item.service_id) {
                const service = await Service.findOne({
                    where: { id: item.service_id, deleted_at: null }
                });
                if (!service) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Service with ID ${item.service_id} not found`
                    });
                }
            }
        }

        // Create package
        const pkg = await Package.create({
            name,
            price,
            description,
            is_active
        }, { transaction: t });

        // Create package items in bulk
        const packageItems = items.map(item => ({
            package_id: pkg.id,
            product_id: item.product_id || null,
            service_id: item.service_id || null,
            qty: item.qty || 1
        }));

        await PackageItem.bulkCreate(packageItems, { transaction: t });

        await t.commit();

        // Audit log
        await auditService.logCreate(req.user?.id, 'packages', pkg.id, {
            name, price, items_count: items.length
        }, req);

        // Fetch complete package with items
        const completePackage = await Package.findByPk(pkg.id, {
            include: [
                {
                    model: PackageItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'price_sell'] },
                        { model: Service, as: 'service', attributes: ['id', 'name', 'price'] }
                    ]
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Package created successfully',
            data: completePackage
        });
    } catch (error) {
        await t.rollback();
        console.error('Create package error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating package', 
            error: error.message 
        });
    }
};

/**
 * Update package
 * PUT /api/packages/:id
 */
exports.updatePackage = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { name, price, description, is_active, items } = req.body;

        const pkg = await Package.findOne({
            where: { id, deleted_at: null }
        });

        if (!pkg) {
            await t.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }

        // Update package header
        await pkg.update({
            name: name || pkg.name,
            price: price !== undefined ? price : pkg.price,
            description: description !== undefined ? description : pkg.description,
            is_active: is_active !== undefined ? is_active : pkg.is_active
        }, { transaction: t });

        // If items provided, replace all items
        if (items && Array.isArray(items)) {
            // Validate items
            for (const item of items) {
                if (!item.product_id && !item.service_id) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Each item must have either product_id or service_id'
                    });
                }

                if (item.product_id) {
                    const product = await Product.findOne({
                        where: { id: item.product_id, deleted_at: null }
                    });
                    if (!product) {
                        await t.rollback();
                        return res.status(400).json({
                            success: false,
                            message: `Product with ID ${item.product_id} not found`
                        });
                    }
                }

                if (item.service_id) {
                    const service = await Service.findOne({
                        where: { id: item.service_id, deleted_at: null }
                    });
                    if (!service) {
                        await t.rollback();
                        return res.status(400).json({
                            success: false,
                            message: `Service with ID ${item.service_id} not found`
                        });
                    }
                }
            }

            // Delete existing items
            await PackageItem.destroy({
                where: { package_id: id },
                transaction: t
            });

            // Create new items
            const packageItems = items.map(item => ({
                package_id: pkg.id,
                product_id: item.product_id || null,
                service_id: item.service_id || null,
                qty: item.qty || 1
            }));

            await PackageItem.bulkCreate(packageItems, { transaction: t });
        }

        await t.commit();

        // Audit log
        await auditService.logUpdate(req.user?.id, 'packages', pkg.id, 
            { name: pkg.name, price: pkg.price },
            { name: name || pkg.name, price: price !== undefined ? price : pkg.price, items_updated: items ? true : false },
            req
        );

        // Fetch updated package
        const updatedPackage = await Package.findByPk(pkg.id, {
            include: [
                {
                    model: PackageItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'price_sell'] },
                        { model: Service, as: 'service', attributes: ['id', 'name', 'price'] }
                    ]
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Package updated successfully',
            data: updatedPackage
        });
    } catch (error) {
        await t.rollback();
        console.error('Update package error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating package', 
            error: error.message 
        });
    }
};

/**
 * Soft delete package
 * DELETE /api/packages/:id
 */
exports.deletePackage = async (req, res) => {
    try {
        const { id } = req.params;

        const pkg = await Package.findOne({
            where: { id, deleted_at: null }
        });

        if (!pkg) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }

        await pkg.destroy();

        // Audit log
        await auditService.logDelete(req.user?.id, 'packages', id, {
            name: pkg.name, price: pkg.price
        }, req);

        res.status(200).json({
            success: true,
            message: 'Package deleted successfully'
        });
    } catch (error) {
        console.error('Delete package error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting package', 
            error: error.message 
        });
    }
};

/**
 * Check package availability (stock validation)
 * GET /api/packages/:id/check-availability?qty=1
 */
exports.checkPackageAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { qty = 1 } = req.query;
        const requestedQty = parseInt(qty);

        const pkg = await Package.findOne({
            where: { id, deleted_at: null, is_active: true },
            include: [
                {
                    model: PackageItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'name', 'stock', 'deletedAt'],
                            paranoid: false
                        }
                    ]
                }
            ]
        });

        if (!pkg) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found or inactive' 
            });
        }

        let isAvailable = true;
        const stockDetails = [];

        for (const item of pkg.items) {
            if (item.product_id) {
                // This is a product item, check availability
                if (item.product) {
                    // Additional check: verify if product is actually deleted
                    const productCheck = await Product.findByPk(item.product.id, { paranoid: false });
                    const isDeleted = productCheck && productCheck.deletedAt !== null;
                    
                    if (isDeleted) {
                        // Product has been soft deleted
                        stockDetails.push({
                            product_id: item.product.id,
                            product_name: item.product.name,
                            status: 'DELETED',
                            message: 'Product has been removed from inventory'
                        });
                        isAvailable = false;
                    } else {
                        // Product is active, check stock
                        const requiredQty = item.qty * requestedQty;
                        const available = item.product.stock >= requiredQty;
                        
                        stockDetails.push({
                            product_id: item.product.id,
                            product_name: item.product.name,
                            required_per_package: item.qty,
                            total_required: requiredQty,
                            available_stock: item.product.stock,
                            is_sufficient: available
                        });

                        if (!available) {
                            isAvailable = false;
                        }
                    }
                } else {
                    // Product association is null, meaning product was deleted
                    stockDetails.push({
                        product_id: item.product_id,
                        product_name: 'Unknown Product',
                        status: 'DELETED',
                        message: 'Product has been removed from inventory'
                    });
                    isAvailable = false;
                }
            }
            // Skip service items (service_id is not null) - services don't have stock constraints
        }

        res.status(200).json({
            success: true,
            data: {
                package_id: pkg.id,
                package_name: pkg.name,
                requested_qty: requestedQty,
                is_available: isAvailable,
                stock_details: stockDetails
            }
        });
    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking package availability', 
            error: error.message 
        });
    }
};