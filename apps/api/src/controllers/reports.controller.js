// reports.controller.js

const reportsService = require('../services/reports.service');
const asyncHandler = require('../utils/async-handler');

// Get dashboard report (summary statistics)
exports.getDashboardReport = asyncHandler(async (req, res) => {
    const report = await reportsService.generateDashboardReport();
    res.status(200).json({ success: true, data: report });
});

// Get financial report
exports.getFinancialReport = asyncHandler(async (req, res) => {
    const { date_from, date_to } = req.query;
    const report = await reportsService.generateFinancialReport({ dateFrom: date_from, dateTo: date_to });
    res.status(200).json({ success: true, data: report });
});

// Get inventory report
exports.getInventoryReport = asyncHandler(async (req, res) => {
    const { category, low_stock } = req.query;
    const report = await reportsService.generateInventoryReport({ category, lowStockOnly: low_stock === 'true' });
    res.status(200).json({ success: true, data: report });
});

// Get sales report
exports.getSalesReport = asyncHandler(async (req, res) => {
    const { date_from, date_to, group_by } = req.query;
    const report = await reportsService.generateSalesReport({ dateFrom: date_from, dateTo: date_to, groupBy: group_by });
    res.status(200).json({ success: true, data: report });
});

// Get operational report (mechanic performance & vehicle/customer frequency)
exports.getOperationalReport = asyncHandler(async (req, res) => {
    const { date_from, date_to } = req.query;
    const report = await reportsService.generateOperationalReport({ dateFrom: date_from, dateTo: date_to });
    res.status(200).json({ success: true, data: report });
});
