// vehicles.controller.js

const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const Vehicle = require('../models/vehicle.model');
const Customer = require('../models/customer.model');
const auditService = require('../services/audit.service');

// Get all vehicles
exports.getAllVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.findAll({
            attributes: ['id', 'customer_id', 'license_plate', 'brand', 'model', 'current_km', 'next_service_date', 'next_service_km', 'reminder_sent_at', 'reminder_sent_by', 'reminder_notes', 'image_url', 'createdAt', 'updatedAt']
        });
        res.status(200).json(vehicles);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving vehicles', error });
    }
};

// Get a vehicle by ID
exports.getVehicleById = async (req, res) => {
    const { id } = req.params;
    try {
        const vehicle = await Vehicle.findByPk(id, {
            attributes: ['id', 'customer_id', 'license_plate', 'brand', 'model', 'current_km', 'next_service_date', 'next_service_km', 'reminder_sent_at', 'reminder_sent_by', 'reminder_notes', 'image_url', 'createdAt', 'updatedAt']
        });
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        res.status(200).json(vehicle);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving vehicle', error });
    }
};

// Create a new vehicle
exports.createVehicle = async (req, res) => {
    const { customer_id, license_plate, brand, model, current_km } = req.body;
    try {
        // Handle image upload if provided
        let imageUrl = null;
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

            // Generate image URL
            imageUrl = `/uploads/vehicles/${req.file.filename}`;
        }

        const newVehicle = await Vehicle.create({ customer_id, license_plate, brand, model, current_km, image_url: imageUrl });
        
        // Audit log
        await auditService.logCreate(req.user?.id, 'vehicles', newVehicle.id, {
            customer_id, license_plate, brand, model, image_url: imageUrl
        }, req);
        
        res.status(201).json(newVehicle);
    } catch (error) {
        res.status(500).json({ message: 'Error creating vehicle', error });
    }
};

// Update a vehicle
exports.updateVehicle = async (req, res) => {
    const { id } = req.params;
    const { customer_id, license_plate, brand, model, current_km, next_service_date, next_service_km } = req.body;
    try {
        const vehicle = await Vehicle.findByPk(id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Handle image upload if provided
        let finalImageUrl = undefined;
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

            // Generate image URL
            finalImageUrl = `/uploads/vehicles/${req.file.filename}`;
        }
        
        const oldValues = { 
            customer_id: vehicle.customer_id,
            license_plate: vehicle.license_plate, 
            brand: vehicle.brand, 
            model: vehicle.model,
            current_km: vehicle.current_km,
            next_service_date: vehicle.next_service_date,
            next_service_km: vehicle.next_service_km,
            image_url: vehicle.image_url
        };
        
        // Only update fields that are provided
        const updateData = {};
        if (customer_id !== undefined) updateData.customer_id = customer_id;
        if (license_plate !== undefined) updateData.license_plate = license_plate;
        if (brand !== undefined) updateData.brand = brand;
        if (model !== undefined) updateData.model = model;
        if (current_km !== undefined) updateData.current_km = current_km;
        if (next_service_date !== undefined) updateData.next_service_date = next_service_date;
        if (next_service_km !== undefined) updateData.next_service_km = next_service_km;
        if (finalImageUrl !== undefined) updateData.image_url = finalImageUrl;
        
        // Delete old image file if new image is uploaded
        if (req.file && vehicle.image_url && vehicle.image_url.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '../../public', vehicle.image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        
        await vehicle.update(updateData);
        
        // Audit log (optional)
        try {
            await auditService.logUpdate(req.user?.id, 'vehicles', vehicle.id, oldValues, {
                customer_id: vehicle.customer_id,
                license_plate: vehicle.license_plate,
                brand: vehicle.brand,
                model: vehicle.model,
                current_km: vehicle.current_km,
                next_service_date: vehicle.next_service_date,
                next_service_km: vehicle.next_service_km,
                image_url: vehicle.image_url
            }, req);
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }
        
        res.status(200).json(vehicle);
    } catch (error) {
        res.status(500).json({ message: 'Error updating vehicle', error });
    }
};

// Delete a vehicle
exports.deleteVehicle = async (req, res) => {
    const { id } = req.params;
    try {
        const vehicle = await Vehicle.findByPk(id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        const oldValues = { license_plate: vehicle.license_plate, brand: vehicle.brand, model: vehicle.model };
        
        await vehicle.destroy();
        
        // Audit log
        await auditService.logDelete(req.user?.id, 'vehicles', id, oldValues, req);
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting vehicle', error });
    }
};

// Get vehicles due for service (within 7 days or overdue)
exports.getDueForService = async (req, res) => {
    try {
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);
        
        // Format dates for comparison
        const todayStr = today.toISOString().split('T')[0];
        const futureStr = sevenDaysFromNow.toISOString().split('T')[0];
        
        const vehicles = await Vehicle.findAll({
            where: {
                next_service_date: {
                    [Op.ne]: null,
                    [Op.lte]: futureStr  // Due within 7 days or already overdue
                }
            },
            include: [{
                model: Customer,
                as: 'customer',
                attributes: ['id', 'name', 'phone', 'address']
            }],
            order: [['next_service_date', 'ASC']]
        });
        
        // Add status to each vehicle
        const vehiclesWithStatus = vehicles.map(v => {
            const vehicle = v.toJSON();
            const dueDate = new Date(vehicle.next_service_date);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            vehicle.days_until_due = diffDays;
            vehicle.status = diffDays < 0 ? 'OVERDUE' : diffDays === 0 ? 'DUE_TODAY' : 'UPCOMING';
            vehicle.is_contacted = !!vehicle.reminder_sent_at;
            
            return vehicle;
        });
        
        res.json({
            success: true,
            data: vehiclesWithStatus,
            summary: {
                total: vehiclesWithStatus.length,
                overdue: vehiclesWithStatus.filter(v => v.status === 'OVERDUE').length,
                due_today: vehiclesWithStatus.filter(v => v.status === 'DUE_TODAY').length,
                upcoming: vehiclesWithStatus.filter(v => v.status === 'UPCOMING').length,
                contacted: vehiclesWithStatus.filter(v => v.is_contacted).length,
                not_contacted: vehiclesWithStatus.filter(v => !v.is_contacted).length
            }
        });
    } catch (error) {
        console.error('Error getting vehicles due for service:', error);
        res.status(500).json({ message: 'Error retrieving vehicles due for service', error: error.message });
    }
};

// Mark vehicle as contacted for service reminder
exports.markAsContacted = async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    
    try {
        const vehicle = await Vehicle.findByPk(id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        await vehicle.update({
            reminder_sent_at: new Date(),
            reminder_sent_by: req.user?.id,
            reminder_notes: notes || null
        });
        
        // Audit log
        await auditService.logUpdate(req.user?.id, 'vehicles', vehicle.id, 
            { reminder_sent_at: null },
            { reminder_sent_at: vehicle.reminder_sent_at, reminder_notes: notes },
            req
        );
        
        res.json({
            success: true,
            message: 'Vehicle marked as contacted',
            data: vehicle
        });
    } catch (error) {
        console.error('Error marking vehicle as contacted:', error);
        res.status(500).json({ message: 'Error marking vehicle as contacted', error: error.message });
    }
};

// Reset reminder status (after new transaction or manual reset)
exports.resetReminderStatus = async (req, res) => {
    const { id } = req.params;
    
    try {
        const vehicle = await Vehicle.findByPk(id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        const oldValues = {
            reminder_sent_at: vehicle.reminder_sent_at,
            reminder_sent_by: vehicle.reminder_sent_by,
            reminder_notes: vehicle.reminder_notes
        };
        
        await vehicle.update({
            reminder_sent_at: null,
            reminder_sent_by: null,
            reminder_notes: null
        });
        
        // Audit log
        await auditService.logUpdate(req.user?.id, 'vehicles', vehicle.id, 
            oldValues,
            { reminder_sent_at: null, reminder_sent_by: null, reminder_notes: null },
            req
        );
        
        res.json({
            success: true,
            message: 'Reminder status reset',
            data: vehicle
        });
    } catch (error) {
        console.error('Error resetting reminder status:', error);
        res.status(500).json({ message: 'Error resetting reminder status', error: error.message });
    }
};

/**
 * Upload vehicle image
 * POST /api/vehicles/:id/upload-image
 */
exports.uploadVehicleImage = async (req, res) => {
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

        const vehicle = await Vehicle.findByPk(id);

        if (!vehicle) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        // Delete old image file if exists
        if (vehicle.image_url && vehicle.image_url.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, '../../public', vehicle.image_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Generate image URL
        const imageUrl = `/uploads/vehicles/${req.file.filename}`;

        // Update vehicle with new image URL
        const oldValues = { image_url: vehicle.image_url };
        await vehicle.update({ image_url: imageUrl });

        // Audit log
        await auditService.logUpdate(req.user?.id, 'vehicles', vehicle.id, oldValues, {
            image_url: imageUrl
        }, req);

        res.status(200).json({
            success: true,
            message: 'Vehicle image uploaded successfully',
            data: {
                vehicle_id: vehicle.id,
                image_url: imageUrl
            }
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Upload vehicle image error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading vehicle image',
            error: error.message
        });
    }
};