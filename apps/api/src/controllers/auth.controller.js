// auth.controller.js

const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');
const TokenBlacklist = require('../models/token-blacklist.model');
const asyncHandler = require('../utils/async-handler');
const { validationResult } = require('express-validator');

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { username, password } = req.body;
    const result = await authService.login(username, password);

    // Audit log for login
    await auditService.logLogin(result.user.id, req);

    res.status(200).json({
        success: true,
        message: 'Login berhasil',
        data: result
    });
});

/**
 * Register new user (Admin only)
 * POST /api/auth/register
 */
exports.register = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

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
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
exports.getMe = asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({
        success: true,
        data: user
    });
});

/**
 * Change password
 * PUT /api/auth/change-password
 */
exports.changePassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

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
});

/**
 * Get all users (Admin only)
 * GET /api/auth/users
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
    const users = await authService.getAllUsers();
    res.status(200).json({
        success: true,
        data: users
    });
});

/**
 * Update user status (Admin only)
 * PUT /api/auth/users/:id/status
 */
exports.updateUserStatus = asyncHandler(async (req, res) => {
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
});

/**
 * Logout - Invalidate JWT token
 * POST /api/auth/logout
 */
exports.logout = asyncHandler(async (req, res) => {
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
});
