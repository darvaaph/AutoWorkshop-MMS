// mechanics.controller.js

const Mechanic = require('../models/mechanic.model');
const auditService = require('../services/audit.service');

// Get all mechanics
exports.getAllMechanics = async (req, res) => {
    try {
        const mechanics = await Mechanic.findAll();
        res.status(200).json(mechanics);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving mechanics', error });
    }
};

// Get a mechanic by ID
exports.getMechanicById = async (req, res) => {
    const { id } = req.params;
    try {
        const mechanic = await Mechanic.findByPk(id);
        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic not found' });
        }
        res.status(200).json(mechanic);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving mechanic', error });
    }
};

// Create a new mechanic
exports.createMechanic = async (req, res) => {
    const { name, is_active } = req.body;
    try {
        const newMechanic = await Mechanic.create({ name, is_active });
        
        // Audit log
        await auditService.logCreate(req.user?.id, 'mechanics', newMechanic.id, {
            name, is_active
        }, req);
        
        res.status(201).json(newMechanic);
    } catch (error) {
        res.status(500).json({ message: 'Error creating mechanic', error });
    }
};

// Update a mechanic
exports.updateMechanic = async (req, res) => {
    const { id } = req.params;
    const { name, is_active } = req.body;
    try {
        const mechanic = await Mechanic.findByPk(id);
        if (!mechanic) {
            return res.status(404).json({ message: 'Mechanic not found' });
        }
        
        const oldValues = { name: mechanic.name, is_active: mechanic.is_active };
        
        // Only update fields that are provided
        if (name !== undefined) {
            mechanic.name = name;
        }
        if (is_active !== undefined) {
            mechanic.is_active = is_active;
        }
        
        await mechanic.save();
        
        // Audit log (optional)
        try {
            await auditService.logUpdate(req.user?.id, 'mechanics', mechanic.id, oldValues, {
                name: mechanic.name, is_active: mechanic.is_active
            }, req);
        } catch (auditError) {
            console.warn('Audit logging failed:', auditError.message);
        }
        
        res.status(200).json(mechanic);
    } catch (error) {
        res.status(500).json({ message: 'Error updating mechanic', error });
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