// models/index.js - Model initialization and associations

const { sequelize } = require('../config/database');
const Sequelize = require('sequelize');

// Import models
const User = require('./user.model');
const Product = require('./product.model');
const Service = require('./service.model');
const Package = require('./package.model');
const PackageItem = require('./package-item.model');
const Customer = require('./customer.model');
const Vehicle = require('./vehicle.model');
const Mechanic = require('./mechanic.model');
const Transaction = require('./transaction.model');
const TransactionItem = require('./transaction-item.model');
const Payment = require('./payment.model');
const Expense = require('./expense.model');
const InventoryLog = require('./inventory-log.model');
const AuditLog = require('./audit-log.model');
const Setting = require('./setting.model');
const TokenBlacklist = require('./token-blacklist.model');

// ============================================
// Define Associations
// ============================================

// Package <-> PackageItem
Package.hasMany(PackageItem, { 
    foreignKey: 'package_id', 
    as: 'items',
    onDelete: 'CASCADE'
});
PackageItem.belongsTo(Package, { 
    foreignKey: 'package_id', 
    as: 'package' 
});

// PackageItem <-> Product
PackageItem.belongsTo(Product, { 
    foreignKey: 'product_id', 
    as: 'product' 
});
Product.hasMany(PackageItem, { 
    foreignKey: 'product_id', 
    as: 'packageItems' 
});

// PackageItem <-> Service
PackageItem.belongsTo(Service, { 
    foreignKey: 'service_id', 
    as: 'service' 
});
Service.hasMany(PackageItem, { 
    foreignKey: 'service_id', 
    as: 'packageItems' 
});

// Customer <-> Vehicle
Customer.hasMany(Vehicle, { 
    foreignKey: 'customer_id', 
    as: 'vehicles',
    onDelete: 'CASCADE'
});
Vehicle.belongsTo(Customer, { 
    foreignKey: 'customer_id', 
    as: 'customer' 
});

// Transaction associations
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Transaction.belongsTo(Mechanic, { foreignKey: 'mechanic_id', as: 'mechanic' });
Transaction.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
Transaction.hasMany(TransactionItem, { foreignKey: 'transaction_id', as: 'items' });
Transaction.hasMany(Payment, { foreignKey: 'transaction_id', as: 'payments' });

TransactionItem.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });

Payment.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });

// Expense <-> User
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Expense, { foreignKey: 'user_id', as: 'expenses' });

// InventoryLog <-> Product
InventoryLog.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(InventoryLog, { foreignKey: 'product_id', as: 'inventoryLogs' });

// AuditLog <-> User
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });

// Export all models
module.exports = {
    sequelize,
    Sequelize,
    User,
    Product,
    Service,
    Package,
    PackageItem,
    Customer,
    Vehicle,
    Mechanic,
    Transaction,
    TransactionItem,
    Payment,
    Expense,
    InventoryLog,
    AuditLog,
    Setting,
    TokenBlacklist
};