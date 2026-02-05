// This file contains utility functions that can be used throughout the application. 
// Add your helper functions below.

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

export const parseDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

export const generateUniqueId = () => {
    return 'id-' + Math.random().toString(36).substr(2, 16);
};