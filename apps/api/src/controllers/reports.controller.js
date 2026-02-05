// reports.controller.js

const reportsService = require('../services/reports.service');

// Get dashboard report (summary statistics)
exports.getDashboardReport = async (req, res) => {
    try {
        const report = await reportsService.generateDashboardReport();
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error generating dashboard report', error: error.message });
    }
};

// Get financial report
exports.getFinancialReport = async (req, res) => {
    try {
        const { date_from, date_to } = req.query;
        const report = await reportsService.generateFinancialReport({ dateFrom: date_from, dateTo: date_to });
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error generating financial report', error: error.message });
    }
};

// Get inventory report
exports.getInventoryReport = async (req, res) => {
    try {
        const { category, low_stock } = req.query;
        const report = await reportsService.generateInventoryReport({ category, lowStockOnly: low_stock === 'true' });
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error generating inventory report', error: error.message });
    }
};

// Get sales report
exports.getSalesReport = async (req, res) => {
    try {
        const { date_from, date_to, group_by } = req.query;
        const report = await reportsService.generateSalesReport({ dateFrom: date_from, dateTo: date_to, groupBy: group_by });
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error generating sales report', error: error.message });
    }
};