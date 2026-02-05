// This file contains validation functions for the AutoWorkshop MMS application.

export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

export const validatePhoneNumber = (phone) => {
    const regex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    return regex.test(phone);
};

export const validateRequired = (value) => {
    return value && value.trim() !== '';
};

export const validatePrice = (price) => {
    return !isNaN(price) && price >= 0;
};

export const validateStockQuantity = (quantity) => {
    return Number.isInteger(quantity) && quantity >= 0;
};