// settings.controller.js

const Settings = require('../models/setting.model');
const path = require('path');
const fs = require('fs');

// Get all settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await Settings.findOne();
        return res.status(200).json(settings);
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving settings', error });
    }
};

// Update settings
exports.updateSettings = async (req, res) => {
    try {
        const { shop_name, shop_address, shop_phone, printer_width, footer_message, shop_logo_url } = req.body;
        const settings = await Settings.findOne();

        if (!settings) {
            return res.status(404).json({ message: 'Settings not found' });
        }

        // Update fields if provided
        if (shop_name !== undefined) settings.shop_name = shop_name;
        if (shop_address !== undefined) settings.shop_address = shop_address;
        if (shop_phone !== undefined) settings.shop_phone = shop_phone;
        if (printer_width !== undefined) settings.printer_width = printer_width;
        if (footer_message !== undefined) settings.footer_message = footer_message;
        if (shop_logo_url !== undefined) settings.shop_logo_url = shop_logo_url;

        await settings.save();
        return res.status(200).json(settings);
    } catch (error) {
        return res.status(500).json({ message: 'Error updating settings', error });
    }
};

// Upload logo
exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No logo file uploaded' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, and GIF are allowed' });
        }

        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (req.file.size > maxSize) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'File too large. Maximum size is 2MB' });
        }

        // Generate logo URL
        const logoUrl = `/uploads/logos/${req.file.filename}`;

        // Update settings with new logo URL
        const settings = await Settings.findOne();
        if (!settings) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Settings not found' });
        }

        // Delete old logo file if exists
        if (settings.shop_logo_url && settings.shop_logo_url.startsWith('/uploads/')) {
            const oldLogoPath = path.join(__dirname, '../../public', settings.shop_logo_url);
            if (fs.existsSync(oldLogoPath)) {
                fs.unlinkSync(oldLogoPath);
            }
        }

        settings.shop_logo_url = logoUrl;
        await settings.save();

        return res.status(200).json({
            message: 'Logo uploaded successfully',
            logo_url: logoUrl,
            settings: settings
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: 'Error uploading logo', error });
    }
};