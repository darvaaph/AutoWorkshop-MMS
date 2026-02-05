// validators.js - Contains validation functions for the API

const { body, param } = require('express-validator');

// Example validation for user registration
const registerValidator = [
    body('username')
        .isString()
        .withMessage('Username must be a string')
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .isString()
        .withMessage('Password must be a string')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('full_name')
        .isString()
        .withMessage('Full name must be a string')
        .notEmpty()
        .withMessage('Full name is required'),
];

// Example validation for product creation
const productValidator = [
    body('sku')
        .isString()
        .withMessage('SKU must be a string')
        .notEmpty()
        .withMessage('SKU is required'),
    body('name')
        .isString()
        .withMessage('Product name must be a string')
        .notEmpty()
        .withMessage('Product name is required'),
    body('price_buy')
        .isNumeric()
        .withMessage('Buy price must be a number')
        .notEmpty()
        .withMessage('Buy price is required'),
    body('price_sell')
        .isNumeric()
        .withMessage('Sell price must be a number')
        .notEmpty()
        .withMessage('Sell price is required'),
];

// Example validation for vehicle ID parameter
const vehicleIdValidator = [
    param('id')
        .isInt()
        .withMessage('Vehicle ID must be an integer'),
];

module.exports = {
    registerValidator,
    productValidator,
    vehicleIdValidator,
};