'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add REFUND to payment_method enum
    await queryInterface.sequelize.query(`
      ALTER TABLE payments
      MODIFY COLUMN payment_method ENUM('CASH','DEBIT','CREDIT','TRANSFER','QRIS','OTHER','REFUND')
      NOT NULL;
    `);
  },

  async down (queryInterface, Sequelize) {
    // Remove REFUND from payment_method enum
    await queryInterface.sequelize.query(`
      ALTER TABLE payments
      MODIFY COLUMN payment_method ENUM('CASH','DEBIT','CREDIT','TRANSFER','QRIS','OTHER')
      NOT NULL;
    `);
  }
};
