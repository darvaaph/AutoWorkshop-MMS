// customers.controller.js

const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const Customer = require('../models/customer.model');
const auditService = require('../services/audit.service');

// Get all customers
exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll({
            attributes: ['id', 'name', 'phone', 'address', 'photo_url', 'createdAt', 'updatedAt']
        });
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving customers', error });
    }
};

// Get a single customer by ID
exports.getCustomerById = async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await Customer.findByPk(id, {
            attributes: ['id', 'name', 'phone', 'address', 'photo_url', 'createdAt', 'updatedAt']
        });
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.status(200).json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving customer', error });
    }
};

// Create a new customer
exports.createCustomer = async (req, res) => {
    const { name, phone, address } = req.body;
    try {
        // Check for duplicate phone number (excluding soft deleted customers)
        const [existingCustomers] = await sequelize.query(
            'SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL',
            { replacements: [phone] }
        );

        if (existingCustomers.length > 0) {
            return res.status(400).json({
                message: 'Customer with this phone number already exists'
            });
        }

        // Handle photo upload if provided
        let photoUrl = null;
        if (req.file) {
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

            // Generate photo URL
            photoUrl = `/uploads/customers/${req.file.filename}`;
        }

        const newCustomer = await Customer.create({ name, phone, address, photo_url: photoUrl });
        
        // Audit log (optional)
        try {
            await auditService.logCreate(req.user?.id, 'customers', newCustomer.id, {
                name, phone, address, photo_url: photoUrl
            }, req);
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }
        
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ message: 'Error creating customer', error });
    }
};

// Update an existing customer
exports.updateCustomer = async (req, res) => {
    const { id } = req.params;
    const { name, phone, address } = req.body;
    try {
        const customer = await Customer.findByPk(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Handle photo upload if provided
        let finalPhotoUrl = undefined;
        if (req.file) {
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

            // Generate photo URL
            finalPhotoUrl = `/uploads/customers/${req.file.filename}`;
        }

        // Check for duplicate phone number (excluding soft deleted customers and current customer)
        if (phone && phone !== customer.phone) {
            const [existingCustomers] = await sequelize.query(
                'SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL AND id != ?',
                { replacements: [phone, id] }
            );

            if (existingCustomers.length > 0) {
                return res.status(400).json({
                    message: 'Customer with this phone number already exists'
                });
            }
        }
        
        const oldValues = { name: customer.name, phone: customer.phone, address: customer.address, photo_url: customer.photo_url };
        
        // Only update fields that are provided
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        if (finalPhotoUrl !== undefined) updateData.photo_url = finalPhotoUrl;
        
        // Delete old photo file if new photo is uploaded
        if (req.file && customer.photo_url && customer.photo_url.startsWith('/uploads/')) {
            const oldPhotoPath = path.join(__dirname, '../../public', customer.photo_url);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }
        
        await customer.update(updateData);
        
        // Audit log (optional)
        try {
            await auditService.logUpdate(req.user?.id, 'customers', customer.id, oldValues, {
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                photo_url: customer.photo_url
            }, req);
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }
        
        res.status(200).json(customer);
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating customer', 
            error: error.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Delete a customer
exports.deleteCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await Customer.findByPk(id);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        const oldValues = { name: customer.name, phone: customer.phone, address: customer.address };
        
        // Soft delete all vehicles associated with this customer
        const Vehicle = require('../models/vehicle.model');
        await Vehicle.destroy({
            where: { customer_id: id }
        });
        
        // Soft delete the customer
        await customer.destroy();
        
        // Audit log (optional)
        try {
            await auditService.logDelete(req.user?.id, 'customers', id, oldValues, req);
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }
        
        res.status(200).json({ message: 'Customer and associated vehicles deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting customer', error });
    }
};

/**
 * Upload customer photo
 * POST /api/customers/:id/upload-photo
 */
exports.uploadCustomerPhoto = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No photo file provided'
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

        const customer = await Customer.findByPk(id);

        if (!customer) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Delete old photo file if exists
        if (customer.photo_url && customer.photo_url.startsWith('/uploads/')) {
            const oldPhotoPath = path.join(__dirname, '../../public', customer.photo_url);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Generate photo URL
        const photoUrl = `/uploads/customers/${req.file.filename}`;

        // Update customer with new photo URL
        const oldValues = { photo_url: customer.photo_url };
        await customer.update({ photo_url: photoUrl });

        // Audit log
        await auditService.logUpdate(req.user?.id, 'customers', customer.id, oldValues, {
            photo_url: photoUrl
        }, req);

        res.status(200).json({
            success: true,
            message: 'Customer photo uploaded successfully',
            data: {
                customer_id: customer.id,
                photo_url: photoUrl
            }
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Upload customer photo error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading customer photo',
            error: error.message
        });
    }
};