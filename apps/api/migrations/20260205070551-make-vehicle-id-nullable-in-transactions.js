'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Make vehicle_id nullable using raw SQL
    await queryInterface.sequelize.query(`
      ALTER TABLE transactions
      MODIFY COLUMN vehicle_id INT(11) NULL;
    `);
  },

  async down (queryInterface, Sequelize) {
    // Revert: make vehicle_id not nullable
    await queryInterface.sequelize.query(`
      ALTER TABLE transactions
      MODIFY COLUMN vehicle_id INT(11) NOT NULL;
    `);
  }
};
