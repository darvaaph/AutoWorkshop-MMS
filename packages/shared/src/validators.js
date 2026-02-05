// This file contains shared validation functions for the AutoWorkshop MMS project.

export const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

export const isNonEmptyString = (str) => {
    return typeof str === 'string' && str.trim().length > 0;
};

export const isPositiveNumber = (num) => {
    return typeof num === 'number' && num > 0;
};

export const isValidPhoneNumber = (phone) => {
    const regex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    return regex.test(phone);
};

// Add more validation functions as needed.