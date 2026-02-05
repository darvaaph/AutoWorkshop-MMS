// customers.controller.js

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Customer = require('../models/customer.model');
const auditService = require('../services/audit.service');

// Get all customers
exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll();
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving customers', error });
    }
};

// Get a single customer by ID
exports.getCustomerById = async (req, res) => {
    const { id } = req.params;
    try {
        const customer = await Customer.findByPk(id);
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

        const newCustomer = await Customer.create({ name, phone, address });
        
        // Audit log (optional)
        try {
            await auditService.logCreate(req.user?.id, 'customers', newCustomer.id, {
                name, phone, address
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

        // Check for duplicate phone number (excluding soft deleted customers and current customer)
        if (phone !== customer.phone) {
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
        
        const oldValues = { name: customer.name, phone: customer.phone, address: customer.address };
        
        // Only update fields that are provided
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (address !== undefined) updateData.address = address;
        
        await customer.update(updateData);
        
        // Audit log (optional)
        try {
            await auditService.logUpdate(req.user?.id, 'customers', customer.id, oldValues, {
                name: customer.name, phone: customer.phone, address: customer.address
            }, req);
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }
        
        res.status(200).json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Error updating customer', error });
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