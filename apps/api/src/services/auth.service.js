// auth.service.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

class AuthService {
    /**
     * Login user and return JWT token
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<{token: string, user: object}>}
     */
    async login(username, password) {
        // Find user by username
        const user = await User.findOne({ 
            where: { username } 
        });
        
        if (!user) {
            throw new Error('Username atau password salah');
        }

        // Check if user is active
        if (!user.is_active) {
            throw new Error('Akun tidak aktif. Hubungi administrator.');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            throw new Error('Username atau password salah');
        }

        // Generate JWT token (expires in 1 day)
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                role: user.role 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // Return token and user data (without password)
        return { 
            token, 
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        };
    }

    /**
     * Register new user (Admin only)
     * @param {object} userData 
     * @returns {Promise<object>}
     */
    async register(userData) {
        // Check if username already exists
        const existingUser = await User.findOne({ 
            where: { username: userData.username } 
        });
        
        if (existingUser) {
            throw new Error('Username sudah digunakan');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user
        const newUser = await User.create({ 
            ...userData, 
            password: hashedPassword,
            is_active: true
        });

        // Return user without password
        return {
            id: newUser.id,
            username: newUser.username,
            full_name: newUser.full_name,
            role: newUser.role,
            is_active: newUser.is_active
        };
    }

    /**
     * Change user password
     * @param {number} userId 
     * @param {string} oldPassword 
     * @param {string} newPassword 
     */
    async changePassword(userId, oldPassword, newPassword) {
        const user = await User.findByPk(userId);
        
        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        // Verify old password
        const isValidPassword = await bcrypt.compare(oldPassword, user.password);
        
        if (!isValidPassword) {
            throw new Error('Password lama salah');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await user.update({ password: hashedPassword });

        return { message: 'Password berhasil diubah' };
    }

    /**
     * Get user by ID
     * @param {number} userId 
     * @returns {Promise<object>}
     */
    async getUserById(userId) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'full_name', 'role', 'is_active', 'createdAt']
        });
        
        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        return user;
    }

    /**
     * Get all users (Admin only)
     * @returns {Promise<Array>}
     */
    async getAllUsers() {
        return await User.findAll({
            attributes: ['id', 'username', 'full_name', 'role', 'is_active', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });
    }

    /**
     * Update user status (Admin only)
     * @param {number} userId 
     * @param {boolean} isActive 
     */
    async updateUserStatus(userId, isActive) {
        const user = await User.findByPk(userId);
        
        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        await user.update({ is_active: isActive });

        return {
            id: user.id,
            username: user.username,
            is_active: user.is_active
        };
    }
}

module.exports = new AuthService();