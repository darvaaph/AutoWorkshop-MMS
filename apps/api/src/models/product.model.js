// Product model definition for Sequelize
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Product extends Model {}

Product.init({
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price_buy: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  price_sell: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  min_stock_alert: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
}, {
  sequelize,
  modelName: 'Product',
  tableName: 'products',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deleted_at',
});

// Export the Product model
module.exports = Product;