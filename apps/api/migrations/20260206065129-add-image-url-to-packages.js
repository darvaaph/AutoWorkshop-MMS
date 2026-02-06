'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('packages', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL path to package banner/promotional image'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('packages', 'image_url');
  }
};
