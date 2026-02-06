// mechanics.controller.js

const Mechanic = require('../models/mechanic.model');
const auditService = require('../services/audit.service');
const path = require('path');
const fs = require('fs');

// Get all mechanics (Public - basic info only)
exports.getAllMechanics = async (req, res) => {
    try {
        const mechanics = await Mechanic.findAll({
            attributes: ['id', 'name', 'is_active', 'photo_url', 'createdAt', 'updatedAt']
        });
        res.status(200).json({
            success: true,
            data: mechanics
        });
    } catch (error) {
        console.error('Get mechanics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving mechanics',
            error: error.message
        });
    }
};

// Get a mechanic by ID (Public - basic info only)
exports.getMechanicById = async (req, res) => {
    const { id } = req.params;
    try {
        const mechanic = await Mechanic.findByPk(id, {
            attributes: ['id', 'name', 'is_active', 'photo_url', 'createdAt', 'updatedAt']
        });
        if (!mechanic) {
            return res.status(404).json({
                success: false,
                message: 'Mechanic not found'
            });
        }
        res.status(200).json({
            success: true,
            data: mechanic
        });
    } catch (error) {
        console.error('Get mechanic error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving mechanic',
            error: error.message
        });
    }
};

// Upload mechanic photo
exports.uploadMechanicPhoto = async (req, res) => {
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

        const mechanic = await Mechanic.findByPk(id);

        if (!mechanic) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Mechanic not found'
            });
        }

        // Delete old photo file if exists
        if (mechanic.photo_url && mechanic.photo_url.startsWith('/uploads/')) {
            const oldPhotoPath = path.join(__dirname, '../../public', mechanic.photo_url);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Generate photo URL
        const photoUrl = `/uploads/mechanics/${req.file.filename}`;

        // Update mechanic with new photo URL
        const oldValues = { photo_url: mechanic.photo_url };
        await mechanic.update({ photo_url: photoUrl });

        // Audit log
        await auditService.logUpdate(req.user?.id, 'mechanics', mechanic.id, oldValues, {
            photo_url: photoUrl
        }, req);

        res.status(200).json({
            success: true,
            message: 'Mechanic photo uploaded successfully',
            data: {
                id: mechanic.id,
                photo_url: photoUrl
            }
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Upload mechanic photo error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading mechanic photo',
            error: error.message
        });
    }
};

// Get mechanic details (Admin only - includes sensitive data)
exports.getMechanicDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const mechanic = await Mechanic.findByPk(id, {
            attributes: { exclude: ['deletedAt'] }
        });

        if (!mechanic) {
            return res.status(404).json({
                success: false,
                message: 'Mechanic not found'
            });
        }

        res.status(200).json({
            success: true,
            data: mechanic
        });
    } catch (error) {
        console.error('Get mechanic details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving mechanic details',
            error: error.message
        });
    }
};

// Update mechanic details (Admin only - sensitive data)
exports.updateMechanicDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone, address, emergency_contact } = req.body;

        const mechanic = await Mechanic.findByPk(id);

        if (!mechanic) {
            return res.status(404).json({
                success: false,
                message: 'Mechanic not found'
            });
        }

        const oldValues = {
            phone: mechanic.phone,
            address: mechanic.address,
            emergency_contact: mechanic.emergency_contact
        };

        // Only update provided fields
        if (phone !== undefined) {
            mechanic.phone = phone;
        }
        if (address !== undefined) {
            mechanic.address = address;
        }
        if (emergency_contact !== undefined) {
            mechanic.emergency_contact = emergency_contact;
        }

        await mechanic.save();

        // Audit log for sensitive data changes
        await auditService.logUpdate(req.user?.id, 'mechanics', mechanic.id, oldValues, {
            phone: mechanic.phone,
            address: mechanic.address,
            emergency_contact: mechanic.emergency_contact
        }, req);

        res.status(200).json({
            success: true,
            message: 'Mechanic details updated successfully',
            data: {
                id: mechanic.id,
                phone: mechanic.phone,
                address: mechanic.address,
                emergency_contact: mechanic.emergency_contact
            }
        });
    } catch (error) {
        console.error('Update mechanic details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating mechanic details',
            error: error.message
        });
    }
};

// Create a new mechanic
exports.createMechanic = async (req, res) => {
    const { name, is_active } = req.body;
    try {
        // Handle photo upload if provided
        let photoUrl = null;
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

            // Generate photo URL
            photoUrl = `/uploads/mechanics/${req.file.filename}`;
        }

        const newMechanic = await Mechanic.create({
            name,
            is_active,
            photo_url: photoUrl
        });

        // Audit log
        await auditService.logCreate(req.user?.id, 'mechanics', newMechanic.id, {
            name, is_active, photo_url: photoUrl
        }, req);

        res.status(201).json({
            success: true,
            message: 'Mechanic created successfully',
            data: {
                id: newMechanic.id,
                name: newMechanic.name,
                is_active: newMechanic.is_active,
                photo_url: newMechanic.photo_url,
                createdAt: newMechanic.createdAt,
                updatedAt: newMechanic.updatedAt
            }
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Create mechanic error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating mechanic',
            error: error.message
        });
    }
};

// Update a mechanic
exports.updateMechanic = async (req, res) => {
    const { id } = req.params;
    const { name, is_active } = req.body;
    try {
        // Handle photo upload if provided
        let finalPhotoUrl = undefined;
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

            // Generate photo URL
            finalPhotoUrl = `/uploads/mechanics/${req.file.filename}`;
        }

        const mechanic = await Mechanic.findByPk(id);
        if (!mechanic) {
            return res.status(404).json({
                success: false,
                message: 'Mechanic not found'
            });
        }

        const oldValues = {
            name: mechanic.name,
            is_active: mechanic.is_active,
            photo_url: mechanic.photo_url
        };

        // Delete old photo file if new photo is uploaded
        if (req.file && mechanic.photo_url && mechanic.photo_url.startsWith('/uploads/')) {
            const oldPhotoPath = path.join(__dirname, '../../public', mechanic.photo_url);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Only update fields that are provided
        if (name !== undefined) {
            mechanic.name = name;
        }
        if (is_active !== undefined) {
            mechanic.is_active = is_active;
        }
        if (finalPhotoUrl !== undefined) {
            mechanic.photo_url = finalPhotoUrl;
        }

        await mechanic.save();

        // Audit log (optional)
        try {
            await auditService.logUpdate(req.user?.id, 'mechanics', mechanic.id, oldValues, {
                name: mechanic.name,
                is_active: mechanic.is_active,
                photo_url: mechanic.photo_url
            }, req);
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }

        res.status(200).json({
            success: true,
            message: 'Mechanic updated successfully',
            data: {
                id: mechanic.id,
                name: mechanic.name,
                is_active: mechanic.is_active,
                photo_url: mechanic.photo_url,
                createdAt: mechanic.createdAt,
                updatedAt: mechanic.updatedAt
            }
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Update mechanic error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating mechanic',
            error: error.message
        });
    }
};

// Delete a mechanic
exports.deleteMechanic = async (req, res) => {
    const { id } = req.params;
    try {
        const mechanic = await Mechanic.findByPk(id);
        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic not found' });
        }
        
        const oldValues = { name: mechanic.name, is_active: mechanic.is_active };
        
        await mechanic.destroy();
        
        // Audit log
        await auditService.logDelete(req.user?.id, 'mechanics', id, oldValues, req);
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting mechanic', error });
    }
};