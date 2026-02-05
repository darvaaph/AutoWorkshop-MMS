// inventory-log.model.js

const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class InventoryLog extends Model {}

InventoryLog.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id',
        },
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    type: {
        type: DataTypes.ENUM('IN', 'OUT', 'ADJUSTMENT'),
        allowNull: false,
    },
    qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    stock_before: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    stock_after: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    price_per_unit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
    },
    reference_type: {
        type: DataTypes.ENUM('TRANSACTION', 'PURCHASE', 'ADJUSTMENT', 'PACKAGE', 'RETURN', 'OTHER'),
        allowNull: true,
    },
    reference_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'InventoryLog',
    tableName: 'inventory_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = InventoryLog;