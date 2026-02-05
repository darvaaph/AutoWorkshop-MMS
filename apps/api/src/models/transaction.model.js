const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Transaction extends Model {}

Transaction.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  vehicle_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'vehicles',
      key: 'id',
    },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  mechanic_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'mechanics',
      key: 'id',
    },
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'),
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  current_km: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
}, {
  sequelize,
  modelName: 'Transaction',
  tableName: 'transactions',
  timestamps: true,
  underscored: true,
  paranoid: true,
});

module.exports = Transaction;