// token-blacklist.model.js - Model untuk menyimpan token yang sudah di-invalidate

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TokenBlacklist = sequelize.define('TokenBlacklist', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    token: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'token_blacklist',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['token(255)'], // Index hanya 255 karakter pertama
        },
        {
            fields: ['expires_at'],
        }
    ]
});

module.exports = TokenBlacklist;
