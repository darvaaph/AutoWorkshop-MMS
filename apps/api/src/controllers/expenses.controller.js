// expenses.controller.js

const { Op } = require('sequelize');
const Expense = require('../models/expense.model');
const auditService = require('../services/audit.service');
const asyncHandler = require('../utils/async-handler');

// Create a new expense
exports.createExpense = asyncHandler(async (req, res) => {
    const { category, description, amount, date } = req.body;
    const user_id = req.user?.id; // Get user_id from JWT

    const newExpense = await Expense.create({ user_id, category, description, amount, date });

    // Audit log
    await auditService.logCreate(req.user?.id, 'expenses', newExpense.id, {
        category, description, amount, date
    }, req);

    return res.status(201).json({ success: true, data: newExpense });
});

// Get all expenses
exports.getAllExpenses = asyncHandler(async (req, res) => {
    const { category, date_from, date_to } = req.query;

    const where = {};
    if (category) {
        where.category = category;
    }
    if (date_from && date_to) {
        where.date = { [Op.between]: [new Date(date_from), new Date(date_to + 'T23:59:59')] };
    } else if (date_from) {
        where.date = { [Op.gte]: new Date(date_from) };
    } else if (date_to) {
        where.date = { [Op.lte]: new Date(date_to + 'T23:59:59') };
    }

    const expenses = await Expense.findAll({ where, order: [['date', 'DESC']] });
    return res.status(200).json({ success: true, data: expenses });
});

// Get a single expense by ID
exports.getExpenseById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
    }
    return res.status(200).json({ success: true, data: expense });
});

// Update an expense
exports.updateExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { category, description, amount, date } = req.body;
    const user_id = req.user?.id; // Get user_id from JWT

    const expense = await Expense.findByPk(id);
    if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
    }

    const oldValues = {
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date
    };

    await expense.update({ user_id, category, description, amount, date });

    // Audit log
    await auditService.logUpdate(req.user?.id, 'expenses', expense.id, oldValues, {
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date
    }, req);

    return res.status(200).json({ success: true, data: expense });
});

// Delete an expense
exports.deleteExpense = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const expense = await Expense.findByPk(id);
    if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
    }

    const oldValues = {
        category: expense.category,
        description: expense.description,
        amount: expense.amount
    };

    await expense.destroy();

    // Audit log
    await auditService.logDelete(req.user?.id, 'expenses', id, oldValues, req);

    return res.status(204).send();
});
