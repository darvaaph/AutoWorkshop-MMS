// reports.service.js - Report generation logic

const { Op } = require('sequelize');
const Transaction = require('../models/transaction.model');
const TransactionItem = require('../models/transaction-item.model');
const Payment = require('../models/payment.model');
const Expense = require('../models/expense.model');
const Product = require('../models/product.model');
const Vehicle = require('../models/vehicle.model');
const Customer = require('../models/customer.model');

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

        const todayTransactions = await Transaction.count({
            where: {
                date: { [Op.between]: [today, tomorrow] },
                status: { [Op.notIn]: ['CANCELLED'] }
            }
        });
        const todaySales = (await Transaction.sum('total_amount', {
            where: {
                date: { [Op.between]: [today, tomorrow] },
                status: { [Op.notIn]: ['CANCELLED'] }
            }
        })) || 0;

        const monthlyTransactions = await Transaction.count({
            where: {
                date: { [Op.between]: [startOfMonth, tomorrow] },
                status: { [Op.notIn]: ['CANCELLED'] }
            }
        });
        const monthlySales = (await Transaction.sum('total_amount', {
            where: {
                date: { [Op.between]: [startOfMonth, tomorrow] },
                status: { [Op.notIn]: ['CANCELLED'] }
            }
        })) || 0;

        const totalProducts = await Product.count();
        const totalCustomers = await Customer.count();
        const totalVehicles = await Vehicle.count();
        const lowStockProducts = await Product.count({
            where: {
                stock: { [Op.gt]: 0 },
                [Op.and]: [{ stock: { [Op.lte]: Product.sequelize.literal('min_stock_alert') } }]
            }
        });

        return {
            today: { sales: todaySales, transactions: todayTransactions },
            month: { sales: monthlySales, transactions: monthlyTransactions },
            inventory: { totalProducts, lowStock: lowStockProducts },
            customers: { total: totalCustomers, vehicles: totalVehicles }
        };
    }

    /**
     * Generate financial report
     */
    async generateFinancialReport(options = {}) {
        const { dateFrom, dateTo } = options;

        const dateFilter = {};
        if (dateFrom && dateTo) {
            dateFilter.date = { [Op.between]: [new Date(dateFrom), new Date(dateTo + 'T23:59:59')] };
        } else if (dateFrom) {
            dateFilter.date = { [Op.gte]: new Date(dateFrom) };
        } else if (dateTo) {
            dateFilter.date = { [Op.lte]: new Date(dateTo + 'T23:59:59') };
        }

        const transactions = await Transaction.findAll({
            where: { ...dateFilter, status: { [Op.in]: ['PAID', 'PARTIAL', 'PENDING'] } },
            include: [
                { model: Payment, as: 'payments' },
                { model: Vehicle, as: 'vehicle', attributes: ['license_plate'] }
            ],
            order: [['date', 'DESC']]
        });

        const totalReceived = transactions.reduce((sum, t) => {
            const paid = (t.payments || []).reduce((s, p) => s + parseFloat(p.amount), 0);
            return sum + paid;
        }, 0);
        const totalSales = transactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0);

        const expenseFilter = {};
        if (dateFrom && dateTo) {
            expenseFilter.date = { [Op.between]: [new Date(dateFrom), new Date(dateTo + 'T23:59:59')] };
        } else if (dateFrom) {
            expenseFilter.date = { [Op.gte]: new Date(dateFrom) };
        } else if (dateTo) {
            expenseFilter.date = { [Op.lte]: new Date(dateTo + 'T23:59:59') };
        }

        const expenses = await Expense.findAll({ where: expenseFilter });
        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        const byCategory = {};
        expenses.forEach(e => {
            if (!byCategory[e.category]) byCategory[e.category] = 0;
            byCategory[e.category] += parseFloat(e.amount);
        });

        return {
            period: { from: dateFrom || 'all', to: dateTo || 'all' },
            income: {
                total_sales: totalSales,
                total_received: totalReceived,
                outstanding: totalSales - totalReceived
            },
            expenses: { total: totalExpenses, by_category: byCategory },
            profit: { gross: totalReceived - totalExpenses },
            transaction_count: transactions.length,
            transactions: transactions.map(t => ({
                id: t.id,
                date: t.date,
                status: t.status,
                total_amount: t.total_amount,
                vehicle: t.vehicle ? { license_plate: t.vehicle.license_plate } : null
            }))
        };
    }

    /**
     * Generate inventory report
     */
    async generateInventoryReport() {
        const products = await Product.findAll({
            order: [['stock', 'ASC']],
            attributes: ['id', 'sku', 'name', 'category', 'stock', 'min_stock_alert', 'price_buy', 'price_sell']
        });

        const lowStockList = products.filter(p => p.stock <= p.min_stock_alert);
        const outOfStockCount = products.filter(p => p.stock === 0).length;
        const totalStockValue = products.reduce((s, p) => s + parseFloat(p.price_buy) * p.stock, 0);

        const byCategoryMap = {};
        products.forEach(p => {
            const cat = p.category || 'Lainnya';
            if (!byCategoryMap[cat]) byCategoryMap[cat] = { category: cat, count: 0, value: 0 };
            byCategoryMap[cat].count++;
            byCategoryMap[cat].value += parseFloat(p.price_buy) * p.stock;
        });
        const by_category = Object.values(byCategoryMap).sort((a, b) => b.value - a.value);

        return {
            summary: {
                total_products: products.length,
                low_stock: lowStockList.length,
                out_of_stock: outOfStockCount,
                total_stock_value: totalStockValue
            },
            by_category,
            low_stock: lowStockList.map(p => p.toJSON()),
            products: products.map(p => p.toJSON())
        };
    }

    /**
     * Generate sales report
     */
    async generateSalesReport(options = {}) {
        const { dateFrom, dateTo } = options;

        const whereClause = { status: { [Op.notIn]: ['CANCELLED'] } };
        if (dateFrom && dateTo) {
            whereClause.date = { [Op.between]: [new Date(dateFrom), new Date(dateTo + 'T23:59:59')] };
        } else if (dateFrom) {
            whereClause.date = { [Op.gte]: new Date(dateFrom) };
        } else if (dateTo) {
            whereClause.date = { [Op.lte]: new Date(dateTo + 'T23:59:59') };
        }

        const transactions = await Transaction.findAll({
            where: whereClause,
            order: [['date', 'DESC']],
            include: [
                { model: Payment, as: 'payments' },
                { model: TransactionItem, as: 'items' }
            ]
        });

        const totalSales = transactions.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0);
        const totalPaid = transactions.reduce((s, t) => {
            return s + (t.payments || []).reduce((ps, p) => ps + parseFloat(p.amount), 0);
        }, 0);

        // Aggregate top products and services from items
        const productMap = {};
        const serviceMap = {};
        transactions.forEach(t => {
            (t.items || []).forEach(item => {
                const revenue = parseFloat(item.sell_price) * item.qty;
                if (item.item_type === 'PRODUCT') {
                    if (!productMap[item.item_name]) productMap[item.item_name] = { name: item.item_name, qty: 0, revenue: 0 };
                    productMap[item.item_name].qty += item.qty;
                    productMap[item.item_name].revenue += revenue;
                } else if (item.item_type === 'SERVICE') {
                    if (!serviceMap[item.item_name]) serviceMap[item.item_name] = { name: item.item_name, qty: 0, revenue: 0 };
                    serviceMap[item.item_name].qty += item.qty;
                    serviceMap[item.item_name].revenue += revenue;
                }
            });
        });

        const top_products = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
        const top_services = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

        // Daily trend (ascending)
        const dailyMap = {};
        transactions.forEach(t => {
            const dateStr = t.date instanceof Date
                ? t.date.toISOString().split('T')[0]
                : String(t.date).split('T')[0];
            if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, transactions: 0, revenue: 0 };
            dailyMap[dateStr].transactions++;
            dailyMap[dateStr].revenue += parseFloat(t.total_amount || 0);
        });
        const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

        return {
            summary: {
                total_transactions: transactions.length,
                total_sales: totalSales,
                total_paid: totalPaid,
                total_unpaid: totalSales - totalPaid
            },
            top_products,
            top_services,
            daily,
            transactions: transactions.map(t => ({
                id: t.id,
                date: t.date,
                status: t.status,
                total_amount: t.total_amount,
                paid: (t.payments || []).reduce((s, p) => s + parseFloat(p.amount), 0)
            }))
        };
    }
}

module.exports = new ReportsService();
