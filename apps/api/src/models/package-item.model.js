// package-item.model.js

const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class PackageItem extends Model {}

PackageItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  package_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'packages',
      key: 'id',
    },
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id',
    },
  },
  service_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'services',
      key: 'id',
    },
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'PackageItem',
  tableName: 'package_items',
  timestamps: false,
  underscored: true,
});

module.exports = PackageItem;