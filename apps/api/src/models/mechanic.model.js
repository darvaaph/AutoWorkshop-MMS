// Mechanic model definition for Sequelize
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Mechanic extends Model {}

Mechanic.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  photo_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL path to mechanic profile photo'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Mechanic phone number'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mechanic residential address'
  },
  emergency_contact: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Emergency contact information'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
}, {
  sequelize,
  modelName: 'Mechanic',
  tableName: 'mechanics',
  timestamps: true,
  underscored: true,
  paranoid: true,
});

module.exports = Mechanic;