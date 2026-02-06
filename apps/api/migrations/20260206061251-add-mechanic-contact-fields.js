'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('mechanics', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Mechanic phone number'
    });

    await queryInterface.addColumn('mechanics', 'address', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Mechanic residential address'
    });

    await queryInterface.addColumn('mechanics', 'emergency_contact', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Emergency contact information'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('mechanics', 'emergency_contact');
    await queryInterface.removeColumn('mechanics', 'address');
    await queryInterface.removeColumn('mechanics', 'phone');
  }
};
