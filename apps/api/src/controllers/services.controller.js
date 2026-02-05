// services.controller.js

const { Op } = require('sequelize');
const Service = require('../models/service.model');
const auditService = require('../services/audit.service');

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

        const service = await Service.create({
            name,
            price
        });

        // Audit log
        await auditService.logCreate(req.user?.id, 'services', service.id, {
            name, price
        }, req);

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: service
        });
    } catch (error) {
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

        const service = await Service.findByPk(id);

        if (!service) {
            return res.status(404).json({ 
                success: false, 
                message: 'Service not found' 
            });
        }

        const oldValues = { name: service.name, price: service.price };

        await service.update({
            name: name || service.name,
            price: price !== undefined ? price : service.price
        });

        // Audit log
        await auditService.logUpdate(req.user?.id, 'services', service.id, oldValues, {
            name: service.name, price: service.price
        }, req);

        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
    } catch (error) {
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