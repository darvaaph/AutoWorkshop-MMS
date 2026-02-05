// audit.service.js - Centralized audit logging service

const AuditLog = require('../models/audit-log.model');

class AuditService {
    /**
     * Create an audit log entry
     * @param {Object} options - Audit log options
     */
    async log(options) {
        const {
            userId,
            action,
            tableName,
            recordId,
            oldValues = null,
            newValues = null,
            ipAddress = null,
            userAgent = null
        } = options;

        try {
            await AuditLog.create({
                user_id: userId,
                action,
                table_name: tableName,
                record_id: recordId,
                old_values: oldValues,
                new_values: newValues,
                ip_address: ipAddress,
                user_agent: userAgent,
                created_at: new Date()
            });
        } catch (error) {
            // Log error but don't throw - audit should not break main flow
            console.error('Audit log error:', error.message);
        }
    }

    /**
     * Log CREATE action
     */
    async logCreate(userId, tableName, recordId, newValues, req = null) {
        await this.log({
            userId,
            action: 'CREATE',
            tableName,
            recordId,
            newValues,
            ipAddress: req ? this.getClientIp(req) : null,
            userAgent: req ? req.get('User-Agent') : null
        });
    }

    /**
     * Log UPDATE action
     */
    async logUpdate(userId, tableName, recordId, oldValues, newValues, req = null) {
        await this.log({
            userId,
            action: 'UPDATE',
            tableName,
            recordId,
            oldValues,
            newValues,
            ipAddress: req ? this.getClientIp(req) : null,
            userAgent: req ? req.get('User-Agent') : null
        });
    }

    /**
     * Log DELETE action
     */
    async logDelete(userId, tableName, recordId, oldValues, req = null) {
        await this.log({
            userId,
            action: 'DELETE',
            tableName,
            recordId,
            oldValues,
            ipAddress: req ? this.getClientIp(req) : null,
            userAgent: req ? req.get('User-Agent') : null
        });
    }

    /**
     * Log LOGIN action
     */
    async logLogin(userId, req = null) {
        await this.log({
            userId,
            action: 'LOGIN',
            tableName: 'users',
            recordId: userId,
            ipAddress: req ? this.getClientIp(req) : null,
            userAgent: req ? req.get('User-Agent') : null
        });
    }

    /**
     * Log LOGOUT action
     */
    async logLogout(userId, req = null) {
        await this.log({
            userId,
            action: 'LOGOUT',
            tableName: 'users',
            recordId: userId,
            ipAddress: req ? this.getClientIp(req) : null,
            userAgent: req ? req.get('User-Agent') : null
        });
    }

    /**
     * Get client IP address from request
     */
    getClientIp(req) {
        return req.ip || 
               req.headers['x-forwarded-for']?.split(',')[0] || 
               req.connection?.remoteAddress ||
               null;
    }

    // Legacy methods for backward compatibility
    async createAuditLog(userId, action, tableName, oldValues, newValues) {
        await this.log({ userId, action, tableName, oldValues, newValues });
    }

    async getAuditLogs() {
        return await AuditLog.findAll({ order: [['created_at', 'DESC']] });
    }

    async getAuditLogById(id) {
        return await AuditLog.findByPk(id);
    }
}

module.exports = new AuditService();