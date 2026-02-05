const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Expense extends Model {}

Expense.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  category: {
    type: DataTypes.ENUM('SALARY', 'UTILITIES', 'PURCHASING', 'OTHER'),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Expense',
  tableName: 'expenses',
  timestamps: true,
  underscored: true,
  paranoid: true, // Enables soft delete
});

module.exports = Expense;