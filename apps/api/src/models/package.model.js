// Package model definition for the AutoWorkshop MMS application
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Package extends Model {}

Package.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL path to package banner/promotional image'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
}, {
  sequelize,
  modelName: 'Package',
  tableName: 'packages',
  timestamps: true,
  underscored: true,
  paranoid: true,
});

module.exports = Package;