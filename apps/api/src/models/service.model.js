// service.model.js

const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Service extends Model {}

Service.init({
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
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL path to service illustration image'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
}, {
  sequelize,
  modelName: 'Service',
  tableName: 'services',
  timestamps: true,
  paranoid: true,
  underscored: true,
});

module.exports = Service;