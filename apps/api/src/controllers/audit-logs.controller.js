// audit-logs.controller.js

const { Op } = require('sequelize');
const AuditLog = require('../models/audit-log.model');
const User = require('../models/user.model');
const asyncHandler = require('../utils/async-handler');

// Get all audit logs (paginated, filterable)
exports.getAllAuditLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, action, table_name, date_from, date_to } = req.query;
    const where = {};

    if (action) where.action = action;
    if (table_name) where.table_name = table_name;
    if (date_from || date_to) {
        where.created_at = {};
        if (date_from) where.created_at[Op.gte] = new Date(date_from);
        if (date_to) {
            const end = new Date(date_to);
            end.setHours(23, 59, 59, 999);
            where.created_at[Op.lte] = end;
        }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await AuditLog.findAndCountAll({
        where,
        include: [{ model: User, as: 'user', attributes: ['id', 'username', 'full_name'] }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset,
    });

    res.status(200).json({
        success: true,
        data: rows,
        meta: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit)),
        },
    });
});

// Get a specific audit log by ID
exports.getAuditLogById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const log = await AuditLog.findByPk(id);
    if (!log) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
    }
    res.status(200).json({ success: true, data: log });
});

// Create a new audit log
exports.createAuditLog = asyncHandler(async (req, res) => {
    const { userId, action, tableName, oldValues, newValues } = req.body;

    const newLog = await AuditLog.create({
        user_id: userId,
        action,
        table_name: tableName,
        old_values: oldValues,
        new_values: newValues,
    });
    res.status(201).json({ success: true, data: newLog });
});

// Update an existing audit log (rarely used)
exports.updateAuditLog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const log = await AuditLog.findByPk(id);
    if (!log) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
    }
    await log.update(req.body);
    res.status(200).json({ success: true, data: log });
});

// Delete an audit log (soft delete)
exports.deleteAuditLog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const log = await AuditLog.findByPk(id);
    if (!log) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
    }
    await log.destroy();
    res.status(200).json({ success: true, message: 'Audit log deleted' });
});
