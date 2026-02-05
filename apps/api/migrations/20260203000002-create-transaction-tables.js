'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // ============================================
        // 1. TABEL TRANSACTIONS (Header Transaksi)
        // ============================================
        await queryInterface.createTable('transactions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
                comment: 'Kasir/Admin yang membuat transaksi',
            },
            mechanic_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'mechanics',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Mekanik yang menangani (opsional)',
            },
            vehicle_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'vehicles',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'Kendaraan yang diservis (opsional untuk penjualan langsung)',
            },
            date: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            status: {
                type: Sequelize.ENUM('PENDING', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'),
                allowNull: false,
                defaultValue: 'PENDING',
            },
            subtotal: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: 'Total sebelum diskon global',
            },
            discount_amount: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: 'Potongan/diskon global transaksi',
            },
            total_amount: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: 'Grand total (subtotal - discount)',
            },
            current_km: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Kilometer kendaraan saat transaksi',
            },
            notes: {
                type: Sequelize.TEXT,
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

        // Add indexes for transactions
        await queryInterface.addIndex('transactions', ['date'], {
            name: 'idx_transactions_date',
        });
        await queryInterface.addIndex('transactions', ['status'], {
            name: 'idx_transactions_status',
        });
        await queryInterface.addIndex('transactions', ['user_id'], {
            name: 'idx_transactions_user_id',
        });
        await queryInterface.addIndex('transactions', ['vehicle_id'], {
            name: 'idx_transactions_vehicle_id',
        });
        await queryInterface.addIndex('transactions', ['mechanic_id'], {
            name: 'idx_transactions_mechanic_id',
        });

        // ============================================
        // 2. TABEL TRANSACTION_ITEMS (Polymorphic Detail)
        // ============================================
        await queryInterface.createTable('transaction_items', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            transaction_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'transactions',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            item_type: {
                type: Sequelize.ENUM('PRODUCT', 'SERVICE', 'PACKAGE', 'EXTERNAL'),
                allowNull: false,
                comment: 'Tipe item: produk, jasa, paket, atau eksternal',
            },
            item_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'ID referensi ke tabel sesuai item_type (TANPA FK karena polimorfik)',
            },
            item_name: {
                type: Sequelize.STRING(255),
                allowNull: false,
                comment: 'Snapshot nama item saat transaksi (untuk history)',
            },
            qty: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            base_price: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                comment: 'Harga asli per unit (sebelum diskon)',
            },
            discount_amount: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: 'Nilai diskon per unit (Rp)',
            },
            sell_price: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                comment: 'Harga deal per unit (base_price - discount_amount)',
            },
            cost_price: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: true,
                defaultValue: 0.00,
                comment: 'HPP per unit (untuk kalkulasi profit)',
            },
            vendor_name: {
                type: Sequelize.STRING(255),
                allowNull: true,
                comment: 'Nama vendor (khusus item EXTERNAL)',
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

        // Add indexes for transaction_items
        await queryInterface.addIndex('transaction_items', ['transaction_id'], {
            name: 'idx_transaction_items_transaction_id',
        });
        // Composite index untuk polymorphic lookup
        await queryInterface.addIndex('transaction_items', ['item_type', 'item_id'], {
            name: 'idx_transaction_items_polymorphic',
        });

        // ============================================
        // 3. TABEL PAYMENTS (Pembayaran)
        // ============================================
        await queryInterface.createTable('payments', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            transaction_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'transactions',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            amount: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                comment: 'Jumlah pembayaran (negatif jika refund)',
            },
            payment_method: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: 'Metode: CASH, TRANSFER, QRIS, DEBIT, CREDIT, dll',
            },
            reference_number: {
                type: Sequelize.STRING(100),
                allowNull: true,
                comment: 'Nomor referensi (untuk transfer/kartu)',
            },
            date: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

        // Add indexes for payments
        await queryInterface.addIndex('payments', ['transaction_id'], {
            name: 'idx_payments_transaction_id',
        });
        await queryInterface.addIndex('payments', ['date'], {
            name: 'idx_payments_date',
        });
        await queryInterface.addIndex('payments', ['payment_method'], {
            name: 'idx_payments_method',
        });

        // ============================================
        // 4. TABEL INVENTORY_LOGS (Audit Stok)
        // ============================================
        await queryInterface.createTable('inventory_logs', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            product_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'products',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            type: {
                type: Sequelize.ENUM('IN', 'OUT', 'ADJUSTMENT'),
                allowNull: false,
                comment: 'IN=Masuk, OUT=Keluar, ADJUSTMENT=Koreksi',
            },
            qty: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'Jumlah perubahan (positif/negatif)',
            },
            stock_before: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Stok sebelum perubahan',
            },
            stock_after: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Stok setelah perubahan',
            },
            reference_id: {
                type: Sequelize.STRING(100),
                allowNull: true,
                comment: 'Referensi: No Transaksi, No PO, dll',
            },
            reference_type: {
                type: Sequelize.STRING(50),
                allowNull: true,
                comment: 'Tipe referensi: TRANSACTION, PURCHASE, MANUAL, dll',
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            created_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for inventory_logs
        await queryInterface.addIndex('inventory_logs', ['product_id'], {
            name: 'idx_inventory_logs_product_id',
        });
        await queryInterface.addIndex('inventory_logs', ['type'], {
            name: 'idx_inventory_logs_type',
        });
        await queryInterface.addIndex('inventory_logs', ['created_at'], {
            name: 'idx_inventory_logs_created_at',
        });
        await queryInterface.addIndex('inventory_logs', ['reference_id'], {
            name: 'idx_inventory_logs_reference_id',
        });

        // ============================================
        // 5. TABEL EXPENSES (Pengeluaran Bengkel)
        // ============================================
        await queryInterface.createTable('expenses', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
                comment: 'User yang mencatat pengeluaran',
            },
            category: {
                type: Sequelize.ENUM('SALARY', 'UTILITIES', 'PURCHASING', 'OTHER'),
                allowNull: false,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            amount: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
            },
            date: {
                type: Sequelize.DATEONLY,
                allowNull: false,
            },
            receipt_url: {
                type: Sequelize.STRING(500),
                allowNull: true,
                comment: 'URL bukti/struk pengeluaran',
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

        // Add indexes for expenses
        await queryInterface.addIndex('expenses', ['user_id'], {
            name: 'idx_expenses_user_id',
        });
        await queryInterface.addIndex('expenses', ['category'], {
            name: 'idx_expenses_category',
        });
        await queryInterface.addIndex('expenses', ['date'], {
            name: 'idx_expenses_date',
        });

        // ============================================
        // 6. TABEL AUDIT_LOGS (Security & Tracking)
        // ============================================
        await queryInterface.createTable('audit_logs', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'User yang melakukan aksi (null jika system)',
            },
            action: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: 'Aksi: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, dll',
            },
            table_name: {
                type: Sequelize.STRING(100),
                allowNull: false,
                comment: 'Nama tabel yang terpengaruh',
            },
            record_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'ID record yang terpengaruh',
            },
            old_values: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: 'Nilai sebelum perubahan',
            },
            new_values: {
                type: Sequelize.JSON,
                allowNull: true,
                comment: 'Nilai setelah perubahan',
            },
            ip_address: {
                type: Sequelize.STRING(45),
                allowNull: true,
                comment: 'IP Address user (IPv4/IPv6)',
            },
            user_agent: {
                type: Sequelize.STRING(500),
                allowNull: true,
                comment: 'Browser/device info',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Add indexes for audit_logs
        await queryInterface.addIndex('audit_logs', ['user_id'], {
            name: 'idx_audit_logs_user_id',
        });
        await queryInterface.addIndex('audit_logs', ['action'], {
            name: 'idx_audit_logs_action',
        });
        await queryInterface.addIndex('audit_logs', ['table_name'], {
            name: 'idx_audit_logs_table_name',
        });
        await queryInterface.addIndex('audit_logs', ['created_at'], {
            name: 'idx_audit_logs_created_at',
        });
        // Composite index untuk lookup by table + record
        await queryInterface.addIndex('audit_logs', ['table_name', 'record_id'], {
            name: 'idx_audit_logs_table_record',
        });
    },

    async down(queryInterface, Sequelize) {
        // Drop tables in reverse order (karena foreign key constraints)
        await queryInterface.dropTable('audit_logs');
        await queryInterface.dropTable('expenses');
        await queryInterface.dropTable('inventory_logs');
        await queryInterface.dropTable('payments');
        await queryInterface.dropTable('transaction_items');
        await queryInterface.dropTable('transactions');
    }
};
