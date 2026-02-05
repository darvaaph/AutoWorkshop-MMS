// reports.service.js - Report generation logic

const { Op } = require('sequelize');
const Transaction = require('../models/transaction.model');
const Payment = require('../models/payment.model');
const Expense = require('../models/expense.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const Vehicle = require('../models/vehicle.model');

class ReportsService {
    /**
     * Generate dashboard summary statistics
     */
    async generateDashboardReport() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Today's stats (placeholder - implement based on your transaction model)
        const todaySales = 0;
        const todayTransactions = 0;
        
        // Monthly stats
        const monthlySales = 0;
        const monthlyTransactions = 0;
        
        // Product counts
        const totalProducts = await Product.count();
        const lowStockProducts = await Product.count({
            where: {
                stock: { [Op.lte]: 5 },
                stock: { [Op.gt]: 0 }
            }
        });
        
        // Customer counts
        const totalCustomers = await Customer.count();
        const totalVehicles = await Vehicle.count();

        return {
            today: {
                sales: todaySales,
                transactions: todayTransactions
            },
            month: {
                sales: monthlySales,
                transactions: monthlyTransactions
            },
            inventory: {
                totalProducts,
                lowStock: lowStockProducts
            },
            customers: {
                total: totalCustomers,
                vehicles: totalVehicles
            }
        };
    }

    /**
     * Generate financial report
     */
    async generateFinancialReport(options = {}) {
        const { dateFrom, dateTo } = options;
        
        // Build date filter
        const dateFilter = {};
        if (dateFrom && dateTo) {
            dateFilter.date = {
                [Op.between]: [new Date(dateFrom), new Date(dateTo + 'T23:59:59')]
            };
        } else if (dateFrom) {
            dateFilter.date = { [Op.gte]: new Date(dateFrom) };
        } else if (dateTo) {
            dateFilter.date = { [Op.lte]: new Date(dateTo + 'T23:59:59') };
        }

        // Get income from transactions (total_amount of PAID transactions)
        const transactions = await Transaction.findAll({
            where: {
                ...dateFilter,
                status: { [Op.in]: ['PAID', 'PARTIAL'] }
            },
            include: [{ model: Payment, as: 'payments' }]
        });

        // Calculate total income (actual payments received)
        const totalIncome = transactions.reduce((sum, t) => {
            const paid = t.payments ? t.payments.reduce((s, p) => s + parseFloat(p.amount), 0) : 0;
            return sum + paid;
        }, 0);

        // Calculate total sales (billed amount)
        const totalSales = transactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);

        // Get expenses
        const expenseFilter = {};
        if (dateFrom && dateTo) {
            expenseFilter.date = {
                [Op.between]: [new Date(dateFrom), new Date(dateTo + 'T23:59:59')]
            };
        } else if (dateFrom) {
            expenseFilter.date = { [Op.gte]: new Date(dateFrom) };
        } else if (dateTo) {
            expenseFilter.date = { [Op.lte]: new Date(dateTo + 'T23:59:59') };
        }

        const expenses = await Expense.findAll({ where: expenseFilter });
        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        // Group expenses by category
        const expensesByCategory = {};
        expenses.forEach(e => {
            if (!expensesByCategory[e.category]) {
                expensesByCategory[e.category] = 0;
            }
            expensesByCategory[e.category] += parseFloat(e.amount);
        });

        // Calculate profit
        const grossProfit = totalIncome - totalExpenses;

        return {
            period: {
                from: dateFrom || 'all',
                to: dateTo || 'all'
            },
            income: {
                total_sales: totalSales,
                total_received: totalIncome,
                outstanding: totalSales - totalIncome
            },
            expenses: {
                total: totalExpenses,
                by_category: expensesByCategory
            },
            profit: {
                gross: grossProfit
            },
            transaction_count: transactions.length
        };
    }

    /**
     * Generate inventory report
     */
    async generateInventoryReport(options = {}) {
        const { category, lowStockOnly } = options;
        
        const whereClause = {};
        
        if (category) {
            whereClause.category = category;
        }
        
        if (lowStockOnly) {
            whereClause.stock = {
                [Op.lte]: require('sequelize').literal('min_stock_alert')
            };
        }

        const products = await Product.findAll({
            where: whereClause,
            order: [['stock', 'ASC']],
            attributes: ['id', 'sku', 'name', 'category', 'stock', 'min_stock_alert', 'price_buy', 'price_sell']
        });
        
        // Calculate summary
        const totalProducts = products.length;
        const lowStockCount = products.filter(p => p.stock <= p.min_stock_alert).length;
        const outOfStockCount = products.filter(p => p.stock === 0).length;
        const totalStockValue = products.reduce((sum, p) => sum + (parseFloat(p.price_buy) * p.stock), 0);
        
        return { 
            summary: {
                total_products: totalProducts,
                low_stock: lowStockCount,
                out_of_stock: outOfStockCount,
                total_stock_value: totalStockValue
            },
            products 
        };
    }

    /**
     * Generate sales report
     */
    async generateSalesReport(options = {}) {
        const { dateFrom, dateTo, groupBy } = options;
        
        const whereClause = {};
        
        if (dateFrom && dateTo) {
            whereClause.date = {
                [Op.between]: [new Date(dateFrom), new Date(dateTo + 'T23:59:59')]
            };
        } else if (dateFrom) {
            whereClause.date = {
                [Op.gte]: new Date(dateFrom)
            };
        } else if (dateTo) {
            whereClause.date = {
                [Op.lte]: new Date(dateTo + 'T23:59:59')
            };
        }

        const transactions = await Transaction.findAll({
            where: whereClause,
            order: [['date', 'DESC']],
            include: [
                { model: Payment, as: 'payments' }
            ]
        });
        
        // Calculate totals
        const totalTransactions = transactions.length;
        const totalSales = transactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);
        const totalPaid = transactions.reduce((sum, t) => {
            const paid = t.payments ? t.payments.reduce((s, p) => s + parseFloat(p.amount), 0) : 0;
            return sum + paid;
        }, 0);
        const totalUnpaid = totalSales - totalPaid;
        
        // Group by if specified
        let groupedData = null;
        if (groupBy === 'day') {
            groupedData = {};
            transactions.forEach(t => {
                const day = t.date.toISOString().split('T')[0];
                if (!groupedData[day]) {
                    groupedData[day] = { count: 0, total: 0 };
                }
                groupedData[day].count++;
                groupedData[day].total += parseFloat(t.total_amount || 0);
            });
        } else if (groupBy === 'month') {
            groupedData = {};
            transactions.forEach(t => {
                const month = t.date.toISOString().substring(0, 7);
                if (!groupedData[month]) {
                    groupedData[month] = { count: 0, total: 0 };
                }
                groupedData[month].count++;
                groupedData[month].total += parseFloat(t.total_amount || 0);
            });
        }

        return {
            summary: {
                total_transactions: totalTransactions,
                total_sales: totalSales,
                total_paid: totalPaid,
                total_unpaid: totalUnpaid
            },
            grouped_by: groupBy || null,
            grouped_data: groupedData,
            transactions: transactions.map(t => ({
                id: t.id,
                date: t.date,
                status: t.status,
                total_amount: t.total_amount,
                paid: t.payments ? t.payments.reduce((s, p) => s + parseFloat(p.amount), 0) : 0
            }))
        };
    }
}

module.exports = new ReportsService();