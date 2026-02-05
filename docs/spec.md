# WORKSHOP MANAGEMENT SYSTEM (WMS) - TECHNICAL SPECIFICATION (V5.6 - WITH SERVICE REMINDER)

## 1. PROJECT OVERVIEW
**Name:** AutoWorkshop MMS
**Type:** Full-stack Point of Sales & Management System.
**Core Objective:** Inventory, POS, Finance, Audit Trails, Printing, and Promo/Bundling Support with Precise Accounting.

---

## 2. DATABASE SCHEMA (ERD BLUEPRINT)

### A. System Configuration
**1. settings** (Single Row Table)
- `id`: PK
- `shop_name`: String (e.g., "Bengkel Maju Jaya")
- `shop_address`: Text
- `shop_phone`: String
- `shop_logo_url`: String (Nullable) -- URL Logo Bengkel
- `printer_width`: Enum ('58mm', '80mm') -- Ukuran Kertas Thermal
- `footer_message`: String
- `updated_at`: Datetime

### B. Authentication & Team
**2. users**
- `id`: PK, Integer (Auto Increment)
- `username`: String (Unique)
- `password`: String (Hashed - bcrypt)
- `role`: Enum ('ADMIN', 'CASHIER')
- `full_name`: String
- `created_at`: Datetime, `updated_at`: Datetime

**3. mechanics**
- `id`: PK, `name`: String, `is_active`: Boolean
- `deleted_at`: Datetime (Soft Delete - Indexed)

### C. Master Data (Produk & Paket)
**4. products** (Barang Satuan)
- `id`: PK, `sku`: String (Unique, Indexed)
- `name`: String, `image_url`: String
- `category`: String
- `price_buy`: Decimal (HPP/Modal), `price_sell`: Decimal (Harga Jual)
- `stock`: Integer
- `min_stock_alert`: Integer
- `deleted_at`: Datetime (Soft Delete - Indexed)

**5. services** (Jasa Satuan)
- `id`: PK, `name`: String, `price`: Decimal
- `deleted_at`: Datetime (Soft Delete)

**6. packages** (Paket Promo/Bundling) -- [NEW]
- `id`: PK
- `name`: String (e.g., "Paket Tune Up Hemat")
- `price`: Decimal (Harga Jual Paket)
- `description`: Text
- `is_active`: Boolean
- `deleted_at`: Datetime

**7. package_items** (Isi Paket) -- [NEW]
- `id`: PK
- `package_id`: FK -> packages.id
- `product_id`: FK -> products.id (Nullable if service)
- `service_id`: FK -> services.id (Nullable if product)
- `qty`: Integer (Jumlah barang dalam paket)

### D. Master Customer & Vehicle
**8. customers**
- `id`: PK, `name`: String, `phone`: String (Unique, Indexed), `address`: Text
- `deleted_at`: Datetime

**9. vehicles**
- `id`: PK, `customer_id`: FK, `license_plate`: String (Unique, Indexed)
- `brand`: String, `model`: String, `current_km`: Integer
- `next_service_date`: Date (Nullable) -- Jadwal servis berikutnya (Waktu)
- `next_service_km`: Integer (Nullable) -- Jadwal servis berikutnya (Jarak)
- `reminder_sent_at`: Datetime (Nullable) -- [NEW] Timestamp reminder terakhir dikirim
- `reminder_sent_by`: FK -> users.id (Nullable) -- [NEW] User yang mengirim reminder
- `reminder_notes`: Text (Nullable) -- [NEW] Catatan follow-up reminder
- `deleted_at`: Datetime

### E. Transactions & POS
**10. transactions**
- `id`: PK, `vehicle_id`: FK, `user_id`: FK, `mechanic_id`: FK
- `date`: Datetime (Indexed)
- `status`: Enum ('PENDING', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED')
- `subtotal`: Decimal -- Total sebelum diskon
- `discount_amount`: Decimal -- Potongan Global
- `total_amount`: Decimal -- (Subtotal - Discount)
- `current_km`: Integer, `notes`: Text

**11. transaction_items**
- `id`: PK, `transaction_id`: FK
- `item_type`: Enum ('PRODUCT', 'SERVICE', 'PACKAGE', 'EXTERNAL')
- `item_id`: Integer
- `item_name`: String (Snapshot Name)
- `qty`: Integer
- `base_price`: Decimal -- [NEW] Harga Asli (Sebelum Diskon)
- `discount_amount`: Decimal -- [NEW] Nilai Diskon per unit (Rp)
- `sell_price`: Decimal -- Harga Akhir (Base Price - Discount)
- `vendor_name`: String

**12. payments**
- `id`: PK, `transaction_id`: FK, `amount`: Decimal (Negatif jika Refund), `payment_method`: String, `date`: Datetime

### F. Logs & Finance
**13. inventory_logs**
- `id`: PK, `product_id`: FK, `type`: Enum ('IN', 'OUT', 'ADJUSTMENT')
- `qty`: Integer, `reference_id`: String, `notes`: Text, `created_at`: Datetime

**14. expenses**
- `id`: PK, `user_id`: FK, `category`: Enum ('SALARY', 'UTILITIES', 'PURCHASING', 'OTHER')
- `description`: Text, `amount`: Decimal, `date`: Datetime

**15. audit_logs**
- `id`: PK, `user_id`: FK, `action`: Enum, `table_name`: String, `old_values`: JSON, `new_values`: JSON

---

## 3. BUSINESS LOGIC RULES

### A. Accounting Standards (Handling HPP) -- [CRITICAL NEW]
- **Metode HPP:** Sistem WAJIB menggunakan metode **PERPETUAL MOVING AVERAGE**.
- **Rumus Restock:** Saat input stok masuk (`POST /inventory/in`), update `price_buy` master produk menggunakan rumus:
  $$NewPrice = \frac{(CurrentStock \times OldPrice) + (IncomingQty \times IncomingPrice)}{CurrentStock + IncomingQty}$$
- **Tujuan:** Agar nilai aset dan HPP selalu akurat walau harga beli dari supplier naik-turun.

### B. Package/Bundling Logic (Promo) -- [UPDATED]
1.  **Dynamic Margin Monitoring:** -- [NEW]
    - Laporan Keuangan harus memberi tanda (Flag/Alert) jika ada Paket yang **Margin-nya < 10%** (akibat harga modal komponen naik tapi harga jual paket lupa dinaikkan).
2.  **Strict Stock Validation:**
    - Sebelum Paket masuk ke keranjang belanja, sistem **WAJIB** mengecek stok seluruh komponen di dalamnya.
    - Jika ada 1 komponen stoknya kurang (misal: Paket butuh 4 oli, stok cuma 3), maka Paket **TIDAK BISA** dipilih/dijual.
3.  **Inventory Deduction:**
    - Saat transaksi terjadi, kurangi stok masing-masing komponen sesuai `package_items`.
    - Log Inventory: "Out via Package [Nama Paket]".
4.  **COGS Calculation (Laba Rugi Paket):**
    - Paket tidak punya HPP statis.
    - Saat menghitung Laba, HPP Paket = **SUM(Qty Komponen x Average Buy Price Komponen saat itu)**.

### C. Data Integrity (Polymorphic Safety) -- [NEW]
- **Manual Relation Check:**
    - Karena `transaction_items` menggunakan relasi polimorfik (`item_id` bisa Product/Service/Package), Database tidak bisa menjamin Foreign Key Constraint secara otomatis.
    - **Back-end Validation:** Controller WAJIB mengecek keberadaan ID di tabel target sebelum menyimpan item transaksi. Jika ID tidak ditemukan (atau sudah Hard Deleted), lempar Error.
- **Soft Delete Safety:** Karena semua Master Data menggunakan Soft Delete, referensi ID di history transaksi aman (tidak akan null/error).

### D. Incremental Transaction (Rawat Inap/Bon Sementara)
- **Use Case:** Transaksi `PENDING` untuk mobil turun mesin/servis berat.
- **Smart Delta Logic:** Saat meng-edit transaksi `PENDING`:
    1.  **Tambah Item:** Langsung kurangi stok gudang & buat Log 'OUT'.
    2.  **Hapus Item:** Langsung kembalikan stok gudang & buat Log 'IN'.
    3.  **Tujuan:** Stok fisik akurat real-time meskipun mobil belum bayar/keluar.

### E. Technical Integrity (ACID) -- [CRITICAL]
- **Database Transactions:** Setiap operasi Simpan/Update Transaksi (`POST/PUT /transactions`) WAJIB menggunakan **Sequelize Managed Transaction**.
    - *Rule:* Jika pengurangan stok item ke-10 gagal, maka item ke-1 sampai ke-9 wajib di-rollback (batal). Jangan sampai data transaksi ada tapi stok tidak berkurang.

### F. Print Logic
- **Customer Receipt:** Tampilkan Nama Paket saja (Ringkas).
- **Mechanic Work Order:** Tampilkan Nama Paket **DAN** rincian isinya (Exploded View) agar mekanik tahu item apa saja yang harus diambil/dikerjakan.
- **Dynamic Styling:** Frontend membaca `printer_width` dari API Settings untuk menyesuaikan layout CSS (58mm vs 80mm).

### G. Customer Retention (Service Reminder)
1.  **Auto-Calculation Trigger:**
    - Saat transaksi selesai (`status` berubah menjadi 'PAID'), sistem WAJIB menghitung jadwal servis berikutnya untuk kendaraan tersebut.
2.  **The Formula:**
    - **Time Based:** `NextDate` = Tanggal Transaksi + 3 Bulan (Default).
    - **Usage Based:** `NextKM` = `current_km` (input saat transaksi) + 2.000 KM.
3.  **Display Logic:**
    - Di Dashboard, tampilkan list kendaraan yang `next_service_date` jatuh dalam 7 hari ke depan.
4.  **Reminder Tracking:** -- [NEW]
    - Field `reminder_sent_at`, `reminder_sent_by`, `reminder_notes` untuk tracking status follow-up.
    - Status: `is_contacted` (true/false) berdasarkan `reminder_sent_at`.
    - Reset otomatis saat ada transaksi baru yang PAID.

### H. Stock Audit (Opname) -- [NEW]
1.  **Purpose:** Penyesuaian stok berdasarkan hasil stock opname fisik.
2.  **Key Difference:** Stock audit TIDAK mempengaruhi laporan penjualan/keuangan.
3.  **Single Audit:** Adjust satu produk (`POST /api/inventory/stock-audit`).
4.  **Bulk Audit:** Adjust banyak produk sekaligus (`POST /api/inventory/stock-audit/bulk`).
5.  **Audit History:** Riwayat semua audit (`GET /api/inventory/stock-audit/history`).
6.  **Discrepancy Report:** Laporan selisih stok (`GET /api/inventory/stock-audit/report`).

---

## 4. API ENDPOINTS MAP

### Settings & Config
* `GET  /api/settings` (Include logo & printer settings)
* `PUT  /api/settings` (Update config - Admin Only)

### Master Data
* `CRUD /api/products`, `CRUD /api/services`
* `CRUD /api/packages` (Create Bundle: Header + Items)
* `CRUD /api/mechanics`, `CRUD /api/users`
* `CRUD /api/customers`, `CRUD /api/vehicles`

### POS Core & Transactions
* `POST /api/transactions` (Atomic Transaction + Package Explosion Logic)
* `PUT  /api/transactions/:id` (Update PENDING only + Delta Stock Logic)
* `PUT  /api/transactions/:id/cancel` (Void + Refund Logic + Stock Return)
* `GET  /api/transactions/:id` (Detail with full relations for Printing)
* `GET  /api/transactions/:id/print?type=receipt|workorder` (Print data JSON)

### Payments
* `POST /api/payments` (Tambah pembayaran)
* `GET  /api/payments/transaction/:id` (Pembayaran per transaksi)

### Inventory & Stock
* `GET  /api/inventory` (Inventory logs dengan filter)
* `POST /api/inventory/in` (Barang masuk dengan HPP Moving Average)
* `POST /api/inventory/stock-audit` (Single product stock opname) -- [NEW]
* `POST /api/inventory/stock-audit/bulk` (Bulk stock opname) -- [NEW]
* `GET  /api/inventory/stock-audit/history` (Riwayat audit) -- [NEW]
* `GET  /api/inventory/stock-audit/report` (Laporan selisih) -- [NEW]

### Reports & Operations
* `GET /api/reports/dashboard` (Include Service Reminder Widget)
* `GET /api/reports/inventory` (Stok & nilai inventory)
* `GET /api/reports/sales` (Laporan penjualan dengan filter)
* `GET /api/reports/financial` (Profit calculation handles Packages COGS correctly)

### Expenses
* `CRUD /api/expenses` (Pengeluaran operasional)

### Audit Logs
* `GET  /api/audit-logs` (Dengan filter user, action, table, tanggal)

### Service Reminder
* `GET  /api/vehicles/due-service` (List kendaraan yang perlu reminder dalam 7 hari)
* `POST /api/vehicles/:id/mark-contacted` (Tandai sudah dihubungi) -- [NEW]
* `POST /api/vehicles/:id/reset-reminder` (Reset status reminder) -- [NEW]