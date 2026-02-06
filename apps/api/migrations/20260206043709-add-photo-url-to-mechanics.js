'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('mechanics', 'photo_url', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL path to mechanic profile photo'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('mechanics', 'photo_url');
  }
};
