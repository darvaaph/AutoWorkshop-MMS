'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ServiceVariant extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ServiceVariant.init({
    service_id: DataTypes.INTEGER,
    vehicle_brand: DataTypes.STRING,
    vehicle_model: DataTypes.STRING,
    price_multiplier: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'ServiceVariant',
  });
  return ServiceVariant;
};