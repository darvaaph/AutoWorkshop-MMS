'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add is_active column to users table
        await queryInterface.addColumn('users', 'is_active', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        });

        // Update existing users to be active
        await queryInterface.sequelize.query(
            'UPDATE users SET is_active = 1'
        );

        console.log('✅ Added is_active column to users table');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('users', 'is_active');
    }
};
