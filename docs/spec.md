# WORKSHOP MANAGEMENT SYSTEM (WMS) - TECHNICAL SPECIFICATION (V5.6 - WITH SERVICE REMINDER)

## 1. PROJECT OVERVIEW
**Name:** AutoWorkshop MMS  
**Type:** Full-stack Point of Sales & Management System.  
**Core Objective:** Inventory, POS, Finance, Audit Trails, Printing, and Promo/Bundling Support with Precise Accounting.  
**Tech Stack:** Node.js (Express), Sequelize (MySQL), JWT Authentication, Multer for File Uploads, Soft Deletes for Data Integrity.

---

## 2. DATABASE SCHEMA (ERD BLUEPRINT)

### A. System Configuration
**1. settings** (Single Row Table)
- `id`: PK, Integer (Auto Increment)
- `shop_name`: String (e.g., "AutoWorkshop Premium Cars")
- `shop_address`: Text
- `shop_phone`: String
- `shop_logo_url`: String (Nullable) -- URL Logo Bengkel
- `printer_width`: Enum ('58mm', '80mm') -- Ukuran Kertas Thermal
- `footer_message`: String
- `created_at`: Datetime, `updated_at`: Datetime

### B. Authentication & Security
**2. users**
- `id`: PK, Integer (Auto Increment)
- `username`: String (Unique)
- `password`: String (Hashed - bcrypt)
- `role`: Enum ('ADMIN', 'CASHIER')
- `full_name`: String
- `created_at`: Datetime, `updated_at`: Datetime

**3. token_blacklists** (JWT Blacklist for Logout)
- `id`: PK, Integer (Auto Increment)
- `token`: String (Unique)
- `created_at`: Datetime

### C. Team & Mechanics
**4. mechanics**
- `id`: PK, Integer (Auto Increment)
- `name`: String
- `phone`: String (Nullable)
- `specialization`: String (Nullable)
- `is_active`: Boolean (Default: true)
- `photo_url`: String (Nullable) -- URL Foto Mekanik
- `deleted_at`: Datetime (Soft Delete - Indexed)
- `created_at`: Datetime, `updated_at`: Datetime

### D. Master Data (Produk & Paket)
**5. products** (Barang Satuan)
- `id`: PK, Integer (Auto Increment)
- `sku`: String (Unique, Indexed)
- `name`: String
- `image_url`: String (Nullable)
- `category`: String
- `price_buy`: Decimal (HPP/Modal)
- `price_sell`: Decimal (Harga Jual)
- `stock`: Integer
- `min_stock_alert`: Integer
- `deleted_at`: Datetime (Soft Delete - Indexed)
- `created_at`: Datetime, `updated_at`: Datetime

**6. services** (Jasa Satuan)
- `id`: PK, Integer (Auto Increment)
- `name`: String
- `price`: Decimal
- `image_url`: String (Nullable)
- `deleted_at`: Datetime (Soft Delete)
- `created_at`: Datetime, `updated_at`: Datetime

**7. packages** (Paket Promo/Bundling)
- `id`: PK, Integer (Auto Increment)
- `name`: String
- `price`: Decimal (Harga Jual Paket)
- `description`: Text
- `is_active`: Boolean (Default: true)
- `image_url`: String (Nullable) -- URL Banner Paket
- `deleted_at`: Datetime (Soft Delete)
- `created_at`: Datetime, `updated_at`: Datetime

**8. package_items** (Isi Paket)
- `id`: PK, Integer (Auto Increment)
- `package_id`: FK -> packages.id
- `product_id`: FK -> products.id (Nullable if service)
- `service_id`: FK -> services.id (Nullable if product)
- `qty`: Integer (Jumlah barang dalam paket)
- `created_at`: Datetime, `updated_at`: Datetime

### E. Master Customer & Vehicle
**9. customers**
- `id`: PK, Integer (Auto Increment)
- `name`: String
- `phone`: String (Unique, Indexed)
- `address`: Text
- `deleted_at`: Datetime (Soft Delete - Indexed)
- `created_at`: Datetime, `updated_at`: Datetime

**10. vehicles**
- `id`: PK, Integer (Auto Increment)
- `customer_id`: FK -> customers.id
- `license_plate`: String (Unique, Indexed)
- `brand`: String
- `model`: String
- `year`: Integer (Nullable)
- `color`: String (Nullable)
- `transmission`: Enum ('MT', 'AT', 'CVT') (Nullable)
- `current_km`: Integer
- `next_service_date`: Date (Nullable) -- Jadwal servis berikutnya (Waktu)
- `next_service_km`: Integer (Nullable) -- Jadwal servis berikutnya (Jarak)
- `reminder_sent_at`: Datetime (Nullable) -- Timestamp reminder terakhir dikirim
- `reminder_sent_by`: FK -> users.id (Nullable) -- User yang mengirim reminder
- `reminder_notes`: Text (Nullable) -- Catatan follow-up reminder
- `image_url`: String (Nullable) -- URL Foto Kendaraan
- `deleted_at`: Datetime (Soft Delete)
- `created_at`: Datetime, `updated_at`: Datetime

### F. Transactions & POS
**11. transactions**
- `id`: PK, Integer (Auto Increment)
- `vehicle_id`: FK -> vehicles.id (Nullable)
- `user_id`: FK -> users.id
- `mechanic_id`: FK -> mechanics.id (Nullable)
- `date`: Datetime (Indexed)
- `status`: Enum ('PENDING', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED')
- `subtotal`: Decimal -- Total sebelum diskon
- `discount_amount`: Decimal -- Potongan Global
- `total_amount`: Decimal -- (Subtotal - Discount)
- `current_km`: Integer (Nullable)
- `notes`: Text (Nullable)
- `deleted_at`: Datetime (Soft Delete)
- `created_at`: Datetime, `updated_at`: Datetime

**12. transaction_items**
- `id`: PK, Integer (Auto Increment)
- `transaction_id`: FK -> transactions.id
- `item_type`: Enum ('PRODUCT', 'SERVICE', 'PACKAGE', 'EXTERNAL')
- `item_id`: Integer
- `item_name`: String (Snapshot Name)
- `qty`: Integer
- `base_price`: Decimal -- Harga Asli (Sebelum Diskon)
- `discount_amount`: Decimal -- Nilai Diskon per unit (Rp)
- `sell_price`: Decimal -- Harga Akhir (Base Price - Discount)
- `cost_price`: Decimal (Nullable) -- HPP per unit untuk kalkulasi profit
- `vendor_name`: String (Nullable) -- Nama Vendor (khusus EXTERNAL)
- `created_at`: Datetime, `updated_at`: Datetime

**13. payments**
- `id`: PK, Integer (Auto Increment)
- `transaction_id`: FK -> transactions.id
- `user_id`: FK -> users.id
- `amount`: Decimal (Negatif jika Refund)
- `payment_method`: Enum ('CASH', 'TRANSFER', 'DEBIT', 'CREDIT', 'QRIS', 'OTHER')
- `reference_number`: String (Nullable)
- `date`: Datetime
- `created_at`: Datetime, `updated_at`: Datetime

### G. Logs & Finance
**14. inventory_logs**
- `id`: PK, Integer (Auto Increment)
- `product_id`: FK -> products.id
- `user_id`: FK -> users.id (Nullable)
- `type`: Enum ('IN', 'OUT', 'ADJUSTMENT')
- `qty`: Integer
- `stock_before`: Integer (Nullable)
- `stock_after`: Integer (Nullable)
- `price_per_unit`: Decimal (Nullable)
- `reference_id`: String (Nullable)
- `reference_type`: String (Nullable)
- `notes`: Text (Nullable)
- `created_at`: Datetime

**15. expenses**
- `id`: PK, Integer (Auto Increment)
- `user_id`: FK -> users.id
- `category`: Enum ('SALARY', 'UTILITIES', 'PURCHASING', 'OTHER')
- `description`: Text (Nullable)
- `amount`: Decimal
- `date`: Date
- `receipt_url`: String (Nullable) -- URL Bukti Pengeluaran
- `created_at`: Datetime, `updated_at`: Datetime

**16. audit_logs**
- `id`: PK, Integer (Auto Increment)
- `user_id`: FK -> users.id (Nullable)
- `action`: String (e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN')
- `table_name`: String
- `record_id`: Integer (Nullable)
- `old_values`: JSON (Nullable)
- `new_values`: JSON (Nullable)
- `ip_address`: String (Nullable)
- `user_agent`: String (Nullable)
- `created_at`: Datetime

---

## 3. BUSINESS LOGIC RULES

### A. Accounting Standards (Handling HPP)
- **Metode HPP:** Sistem menggunakan metode **PERPETUAL MOVING AVERAGE**.
- **Rumus Restock:** Saat input stok masuk (`POST /inventory/in`), update `price_buy` master produk menggunakan rumus:
  $$NewPrice = \frac{(CurrentStock \times OldPrice) + (IncomingQty \times IncomingPrice)}{CurrentStock + IncomingQty}$$
- **Tujuan:** Agar nilai aset dan HPP selalu akurat walau harga beli dari supplier naik-turun.

### B. Package/Bundling Logic (Promo)
1. **Dynamic Margin Monitoring:**
   - Laporan Keuangan memberi flag/alert jika Paket memiliki margin < 10% (harga modal komponen naik tapi harga jual paket belum disesuaikan).
2. **Strict Stock Validation:**
   - Sebelum Paket dijual, sistem wajib cek stok semua komponen. Jika ada komponen stok kurang, transaksi gagal.
3. **Inventory Deduction:**
   - Saat transaksi, kurangi stok komponen sesuai `package_items`. Log Inventory: "Out via Package [Nama Paket]".
4. **COGS Calculation:**
   - HPP Paket = SUM(Qty Komponen × Average Buy Price Komponen saat transaksi).

### C. Data Integrity (Polymorphic Safety)
- **Manual Relation Check:** Karena `transaction_items` polimorfik, back-end validasi wajib cek ID target sebelum simpan. Jika tidak ditemukan, error.
- **Soft Delete Safety:** Semua master data menggunakan soft delete (`deleted_at`) untuk jaga integritas history transaksi.

### D. Transaction / POS Logic
- **Atomic Transactions:** Semua operasi transaksi menggunakan Sequelize Transaction (ACID). Jika gagal, rollback semua (data transaksi, stok, log).
- **Stock Validation:** Produk/Paket tidak bisa dijual jika stok < qty. Validasi ketat sebelum commit.
- **Price Override:** Hanya item tipe `SERVICE` yang boleh diubah harga oleh kasir (untuk mobil mewah/sulit). Item `PRODUCT` wajib ikut `price_sell` database.
- **External Vendor:** Item tipe `EXTERNAL` untuk jasa/vendor luar, harga manual, tidak kurangi stok internal.
- **Service Reminder:** Saat transaksi `PAID`, update otomatis `next_service_date` (+3 bulan) dan `next_service_km` (+2000 km) pada kendaraan.

### E. Incremental Transaction (Rawat Inap/Bon Sementara)
- **Use Case:** Transaksi `PENDING` untuk servis berat.
- **Smart Delta Logic:** Edit `PENDING`: Tambah item → kurangi stok; Hapus item → kembalikan stok. Stok akurat real-time.

### F. Print Logic
- **Customer Receipt:** Tampilkan nama paket saja (ringkas).
- **Mechanic Work Order:** Tampilkan nama paket + rincian isi (exploded view).
- **Dynamic Styling:** Frontend baca `printer_width` dari settings untuk layout (58mm/80mm).

### G. Customer Retention (Service Reminder)
1. **Auto-Calculation Trigger:** Saat transaksi `PAID`, hitung jadwal servis berikutnya.
2. **Formula:** `NextDate` = Tanggal Transaksi + 3 Bulan; `NextKM` = `current_km` + 2000 KM.
3. **Display Logic:** Dashboard tampilkan kendaraan dengan `next_service_date` dalam 7 hari.
4. **Reminder Tracking:** Field `reminder_sent_at`, `reminder_sent_by`, `reminder_notes`. Status `is_contacted` berdasarkan `reminder_sent_at`. Reset otomatis saat transaksi baru `PAID`.

### H. Stock Audit (Opname)
1. **Purpose:** Penyesuaian stok berdasarkan opname fisik.
2. **Key Difference:** Tidak pengaruhi laporan penjualan/keuangan.
3. **Single Audit:** Adjust satu produk (`POST /api/inventory/stock-audit`).
4. **Bulk Audit:** Adjust banyak produk (`POST /api/inventory/stock-audit/bulk`).
5. **Audit History:** Riwayat audit (`GET /api/inventory/stock-audit/history`).
6. **Discrepancy Report:** Laporan selisih (`GET /api/inventory/stock-audit/report`).

---

## 4. API ENDPOINTS MAP

### Authentication & Security
* `POST /api/auth/login` (Public - Login)
* `GET  /api/auth/me` (Protected - Get current user)
* `PUT  /api/auth/change-password` (Protected - Change password)
* `POST /api/auth/logout` (Protected - Logout)
* `POST /api/auth/register` (Protected/Admin - Register user)
* `GET  /api/auth/users` (Protected/Admin - List users)
* `PUT  /api/auth/users/:id/status` (Protected/Admin - Update user status)

### Master Data
* `GET  /api/products` (Public - List products with search/filter)
* `GET  /api/products/low-stock` (Protected - Low stock products)
* `GET  /api/products/:id` (Public - Get product by ID)
* `POST /api/products` (Protected/Admin - Create product)
* `PUT  /api/products/:id` (Protected/Admin - Update product)
* `DELETE /api/products/:id` (Protected/Admin - Soft delete product)
* `POST /api/products/:id/upload-image` (Protected/Admin - Upload product image)

* `GET  /api/services` (Public - List services)
* `GET  /api/services/:id` (Public - Get service by ID)
* `POST /api/services` (Protected/Admin - Create service)
* `PUT  /api/services/:id` (Protected/Admin - Update service)
* `DELETE /api/services/:id` (Protected/Admin - Soft delete service)
* `POST /api/services/:id/upload-image` (Protected/Admin - Upload service image)

* `GET  /api/packages` (Public - List packages with details)
* `GET  /api/packages/:id` (Public - Get package by ID)
* `POST /api/packages` (Protected/Admin - Create package with items)
* `PUT  /api/packages/:id` (Protected/Admin - Update package)
* `DELETE /api/packages/:id` (Protected/Admin - Soft delete package)

* `GET  /api/mechanics` (Protected - List mechanics)
* `GET  /api/mechanics/:id` (Protected - Get mechanic by ID)
* `GET  /api/mechanics/:id/details` (Protected/Admin - Mechanic details)
* `POST /api/mechanics` (Protected/Admin - Create mechanic)
* `PUT  /api/mechanics/:id` (Protected/Admin - Update mechanic)
* `PUT  /api/mechanics/:id/details` (Protected/Admin - Update mechanic details)
* `DELETE /api/mechanics/:id` (Protected/Admin - Soft delete mechanic)
* `POST /api/mechanics/:id/upload-photo` (Protected/Admin - Upload mechanic photo)

* `GET  /api/customers` (Protected - List customers)
* `GET  /api/customers/:id` (Protected - Get customer by ID)
* `POST /api/customers` (Protected/Admin - Create customer)
* `PUT  /api/customers/:id` (Protected/Admin - Update customer)
* `DELETE /api/customers/:id` (Protected/Admin - Soft delete customer)

* `GET  /api/vehicles` (Protected - List vehicles)
* `GET  /api/vehicles/:id` (Protected - Get vehicle by ID)
* `POST /api/vehicles` (Protected/Admin - Create vehicle)
* `PUT  /api/vehicles/:id` (Protected/Admin - Update vehicle)
* `DELETE /api/vehicles/:id` (Protected/Admin - Soft delete vehicle)

### POS Core & Transactions
* `POST /api/transactions` (Protected - Create transaction with atomic logic)
* `GET  /api/transactions` (Protected - List transactions with filters)
* `GET  /api/transactions/:id` (Protected - Get transaction by ID with relations)
* `GET  /api/transactions/:id/print` (Protected - Get print data for receipt/workorder)

### Payments
* `POST /api/payments` (Protected - Add payment to transaction)
* `GET  /api/payments/transaction/:id` (Protected - Get payments for transaction)

### Inventory & Stock
* `GET  /api/inventory` (Protected - Inventory logs with filters)
* `POST /api/inventory/in` (Protected - Add stock in with HPP update)
* `POST /api/inventory/stock-audit` (Protected - Single stock audit)
* `POST /api/inventory/stock-audit/bulk` (Protected - Bulk stock audit)
* `GET  /api/inventory/stock-audit/history` (Protected - Audit history)
* `GET  /api/inventory/stock-audit/report` (Protected - Discrepancy report)

### Reports & Operations
* `GET /api/reports/dashboard` (Protected - Dashboard summary with service reminders)
* `GET /api/reports/inventory` (Protected - Inventory report)
* `GET /api/reports/sales` (Protected - Sales report with filters)
* `GET /api/reports/financial` (Protected - Financial report with package COGS)

### Expenses
* `GET  /api/expenses` (Protected - List expenses)
* `GET  /api/expenses/:id` (Protected - Get expense by ID)
* `POST /api/expenses` (Protected - Create expense)
* `PUT  /api/expenses/:id` (Protected - Update expense)
* `DELETE /api/expenses/:id` (Protected - Soft delete expense)

### Settings & Config
* `GET  /api/settings` (Protected - Get settings)
* `PUT  /api/settings` (Protected/Admin - Update settings)

### Audit Logs
* `GET  /api/audit-logs` (Protected/Admin - List audit logs with filters)

### Service Reminder
* `GET  /api/vehicles/due-service` (Protected - List vehicles due for service)
* `POST /api/vehicles/:id/mark-contacted` (Protected - Mark vehicle as contacted)
* `POST /api/vehicles/:id/reset-reminder` (Protected - Reset reminder status)