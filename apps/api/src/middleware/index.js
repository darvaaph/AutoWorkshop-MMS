// Middleware exports

const { verifyToken, requireRole, optionalAuth } = require('./auth.middleware');

// Alias for backwards compatibility
const authMiddleware = verifyToken;
const roleMiddleware = requireRole;

module.exports = {
    verifyToken,
    requireRole,
    optionalAuth,
    authMiddleware,
    roleMiddleware,
};
