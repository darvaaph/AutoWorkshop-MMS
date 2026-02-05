'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // ============================================
        // 1. TABEL SETTINGS (Single Row Config)
        // ============================================
        await queryInterface.createTable('settings', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            shop_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
                defaultValue: 'Nama Bengkel',
            },
            shop_address: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            shop_phone: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },
            shop_logo_url: {
                type: Sequelize.STRING(500),
                allowNull: true,
            },
            printer_width: {
                type: Sequelize.ENUM('58mm', '80mm'),
                allowNull: false,
                defaultValue: '58mm',
            },
            footer_message: {
                type: Sequelize.STRING(500),
                allowNull: true,
                defaultValue: 'Terima kasih atas kunjungan Anda!',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Insert default settings row
        await queryInterface.bulkInsert('settings', [{
            shop_name: 'AutoWorkshop',
            shop_address: 'Jl. Contoh No. 123',
            shop_phone: '021-12345678',
            printer_width: '58mm',
            footer_message: 'Terima kasih atas kunjungan Anda!',
            created_at: new Date(),
            updated_at: new Date(),
        }]);

        // ============================================
        // 2. TABEL USERS (Authentication)
        // ============================================
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            username: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            password: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            role: {
                type: Sequelize.ENUM('ADMIN', 'CASHIER'),
                allowNull: false,
                defaultValue: 'CASHIER',
            },
            full_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Add index for username
        await queryInterface.addIndex('users', ['username'], {
            name: 'idx_users_username',
            unique: true,
        });

        // ============================================
        // 3. TABEL MECHANICS (Team)
        // ============================================
        await queryInterface.createTable('mechanics', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Add index for soft delete
        await queryInterface.addIndex('mechanics', ['deleted_at'], {
            name: 'idx_mechanics_deleted_at',
        });

        // ============================================
        // 4. TABEL PRODUCTS (Inventory - Barang)
        // ============================================
        await queryInterface.createTable('products', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            sku: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            category: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            image_url: {
                type: Sequelize.STRING(500),
                allowNull: true,
            },
            price_buy: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: 'Harga Beli / HPP / Modal',
            },
            price_sell: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: 'Harga Jual',
            },
            stock: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            min_stock_alert: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 5,
                comment: 'Batas minimum stok untuk alert',
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for products
        await queryInterface.addIndex('products', ['sku'], {
            name: 'idx_products_sku',
            unique: true,
        });
        await queryInterface.addIndex('products', ['category'], {
            name: 'idx_products_category',
        });
        await queryInterface.addIndex('products', ['deleted_at'], {
            name: 'idx_products_deleted_at',
        });

        // ============================================
        // 5. TABEL SERVICES (Jasa)
        // ============================================
        await queryInterface.createTable('services', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            price: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Add index for soft delete
        await queryInterface.addIndex('services', ['deleted_at'], {
            name: 'idx_services_deleted_at',
        });

        // ============================================
        // 6. TABEL PACKAGES (Bundling/Paket)
        // ============================================
        await queryInterface.createTable('packages', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            price: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: 'Harga jual paket bundling',
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Add index for soft delete
        await queryInterface.addIndex('packages', ['deleted_at'], {
            name: 'idx_packages_deleted_at',
        });
        await queryInterface.addIndex('packages', ['is_active'], {
            name: 'idx_packages_is_active',
        });

        // ============================================
        // 7. TABEL PACKAGE_ITEMS (Isi Paket)
        // ============================================
        await queryInterface.createTable('package_items', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            package_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'packages',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            product_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'products',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Nullable jika item adalah service',
            },
            service_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'services',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Nullable jika item adalah product',
            },
            qty: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for package_items
        await queryInterface.addIndex('package_items', ['package_id'], {
            name: 'idx_package_items_package_id',
        });
        await queryInterface.addIndex('package_items', ['product_id'], {
            name: 'idx_package_items_product_id',
        });
        await queryInterface.addIndex('package_items', ['service_id'], {
            name: 'idx_package_items_service_id',
        });

        // ============================================
        // 8. TABEL CUSTOMERS (Master Customer)
        // ============================================
        await queryInterface.createTable('customers', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false,
            },
            phone: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true,
            },
            address: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for customers
        await queryInterface.addIndex('customers', ['phone'], {
            name: 'idx_customers_phone',
            unique: true,
        });
        await queryInterface.addIndex('customers', ['deleted_at'], {
            name: 'idx_customers_deleted_at',
        });

        // ============================================
        // 9. TABEL VEHICLES (Kendaraan)
        // ============================================
        await queryInterface.createTable('vehicles', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            customer_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'customers',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            license_plate: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true,
            },
            brand: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            model: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            current_km: {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: 0,
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for vehicles
        await queryInterface.addIndex('vehicles', ['license_plate'], {
            name: 'idx_vehicles_license_plate',
            unique: true,
        });
        await queryInterface.addIndex('vehicles', ['customer_id'], {
            name: 'idx_vehicles_customer_id',
        });
        await queryInterface.addIndex('vehicles', ['deleted_at'], {
            name: 'idx_vehicles_deleted_at',
        });
    },

    async down(queryInterface, Sequelize) {
        // Drop tables in reverse order (karena foreign key constraints)
        await queryInterface.dropTable('vehicles');
        await queryInterface.dropTable('customers');
        await queryInterface.dropTable('package_items');
        await queryInterface.dropTable('packages');
        await queryInterface.dropTable('services');
        await queryInterface.dropTable('products');
        await queryInterface.dropTable('mechanics');
        await queryInterface.dropTable('users');
        await queryInterface.dropTable('settings');
    }
};
