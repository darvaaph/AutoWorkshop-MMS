// transaction-item.model.js

const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class TransactionItem extends Model {}

TransactionItem.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'transactions',
            key: 'id',
        },
    },
    item_type: {
        type: DataTypes.ENUM('PRODUCT', 'SERVICE', 'PACKAGE', 'EXTERNAL'),
        allowNull: false,
    },
    item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    item_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    base_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    discount_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    },
    sell_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    cost_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    },
    vendor_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'TransactionItem',
    tableName: 'transaction_items',
    timestamps: true,
    underscored: true,
});

module.exports = TransactionItem;