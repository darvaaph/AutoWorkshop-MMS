// auth.controller.js

const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');
const TokenBlacklist = require('../models/token-blacklist.model');
const { validationResult } = require('express-validator');

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            message: 'Validation error',
            errors: errors.array() 
        });
    }

    try {
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        
        // Audit log for login
        await auditService.logLogin(result.user.id, req);
        
        res.status(200).json({ 
            success: true,
            message: 'Login berhasil', 
            data: result
        });
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * Register new user (Admin only)
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            message: 'Validation error',
            errors: errors.array() 
        });
    }

    try {
        const user = await authService.register(req.body);
        
        // Audit log for user creation
        await auditService.logCreate(req.user?.id || null, 'users', user.id, {
            username: user.username,
            full_name: user.full_name,
            role: user.role
        }, req);
        
        res.status(201).json({ 
            success: true,
            message: 'User berhasil didaftarkan', 
            data: user 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
    try {
        const user = await authService.getUserById(req.user.id);
        res.status(200).json({ 
            success: true,
            data: user 
        });
    } catch (error) {
        res.status(404).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            message: 'Validation error',
            errors: errors.array() 
        });
    }

    try {
        const { old_password, new_password } = req.body;
        const result = await authService.changePassword(
            req.user.id, 
            old_password, 
            new_password
        );
        
        res.status(200).json({ 
            success: true,
            message: result.message 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * Get all users (Admin only)
 * GET /api/auth/users
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await authService.getAllUsers();
        res.status(200).json({ 
            success: true,
            data: users 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * Update user status (Admin only)
 * PUT /api/auth/users/:id/status
 */
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        
        const result = await authService.updateUserStatus(id, is_active);
        
        // Audit log for user status update
        await auditService.logUpdate(req.user.id, 'users', parseInt(id), 
            { is_active: !is_active }, 
            { is_active }, 
            req
        );
        
        res.status(200).json({ 
            success: true,
            message: `User berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
            data: result 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * Logout - Invalidate JWT token
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        
        // Decode token to get expiration
        const decoded = jwt.decode(token);
        const expiresAt = new Date(decoded.exp * 1000); // Convert from seconds to ms
        
        // Add token to blacklist
        await TokenBlacklist.create({
            token,
            user_id: req.user.id,
            expires_at: expiresAt
        });
        
        // Audit log for logout
        await auditService.logLogout(req.user.id, req);
        
        res.status(200).json({ 
            success: true,
            message: 'Logout berhasil. Token telah di-invalidate.' 
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error during logout',
            error: error.message 
        });
    }
};