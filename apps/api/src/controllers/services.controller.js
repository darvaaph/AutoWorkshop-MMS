// services.controller.js

const { Op } = require('sequelize');
const Service = require('../models/service.model');
const auditService = require('../services/audit.service');
const path = require('path');
const fs = require('fs');

/**
 * Get all services with search
 * GET /api/services?search=ganti oli&page=1&limit=50
 */
exports.getAllServices = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;

        const where = {};

        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows: services } = await Service.findAndCountAll({
            where,
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset,
            attributes: {
                exclude: ['deletedAt']
            }
        });

        res.status(200).json({
            success: true,
            data: {
                services,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total_pages: Math.ceil(count / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving services', 
            error: error.message 
        });
    }
};

/**
 * Get single service by ID
 * GET /api/services/:id
 */
exports.getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findByPk(id, {
            attributes: { exclude: ['deletedAt'] }
        });

        if (!service) {
            return res.status(404).json({ 
                success: false, 
                message: 'Service not found' 
            });
        }

        res.status(200).json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('Get service error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving service', 
            error: error.message 
        });
    }
};

/**
 * Upload service image
 * POST /api/services/:id/upload-image
 */
exports.uploadServiceImage = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Only JPEG, PNG, and GIF are allowed'
            });
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (req.file.size > maxSize) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 2MB'
            });
        }

        const service = await Service.findByPk(id);

        if (!service) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Delete old image file if exists
        if (service.image_url && service.image_url.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '../../public', service.image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Generate image URL
        const imageUrl = `/uploads/services/${req.file.filename}`;

        // Update service with new image URL
        const oldValues = { image_url: service.image_url };
        await service.update({ image_url: imageUrl });

        // Audit log
        await auditService.logUpdate(req.user?.id, 'services', service.id, oldValues, {
            image_url: imageUrl
        }, req);

        res.status(200).json({
            success: true,
            message: 'Service image uploaded successfully',
            data: {
                id: service.id,
                image_url: imageUrl
            }
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Upload service image error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading service image',
            error: error.message
        });
    }
};

/**
 * Create new service
 * POST /api/services
 */
exports.createService = async (req, res) => {
    try {
        const { name, price } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Name and price are required'
            });
        }

        // Handle image upload if provided
        let imageUrl = null;
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
            imageUrl = `/uploads/services/${req.file.filename}`;
        }

        const service = await Service.create({
            name,
            price,
            image_url: imageUrl
        });

        // Audit log
        await auditService.logCreate(req.user?.id, 'services', service.id, {
            name, price, image_url: imageUrl
        }, req);

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: service
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating service',
            error: error.message
        });
    }
};

/**
 * Update service
 * PUT /api/services/:id
 */
exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;

        // Handle image upload if provided
        let finalImageUrl = undefined;
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
            finalImageUrl = `/uploads/services/${req.file.filename}`;
        }

        const service = await Service.findByPk(id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        const oldValues = {
            name: service.name,
            price: service.price,
            image_url: service.image_url
        };

        // Delete old image file if new image is uploaded
        if (req.file && service.image_url && service.image_url.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '../../public', service.image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        await service.update({
            name: name || service.name,
            price: price !== undefined ? price : service.price,
            image_url: finalImageUrl !== undefined ? finalImageUrl : service.image_url
        });

        // Audit log
        await auditService.logUpdate(req.user?.id, 'services', service.id, oldValues, {
            name: service.name,
            price: service.price,
            image_url: service.image_url
        }, req);

        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Update service error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating service',
            error: error.message
        });
    }
};

/**
 * Soft delete service
 * DELETE /api/services/:id
 */
exports.deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findByPk(id);

        if (!service) {
            return res.status(404).json({ 
                success: false, 
                message: 'Service not found' 
            });
        }

        const oldValues = { name: service.name, price: service.price };

        await service.destroy(); // paranoid mode does soft delete

        // Audit log
        await auditService.logDelete(req.user?.id, 'services', id, oldValues, req);

        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting service', 
            error: error.message 
        });
    }
};