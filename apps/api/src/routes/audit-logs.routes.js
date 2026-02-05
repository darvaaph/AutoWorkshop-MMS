const express = require('express');
const router = express.Router();
const auditLogsController = require('../controllers/audit-logs.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// All audit log routes require Admin authentication
router.use(verifyToken);
router.use(requireRole('ADMIN'));

// Get all audit logs
router.get('/', auditLogsController.getAllAuditLogs);

// Get a specific audit log by ID
router.get('/:id', auditLogsController.getAuditLogById);

// Create a new audit log
router.post('/', auditLogsController.createAuditLog);

// Update an existing audit log
router.put('/:id', auditLogsController.updateAuditLog);

// Delete an audit log (soft delete)
router.delete('/:id', auditLogsController.deleteAuditLog);

module.exports = router;