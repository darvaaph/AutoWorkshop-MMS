'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('services', 'image_url', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL path to service illustration image'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('services', 'image_url');
  }
};
