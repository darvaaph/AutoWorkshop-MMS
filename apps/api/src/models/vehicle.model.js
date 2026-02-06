// vehicle.model.js

const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Vehicle extends Model {}

Vehicle.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id',
    },
  },
  license_plate: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  current_km: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  next_service_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  next_service_km: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reminder_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reminder_sent_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reminder_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL path to vehicle image/photo for identification'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
}, {
  sequelize,
  modelName: 'Vehicle',
  tableName: 'vehicles',
  timestamps: true,
  underscored: true,
  paranoid: true,
});

module.exports = Vehicle;