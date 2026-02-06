'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('customers', 'photo_url', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL path to customer photo for identification'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('customers', 'photo_url');
  }
};
