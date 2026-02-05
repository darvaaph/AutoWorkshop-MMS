const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class AuditLog extends Model {}

AuditLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE'),
    allowNull: false,
  },
  table_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  old_values: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  new_values: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = AuditLog;