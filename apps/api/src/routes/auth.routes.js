const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { 
    validateLogin, 
    validateRegister,
    validateChangePassword 
} = require('../middleware/validation.middleware');

// Public routes
router.post('/login', validateLogin, authController.login);

// Protected routes (requires authentication)
router.get('/me', verifyToken, authController.getMe);
router.put('/change-password', verifyToken, validateChangePassword, authController.changePassword);
router.post('/logout', verifyToken, authController.logout);

// Admin only routes
router.post('/register', verifyToken, requireRole('ADMIN'), validateRegister, authController.register);
router.get('/users', verifyToken, requireRole('ADMIN'), authController.getAllUsers);
router.put('/users/:id/status', verifyToken, requireRole('ADMIN'), authController.updateUserStatus);

module.exports = router;