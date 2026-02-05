'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add reminder tracking fields to vehicles table
    await queryInterface.addColumn('vehicles', 'reminder_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when reminder was last sent'
    });

    await queryInterface.addColumn('vehicles', 'reminder_sent_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who sent the reminder'
    });

    await queryInterface.addColumn('vehicles', 'reminder_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Notes about the reminder follow-up'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vehicles', 'reminder_sent_at');
    await queryInterface.removeColumn('vehicles', 'reminder_sent_by');
    await queryInterface.removeColumn('vehicles', 'reminder_notes');
  }
};
