// expenses.controller.js

const Expense = require('../models/expense.model');
const auditService = require('../services/audit.service');

// Create a new expense
exports.createExpense = async (req, res) => {
    try {
        const { category, description, amount, date } = req.body;
        const user_id = req.user?.id; // Get user_id from JWT
        
        const newExpense = await Expense.create({ user_id, category, description, amount, date });
        
        // Audit log
        await auditService.logCreate(req.user?.id, 'expenses', newExpense.id, {
            category, description, amount, date
        }, req);
        
        return res.status(201).json(newExpense);
    } catch (error) {
        return res.status(500).json({ message: 'Error creating expense', error: error.message });
    }
};

// Get all expenses
exports.getAllExpenses = async (req, res) => {
    try {
        const expenses = await Expense.findAll();
        return res.status(200).json(expenses);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching expenses', error: error.message });
    }
};

// Get a single expense by ID
exports.getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await Expense.findByPk(id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        return res.status(200).json(expense);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching expense', error: error.message });
    }
};

// Update an expense
exports.updateExpense = async (req, res) => {
    try {
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
        
        return res.status(200).json(expense);
    } catch (error) {
        return res.status(500).json({ message: 'Error updating expense', error: error.message });
    }
};

// Delete an expense
exports.deleteExpense = async (req, res) => {
    try {
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
    } catch (error) {
        return res.status(500).json({ message: 'Error deleting expense', error: error.message });
    }
};