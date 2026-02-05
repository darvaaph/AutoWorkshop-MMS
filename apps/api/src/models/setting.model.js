// This file defines the settings model for the AutoWorkshop MMS application using Sequelize.

const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Setting extends Model {}

Setting.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  shop_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  shop_address: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  shop_phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  shop_logo_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  printer_width: {
    type: DataTypes.ENUM('58mm', '80mm'),
    allowNull: false,
  },
  footer_message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Setting',
  tableName: 'settings',
  timestamps: false,
});

module.exports = Setting;