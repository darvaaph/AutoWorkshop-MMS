// products.controller.js

const { Op } = require('sequelize');
const Product = require('../models/product.model');
const Package = require('../models/package.model');
const PackageItem = require('../models/package-item.model');
const InventoryLog = require('../models/inventory-log.model');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/async-handler');
const { INVENTORY_TYPE, INVENTORY_REFERENCE } = require('../utils/constants');
const { sequelize } = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * Get all products with search & filter
 * GET /api/products?search=oli&category=Oli Mesin&page=1&limit=10
 */
exports.getAllProducts = asyncHandler(async (req, res) => {
    const {
        search,
        category,
        low_stock,
        page = 1,
        limit = 50,
        sort_by = 'name',
        sort_order = 'ASC'
    } = req.query;

    // Build where clause
    const where = {
        deleted_at: null
    };

    // Search by name or SKU
    if (search) {
        where[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { sku: { [Op.like]: `%${search}%` } }
        ];
    }

    // Filter by category
    if (category) {
        where.category = category;
    }

    // Filter low stock products
    if (low_stock === 'true') {
        where.stock = {
            [Op.lte]: sequelize.col('min_stock_alert')
        };
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Validate sort column
    const allowedSortColumns = ['name', 'sku', 'category', 'price_sell', 'stock', 'created_at'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'name';
    const sortDir = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const { count, rows: products } = await Product.findAndCountAll({
        where,
        order: [[sortColumn, sortDir]],
        limit: parseInt(limit),
        offset,
        attributes: {
            exclude: ['deleted_at']
        }
    });

    // Get distinct categories for filter dropdown
    const categories = await Product.findAll({
        where: { deleted_at: null },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
        raw: true
    });

    res.status(200).json({
        success: true,
        data: {
            products,
            categories: categories.map(c => c.category).filter(Boolean),
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
 * Get single product by ID
 * GET /api/products/:id
 */
exports.getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findOne({
        where: {
            id,
            deleted_at: null
        },
        attributes: {
            exclude: ['deleted_at']
        }
    });

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    res.status(200).json({
        success: true,
        data: product
    });
});

/**
 * Create new product
 * POST /api/products
 */
exports.createProduct = asyncHandler(async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const {
            sku,
            name,
            category,
            image_url,
            price_buy,
            price_sell,
            stock = 0,
            min_stock_alert = 5
        } = req.body;

        // Handle image upload if provided
        let finalImageUrl = image_url;
        if (req.file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(req.file.mimetype)) {
                fs.unlinkSync(req.file.path);
                await t.rollback();
                return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, and GIF are allowed' });
            }

            // Validate file size (max 2MB)
            const maxSize = 2 * 1024 * 1024; // 2MB
            if (req.file.size > maxSize) {
                fs.unlinkSync(req.file.path);
                await t.rollback();
                return res.status(400).json({ message: 'File too large. Maximum size is 2MB' });
            }

            // Generate image URL
            finalImageUrl = `/uploads/products/${req.file.filename}`;
        }

        // Validate required fields
        if (!sku || !name || !category || price_buy === undefined || price_sell === undefined) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'SKU, name, category, price_buy, and price_sell are required'
            });
        }

        // Check if SKU already exists
        const existingSku = await Product.findOne({
            where: { sku: sku.toUpperCase() }
        });

        if (existingSku) {
            await t.rollback();
            return res.status(409).json({
                success: false,
                message: 'SKU already exists'
            });
        }

        // Create product
        const product = await Product.create({
            sku: sku.toUpperCase(),
            name,
            category,
            image_url: finalImageUrl,
            price_buy,
            price_sell,
            stock,
            min_stock_alert
        }, { transaction: t });

        // If initial stock > 0, create inventory log
        if (stock > 0) {
            await InventoryLog.create({
                product_id: product.id,
                user_id: req.user?.id,
                type: INVENTORY_TYPE.IN,
                qty: stock,
                stock_before: 0,
                stock_after: stock,
                reference_type: INVENTORY_REFERENCE.PURCHASE,
                reference_id: `INIT-${product.id}`,
                notes: 'Initial stock saat produk dibuat'
            }, { transaction: t });
        }

        await t.commit();

        // Audit log for product creation
        await auditService.logCreate(req.user.id, 'products', product.id, {
            sku: product.sku,
            name: product.name,
            category: product.category,
            price_buy,
            price_sell,
            stock
        }, req);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        if (t && !t.finished) {
            try { await t.rollback(); } catch (rb) { console.error('Rollback error (createProduct):', rb); }
        }
        // Clean up the orphaned upload before delegating to the global handler.
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        throw error;
    }
});

/**
 * Update product
 * PUT /api/products/:id
 */
exports.updateProduct = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const {
            sku,
            name,
            category,
            image_url,
            price_buy,
            price_sell,
            min_stock_alert
        } = req.body;

        // Handle image upload if provided
        let finalImageUrl = image_url;
        if (req.file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(req.file.mimetype)) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, and GIF are allowed' });
            }

            // Validate file size (max 2MB)
            const maxSize = 2 * 1024 * 1024; // 2MB
            if (req.file.size > maxSize) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'File too large. Maximum size is 2MB' });
            }

            // Generate image URL
            finalImageUrl = `/uploads/products/${req.file.filename}`;
        }

        const product = await Product.findOne({
            where: { id, deleted_at: null }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check SKU uniqueness if changed
        if (sku && sku.toUpperCase() !== product.sku) {
            const existingSku = await Product.findOne({
                where: {
                    sku: sku.toUpperCase(),
                    id: { [Op.ne]: id }
                }
            });

            if (existingSku) {
                return res.status(409).json({
                    success: false,
                    message: 'SKU already exists'
                });
            }
        }

        // Store old values for audit
        const oldValues = {
            sku: product.sku,
            name: product.name,
            category: product.category,
            price_buy: product.price_buy,
            price_sell: product.price_sell
        };

        // Delete old image file if new image is uploaded
        if (req.file && product.image_url && product.image_url.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '../../public', product.image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update fields
        await product.update({
            sku: sku ? sku.toUpperCase() : product.sku,
            name: name || product.name,
            category: category || product.category,
            image_url: finalImageUrl !== undefined ? finalImageUrl : product.image_url,
            price_buy: price_buy !== undefined ? price_buy : product.price_buy,
            price_sell: price_sell !== undefined ? price_sell : product.price_sell,
            min_stock_alert: min_stock_alert !== undefined ? min_stock_alert : product.min_stock_alert
        });

        // Audit log for product update
        await auditService.logUpdate(req.user.id, 'products', product.id, oldValues, {
            sku: product.sku,
            name: product.name,
            category: product.category,
            price_buy: product.price_buy,
            price_sell: product.price_sell
        }, req);

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        // Clean up the orphaned upload before delegating to the global handler.
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        throw error;
    }
});

/**
 * Soft delete product
 * DELETE /api/products/:id
 */
exports.deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findOne({
        where: { id, deleted_at: null }
    });

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    const activePackageItems = await PackageItem.findAll({
        where: { product_id: id },
        attributes: ['id', 'package_id'],
        include: [
            {
                model: Package,
                as: 'package',
                required: true,
                attributes: ['id', 'name'],
                where: { is_active: true }
            }
        ]
    });

    if (activePackageItems.length > 0) {
        const impactedPackagesMap = new Map();
        activePackageItems.forEach(item => {
            if (item.package) {
                impactedPackagesMap.set(item.package.id, {
                    id: item.package.id,
                    name: item.package.name
                });
            }
        });

        const impactedPackages = Array.from(impactedPackagesMap.values());

        return res.status(409).json({
            success: false,
            message: 'Produk masih digunakan oleh paket aktif. Hapus dari paket/nonaktifkan paket terlebih dahulu.',
            data: {
                impacted_packages: impactedPackages
            }
        });
    }

    // Soft delete
    await product.destroy();

    // Audit log for product deletion
    await auditService.logDelete(req.user.id, 'products', product.id, {
        sku: product.sku,
        name: product.name,
        category: product.category
    }, req);

    res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
    });
});

/**
 * Get low stock products for alert
 * GET /api/products/low-stock
 */
exports.getLowStockProducts = asyncHandler(async (req, res) => {
    const products = await Product.findAll({
        where: {
            deleted_at: null,
            stock: {
                [Op.lte]: sequelize.col('min_stock_alert')
            }
        },
        order: [['stock', 'ASC']],
        attributes: ['id', 'sku', 'name', 'stock', 'min_stock_alert']
    });

    res.status(200).json({
        success: true,
        data: products,
        count: products.length
    });
});

// Upload product image
exports.uploadProductImage = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, and GIF are allowed' });
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (req.file.size > maxSize) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'File too large. Maximum size is 2MB' });
        }

        // Find product
        const product = await Product.findByPk(id);
        if (!product) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Product not found' });
        }

        // Generate image URL
        const imageUrl = `/uploads/products/${req.file.filename}`;

        // Delete old image file if exists
        if (product.image_url && product.image_url.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '../../public', product.image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Store old image URL for audit
        const oldImageUrl = product.image_url;

        // Update product with new image URL
        product.image_url = imageUrl;
        await product.save();

        // Log audit
        await auditService.logUpdate(
            req.user?.id || null,
            'products',
            id,
            { image_url: oldImageUrl },
            { image_url: imageUrl },
            req
        );

        return res.status(200).json({
            message: 'Product image uploaded successfully',
            image_url: imageUrl,
            product: product
        });
    } catch (error) {
        // Clean up the orphaned upload before delegating to the global handler.
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        throw error;
    }
});
