'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add next_service_date column to vehicles
        await queryInterface.addColumn('vehicles', 'next_service_date', {
            type: Sequelize.DATEONLY,
            allowNull: true,
            comment: 'Jadwal servis berikutnya (Waktu)',
        });

        // Add next_service_km column to vehicles
        await queryInterface.addColumn('vehicles', 'next_service_km', {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Jadwal servis berikutnya (Jarak KM)',
        });

        // Add index for service reminder queries
        await queryInterface.addIndex('vehicles', ['next_service_date'], {
            name: 'idx_vehicles_next_service_date',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('vehicles', 'idx_vehicles_next_service_date');
        await queryInterface.removeColumn('vehicles', 'next_service_km');
        await queryInterface.removeColumn('vehicles', 'next_service_date');
    }
};
