'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================
        // 1. SETTINGS (Update existing or insert)
        // ============================================
        // First, clear existing settings
        await queryInterface.bulkDelete('settings', null, {});
        
        await queryInterface.bulkInsert('settings', [{
            id: 1,
            shop_name: 'AutoWorkshop Premium Cars',
            shop_address: 'Jl. Raya Otomotif No. 88, Jakarta Selatan',
            shop_phone: '021-7654321',
            shop_logo_url: '/images/logo-autoworkshop.png',
            printer_width: '80mm',
            footer_message: 'Terima kasih telah mempercayakan kendaraan Anda kepada kami. Berkendara dengan aman!',
            created_at: now,
            updated_at: now,
        }]);

        console.log('✅ Settings seeded');

        // ============================================
        // 2. USERS (Admin & Cashier)
        // ============================================
        const hashedPassword = await bcrypt.hash('password123', 10);

        await queryInterface.bulkInsert('users', [
            {
                id: 1,
                username: 'admin',
                password: hashedPassword,
                role: 'ADMIN',
                full_name: 'Administrator Bengkel',
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                username: 'kasir',
                password: hashedPassword,
                role: 'CASHIER',
                full_name: 'Kasir Utama',
                created_at: now,
                updated_at: now,
            },
        ]);

        console.log('✅ Users seeded (admin/kasir - password: password123)');

        // ============================================
        // 3. MECHANICS (Tim Mekanik)
        // ============================================
        await queryInterface.bulkInsert('mechanics', [
            {
                id: 1,
                name: 'Budi Santoso',
                is_active: true,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                name: 'Rahmat Hidayat',
                is_active: true,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                name: 'Agus Setiawan',
                is_active: true,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
        ]);

        console.log('✅ Mechanics seeded');

        // ============================================
        // 4. CUSTOMERS (Pelanggan)
        // ============================================
        await queryInterface.bulkInsert('customers', [
            {
                id: 1,
                name: 'Pak Heru Wijaya',
                phone: '08123456789',
                address: 'Jl. Kebon Jeruk No. 45, Jakarta Barat',
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                name: 'Bu Sarah Andini',
                phone: '08567891234',
                address: 'Jl. Dago Asri No. 12, Bandung',
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                name: 'Pak Joko Susanto',
                phone: '08789123456',
                address: 'Jl. Sudirman No. 100, Jakarta Pusat',
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
        ]);

        console.log('✅ Customers seeded');

        // ============================================
        // 5. VEHICLES (Kendaraan Pelanggan)
        // ============================================
        // Calculate next service dates (3 months from now)
        const nextServiceDate = new Date(now);
        nextServiceDate.setMonth(nextServiceDate.getMonth() + 3);
        const nextServiceDateStr = nextServiceDate.toISOString().split('T')[0];

        await queryInterface.bulkInsert('vehicles', [
            {
                id: 1,
                customer_id: 1, // Pak Heru
                license_plate: 'B 1234 CD',
                brand: 'Toyota',
                model: 'Avanza 1.3 G MT 2018',
                current_km: 50000,
                next_service_date: nextServiceDateStr,
                next_service_km: 52000, // +2000 KM
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                customer_id: 2, // Bu Sarah
                license_plate: 'D 5678 EF',
                brand: 'Honda',
                model: 'Brio Satya E CVT 2021',
                current_km: 15000,
                next_service_date: nextServiceDateStr,
                next_service_km: 17000, // +2000 KM
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                customer_id: 1, // Pak Heru (punya 2 mobil)
                license_plate: 'B 9876 XY',
                brand: 'Mitsubishi',
                model: 'Xpander Ultimate AT 2020',
                current_km: 35000,
                next_service_date: null,
                next_service_km: null,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 4,
                customer_id: 3, // Pak Joko
                license_plate: 'B 4321 AB',
                brand: 'Suzuki',
                model: 'Ertiga GX MT 2019',
                current_km: 42000,
                next_service_date: null,
                next_service_km: null,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
        ]);

        console.log('✅ Vehicles seeded');

        // ============================================
        // 6. PRODUCTS (Sparepart Mobil)
        // ============================================
        await queryInterface.bulkInsert('products', [
            {
                id: 1,
                sku: 'OLI-SHELL-HX7-4L',
                name: 'Oli Shell Helix HX7 10W-40 (4 Liter)',
                category: 'Oli Mesin',
                image_url: '/images/products/shell-hx7.jpg',
                price_buy: 250000.00,
                price_sell: 350000.00,
                stock: 20,
                min_stock_alert: 5,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                sku: 'FILTER-OLI-TOYOTA-AVZ',
                name: 'Filter Oli Toyota Avanza/Xenia Original',
                category: 'Filter',
                image_url: '/images/products/filter-oli-toyota.jpg',
                price_buy: 25000.00,
                price_sell: 45000.00,
                stock: 50,
                min_stock_alert: 10,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                sku: 'BRAKE-PAD-HONDA-BRIO-F',
                name: 'Kampas Rem Depan (Brake Pad) Honda Brio',
                category: 'Rem',
                image_url: '/images/products/brake-pad-brio.jpg',
                price_buy: 300000.00,
                price_sell: 450000.00,
                stock: 10,
                min_stock_alert: 3,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 4,
                sku: 'BRAKE-FLUID-PRESTONE-300',
                name: 'Minyak Rem Prestone DOT 3 (300ml)',
                category: 'Cairan',
                image_url: '/images/products/prestone-brake.jpg',
                price_buy: 30000.00,
                price_sell: 50000.00,
                stock: 15,
                min_stock_alert: 5,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 5,
                sku: 'OLI-CASTROL-GTX-4L',
                name: 'Oli Castrol GTX 15W-40 (4 Liter)',
                category: 'Oli Mesin',
                image_url: '/images/products/castrol-gtx.jpg',
                price_buy: 220000.00,
                price_sell: 320000.00,
                stock: 15,
                min_stock_alert: 5,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 6,
                sku: 'FILTER-UDARA-TOYOTA-AVZ',
                name: 'Filter Udara Toyota Avanza/Xenia',
                category: 'Filter',
                image_url: '/images/products/filter-udara-toyota.jpg',
                price_buy: 45000.00,
                price_sell: 75000.00,
                stock: 25,
                min_stock_alert: 8,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 7,
                sku: 'BUSI-NGK-IRIDIUM-4PCS',
                name: 'Busi NGK Iridium (Set 4 pcs)',
                category: 'Pengapian',
                image_url: '/images/products/busi-ngk.jpg',
                price_buy: 280000.00,
                price_sell: 400000.00,
                stock: 12,
                min_stock_alert: 4,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 8,
                sku: 'COOLANT-TOYOTA-1L',
                name: 'Air Radiator Toyota Super Long Life Coolant (1L)',
                category: 'Cairan',
                image_url: '/images/products/coolant-toyota.jpg',
                price_buy: 85000.00,
                price_sell: 120000.00,
                stock: 20,
                min_stock_alert: 6,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 9,
                sku: 'WIPER-BLADE-BOSCH-20',
                name: 'Wiper Blade Bosch Advantage 20 inch',
                category: 'Aksesoris',
                image_url: '/images/products/wiper-bosch.jpg',
                price_buy: 65000.00,
                price_sell: 95000.00,
                stock: 18,
                min_stock_alert: 5,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 10,
                sku: 'ACCU-GS-ASTRA-45AH',
                name: 'Aki GS Astra Maintenance Free 45 AH',
                category: 'Kelistrikan',
                image_url: '/images/products/aki-gs-astra.jpg',
                price_buy: 750000.00,
                price_sell: 950000.00,
                stock: 5,
                min_stock_alert: 2,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
        ]);

        console.log('✅ Products seeded (10 sparepart mobil)');

        // ============================================
        // 7. SERVICES (Jasa Bengkel)
        // ============================================
        await queryInterface.bulkInsert('services', [
            {
                id: 1,
                name: 'Jasa Ganti Oli Mesin',
                price: 50000.00,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                name: 'Tune Up Mesin (Carbon Cleaner + Cek Kelistrikan)',
                price: 250000.00,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                name: 'Service Rem 4 Roda (Bongkar, Bersihkan, Setel)',
                price: 150000.00,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 4,
                name: 'Spooring + Balancing 4 Roda',
                price: 200000.00,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 5,
                name: 'Ganti Kampas Rem (Depan/Belakang)',
                price: 75000.00,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 6,
                name: 'Flush Radiator + Ganti Coolant',
                price: 100000.00,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 7,
                name: 'Ganti Aki (Termasuk Cek Kelistrikan)',
                price: 50000.00,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 8,
                name: 'Scan ECU + Diagnosa Kerusakan',
                price: 100000.00,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
        ]);

        console.log('✅ Services seeded (8 jasa bengkel)');

        // ============================================
        // 8. PACKAGES (Paket Bundling)
        // ============================================
        await queryInterface.bulkInsert('packages', [
            {
                id: 1,
                name: 'Paket Ganti Oli Hemat Avanza',
                price: 420000.00, // Lebih murah dari 350k + 45k + 50k = 445k
                description: 'Paket hemat ganti oli untuk Toyota Avanza/Xenia. Termasuk Oli Shell Helix HX7 4L, Filter Oli Original, dan Jasa Ganti.',
                is_active: true,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                name: 'Paket Service Berkala 10.000 KM',
                price: 550000.00,
                description: 'Paket service berkala standar. Termasuk ganti oli, filter oli, filter udara, cek rem, dan tune up ringan.',
                is_active: true,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                name: 'Paket Tune Up Komplit',
                price: 750000.00,
                description: 'Tune up lengkap dengan carbon cleaner, ganti busi, cek kelistrikan, dan scan ECU.',
                is_active: true,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
            {
                id: 4,
                name: 'Paket Service Rem Total',
                price: 650000.00,
                description: 'Service rem menyeluruh 4 roda termasuk ganti kampas rem depan dan minyak rem.',
                is_active: true,
                deleted_at: null,
                created_at: now,
                updated_at: now,
            },
        ]);

        console.log('✅ Packages seeded (4 paket bundling)');

        // ============================================
        // 9. PACKAGE ITEMS (Isi Paket)
        // ============================================
        await queryInterface.bulkInsert('package_items', [
            // Paket 1: Ganti Oli Hemat Avanza
            {
                id: 1,
                package_id: 1,
                product_id: 1, // Oli Shell Helix HX7 4L
                service_id: null,
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                package_id: 1,
                product_id: 2, // Filter Oli Toyota
                service_id: null,
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                package_id: 1,
                product_id: null,
                service_id: 1, // Jasa Ganti Oli Mesin
                qty: 1,
                created_at: now,
                updated_at: now,
            },

            // Paket 2: Service Berkala 10.000 KM
            {
                id: 4,
                package_id: 2,
                product_id: 1, // Oli Shell Helix
                service_id: null,
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 5,
                package_id: 2,
                product_id: 2, // Filter Oli
                service_id: null,
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 6,
                package_id: 2,
                product_id: 6, // Filter Udara
                service_id: null,
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 7,
                package_id: 2,
                product_id: null,
                service_id: 1, // Jasa Ganti Oli
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 8,
                package_id: 2,
                product_id: null,
                service_id: 2, // Tune Up
                qty: 1,
                created_at: now,
                updated_at: now,
            },

            // Paket 3: Tune Up Komplit
            {
                id: 9,
                package_id: 3,
                product_id: 7, // Busi NGK Iridium
                service_id: null,
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 10,
                package_id: 3,
                product_id: null,
                service_id: 2, // Tune Up Mesin
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 11,
                package_id: 3,
                product_id: null,
                service_id: 8, // Scan ECU
                qty: 1,
                created_at: now,
                updated_at: now,
            },

            // Paket 4: Service Rem Total
            {
                id: 12,
                package_id: 4,
                product_id: 3, // Kampas Rem Honda Brio
                service_id: null,
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 13,
                package_id: 4,
                product_id: 4, // Minyak Rem Prestone
                service_id: null,
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 14,
                package_id: 4,
                product_id: null,
                service_id: 3, // Service Rem 4 Roda
                qty: 1,
                created_at: now,
                updated_at: now,
            },
            {
                id: 15,
                package_id: 4,
                product_id: null,
                service_id: 5, // Ganti Kampas Rem
                qty: 1,
                created_at: now,
                updated_at: now,
            },
        ]);

        console.log('✅ Package Items seeded');

        // ============================================
        // SUMMARY
        // ============================================
        console.log('\n========================================');
        console.log('🚗 DEMO DATA BENGKEL MOBIL - SEEDED!');
        console.log('========================================');
        console.log('📋 Settings: 1 record (AutoWorkshop Premium Cars)');
        console.log('👤 Users: 2 records (admin, kasir)');
        console.log('🔧 Mechanics: 3 records');
        console.log('👥 Customers: 3 records');
        console.log('🚙 Vehicles: 4 records');
        console.log('📦 Products: 10 sparepart mobil');
        console.log('🛠️  Services: 8 jasa bengkel');
        console.log('📦 Packages: 4 paket bundling');
        console.log('📋 Package Items: 15 items');
        console.log('========================================');
        console.log('🔐 Login: admin/password123 atau kasir/password123');
        console.log('========================================\n');
    },

    async down(queryInterface, Sequelize) {
        // Delete in reverse order due to foreign key constraints
        await queryInterface.bulkDelete('package_items', null, {});
        await queryInterface.bulkDelete('packages', null, {});
        await queryInterface.bulkDelete('services', null, {});
        await queryInterface.bulkDelete('products', null, {});
        await queryInterface.bulkDelete('vehicles', null, {});
        await queryInterface.bulkDelete('customers', null, {});
        await queryInterface.bulkDelete('mechanics', null, {});
        await queryInterface.bulkDelete('users', null, {});
        // Re-insert default settings
        await queryInterface.bulkDelete('settings', null, {});
        await queryInterface.bulkInsert('settings', [{
            id: 1,
            shop_name: 'AutoWorkshop',
            shop_address: 'Jl. Contoh No. 123',
            shop_phone: '021-12345678',
            printer_width: '58mm',
            footer_message: 'Terima kasih atas kunjungan Anda!',
            created_at: new Date(),
            updated_at: new Date(),
        }]);

        console.log('✅ Demo data rolled back');
    }
};
