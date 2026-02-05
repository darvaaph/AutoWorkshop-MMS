// audit-logs.controller.js

const AuditLog = require('../models/audit-log.model');

// Get all audit logs
exports.getAllAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.findAll({ order: [['created_at', 'DESC']] });
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving audit logs', error: error.message });
    }
};

// Get a specific audit log by ID
exports.getAuditLogById = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await AuditLog.findByPk(id);
        if (!log) {
            return res.status(404).json({ success: false, message: 'Audit log not found' });
        }
        res.status(200).json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error retrieving audit log', error: error.message });
    }
};

// Create a new audit log
exports.createAuditLog = async (req, res) => {
    const { userId, action, tableName, oldValues, newValues } = req.body;

    try {
        const newLog = await AuditLog.create({
            user_id: userId,
            action,
            table_name: tableName,
            old_values: oldValues,
            new_values: newValues,
        });
        res.status(201).json({ success: true, data: newLog });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating audit log', error: error.message });
    }
};

// Update an existing audit log (rarely used)
exports.updateAuditLog = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await AuditLog.findByPk(id);
        if (!log) {
            return res.status(404).json({ success: false, message: 'Audit log not found' });
        }
        await log.update(req.body);
        res.status(200).json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating audit log', error: error.message });
    }
};

// Delete an audit log (soft delete)
exports.deleteAuditLog = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await AuditLog.findByPk(id);
        if (!log) {
            return res.status(404).json({ success: false, message: 'Audit log not found' });
        }
        await log.destroy();
        res.status(200).json({ success: true, message: 'Audit log deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting audit log', error: error.message });
    }
};