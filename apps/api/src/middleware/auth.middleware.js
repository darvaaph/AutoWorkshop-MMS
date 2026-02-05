const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TokenBlacklist = require('../models/token-blacklist.model');

/**
 * Middleware to verify JWT token and attach user to request
 */
const verifyToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token tidak ditemukan. Silakan login terlebih dahulu.' 
            });
        }

        const token = authHeader.split(' ')[1];

        // Check if token is blacklisted (logged out)
        const blacklisted = await TokenBlacklist.findOne({ 
            where: { token } 
        });
        
        if (blacklisted) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token sudah tidak valid. Silakan login ulang.' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'full_name', 'role', 'is_active']
        });

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User tidak ditemukan.' 
            });
        }

        if (!user.is_active) {
            return res.status(401).json({ 
                success: false, 
                message: 'Akun tidak aktif. Hubungi administrator.' 
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token sudah kadaluarsa. Silakan login ulang.' 
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token tidak valid.' 
            });
        }
        return res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server.' 
        });
    }
};

/**
 * Middleware to check if user has required role(s)
 * @param  {...string} roles - Allowed roles (ADMIN, CASHIER)
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Akses ditolak. Hanya ${roles.join(' atau ')} yang diizinkan.` 
            });
        }

        next();
    };
};

/**
 * Optional auth - doesn't fail if no token, just attaches user if present
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'full_name', 'role', 'is_active']
        });

        if (user && user.is_active) {
            req.user = user;
        }
        
        next();
    } catch (error) {
        // Continue without user if token is invalid
        next();
    }
};

module.exports = {
    verifyToken,
    requireRole,
    optionalAuth
};