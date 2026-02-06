// customer.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('Customer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    photo_url: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL path to customer photo for identification'
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
    },
}, {
    timestamps: true,
    underscored: true,
    paranoid: true,
    tableName: 'customers',
});

module.exports = Customer;