// Payment model definition for Sequelize
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Payment extends Model {}

Payment.init({
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  payment_method: {
    type: DataTypes.ENUM('CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'QRIS', 'OTHER', 'REFUND'),
    allowNull: false,
  },
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Payment',
  tableName: 'payments',
  timestamps: true,
  underscored: true,
});

module.exports = Payment;