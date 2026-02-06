'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('vehicles', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL path to vehicle image/photo for identification'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('vehicles', 'image_url');
  }
};
