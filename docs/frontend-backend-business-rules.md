# Backend Business Rules untuk Frontend — AutoWorkshop MMS

Dokumen ini merangkum **aturan alur backend yang berdampak ke UX frontend** (bukan sekadar field CRUD).

Status: mengacu pada implementasi di `apps/api/src` per 13 Maret 2026.

---

## 1) Aturan lintas modul (wajib dipahami frontend)

1. **Banyak entitas memakai soft delete** (`deleted_at`/paranoid):
   - Product, Service, Package, Customer, Vehicle, Mechanic, Transaction, Expense.
   - Data terhapus biasanya tidak muncul di list biasa, tapi masih bisa memengaruhi relasi historis.

2. **Semua endpoint upload gambar/foto** menerapkan aturan yang sama:
   - Format: `jpeg/jpg/png/gif`
   - Maks ukuran: `2MB`
   - Jika upload baru sukses, file lama dihapus (jika sebelumnya dari folder `/uploads/...`).

3. **Role-based access**:
   - Mutasi master penting (`products/services/packages`, settings, sebagian mekanik, user management, cancel transaksi) dominan **ADMIN only**.
   - Frontend harus menyembunyikan aksi yang tidak sesuai role, bukan hanya mengandalkan 403 dari backend.

---

## 2) Rules Products ↔ Packages (contoh utama)

### A. Hapus Product
- Trigger: `DELETE /api/products/:id`
- Perilaku backend:
  - Product di-**soft delete**.
  - **Package TIDAK otomatis menjadi nonaktif**.
- Dampak ke frontend:
  - Paket yang berisi product tersebut bisa tetap terlihat (jika `is_active=true`).
  - Saat dijual sebagai item `PACKAGE`, transaksi bisa gagal karena komponen paket tidak valid / stok komponen tidak terpenuhi.
  - Disarankan sebelum submit transaksi paket, panggil `GET /api/packages/:id/check-availability`.

### B. Hapus Service
- Mirip produk: soft delete service tidak otomatis menonaktifkan package.
- Package tetap harus divalidasi ketersediaannya dari endpoint availability/check saat akan dijual.

### C. List package default hanya aktif
- `GET /api/packages` default query `active_only=true`.
- Jika frontend butuh melihat paket nonaktif, harus kirim `active_only=false`.

---

## 3) Rules Transaction (POS) & side effects

### A. Create transaksi (`POST /api/transactions`)
- Wajib punya minimal 1 item.
- Validasi relasi:
  - `vehicle_id` harus valid jika diisi.
  - `mechanic_id` harus valid **dan `is_active=true`** jika diisi.
- Penentuan harga:
  - `PRODUCT` dan `PACKAGE`: harga utama diambil dari DB (bukan trust nilai frontend).
  - `SERVICE`: bisa pakai `custom_price` jika dikirim.
  - `EXTERNAL`: harga dari payload (`base_price`/`cost_price`).
- Side effect stok:
  - Semua komponen produk (termasuk komponen dari package) langsung mengurangi stok.
  - Inventory log `OUT` otomatis dibuat.

### B. Status awal transaksi
- Tanpa `initial_payment` → `UNPAID`
- `initial_payment` > 0 tapi < total → `PARTIAL`
- `initial_payment` >= total → `PAID`

### C. Saat status jadi `PAID` (create/payment)
- Jika ada kendaraan (`vehicle_id`), backend update reminder servis otomatis:
  - `next_service_date = tanggal transaksi + 3 bulan`
  - `next_service_km = current_km transaksi + 2000`
  - `current_km` kendaraan ikut diset dari transaksi (fallback ke nilai lama bila kosong)

### D. Tambah pembayaran (`POST /api/transactions/:id/pay`)
- Tidak boleh menambah pembayaran jika status transaksi `CANCELLED` atau sudah `PAID`.
- Status otomatis berubah ke `PARTIAL` atau `PAID` sesuai akumulasi pembayaran.
- Jika transisi baru ke `PAID`, rule reminder kendaraan (3 bulan / +2000 km) dijalankan.

### E. Batal transaksi (`PUT /api/transactions/:id/cancel`, ADMIN only)
- Jika ada pembayaran, backend membuat payment `REFUND` dengan nominal negatif.
- Stok dikembalikan berdasarkan inventory log transaksi tersebut (`IN` log dibuat).
- Status transaksi jadi `CANCELLED`.

---

## 4) Rules Vehicle reminder

### A. Daftar kendaraan due service
- Endpoint: `GET /api/vehicles/due-service`
- Menampilkan kendaraan dengan `next_service_date <= 7 hari ke depan` (termasuk overdue).
- Backend menambahkan status turunan:
  - `OVERDUE`, `DUE_TODAY`, `UPCOMING`
  - `is_contacted` dari `reminder_sent_at`.

### B. Tandai sudah dihubungi
- Endpoint: `POST /api/vehicles/:id/mark-contacted`
- Body yang dipakai implementasi: `notes` (disimpan ke `reminder_notes`).

### C. Reset reminder
- Endpoint: `POST /api/vehicles/:id/reset-reminder`
- Mengosongkan `reminder_sent_at`, `reminder_sent_by`, `reminder_notes`.

---

## 5) Rules Customer & Vehicle

### A. Hapus customer
- Trigger: `DELETE /api/customers/:id`
- Side effect:
  - Semua vehicle milik customer ikut dihapus (soft delete).
  - Respon sukses menyebut customer + associated vehicles terhapus.

### B. Unik data penting
- `customers.phone` unik (customer aktif).
- `vehicles.license_plate` unik.

---

## 6) Rules Inventory manual

### A. Stock In (`POST /api/inventory/in`)
- Menambah stok dan menghitung ulang `price_buy` dengan **Moving Average**:

`new_price_buy = ((stock_lama * harga_lama) + (qty_masuk * harga_masuk)) / (stock_lama + qty_masuk)`

### B. Stock Audit (`POST /api/inventory/stock-audit`)
- Menyesuaikan stok fisik aktual (`ADJUSTMENT`).
- Ditandai sebagai audit dan **tidak dimaksudkan untuk memengaruhi laporan penjualan/keuntungan historis**.

---

## 7) Rules Auth yang berdampak ke frontend

1. User `is_active=false` tidak bisa login.
2. Token user tidak aktif juga ditolak saat akses endpoint protected.
3. Logout menambahkan token ke blacklist (token lama harus dianggap invalid).
4. Endpoint status user (admin): `PUT /api/auth/users/:id/status`.

---

## 8) Catatan kompatibilitas API (penting untuk FE)

1. Penambahan payment via transaksi saat ini pakai path:
   - `POST /api/transactions/:id/pay`
   - Bukan `/api/transactions/:id/payments`.

2. `payment_method` `REFUND` dipakai backend saat cancel transaksi, bukan untuk input manual payment biasa.

3. Beberapa endpoint mengembalikan bentuk response berbeda (ada yang `{ success, data }`, ada yang raw object). Frontend sebaiknya normalisasi response di API client layer.

---

## 9) Checklist implementasi frontend (disarankan)

- Saat user mau jual paket, validasi dulu `check-availability` agar gagal lebih cepat di UI.
- Setelah `create transaction`, `add payment`, atau `cancel transaction`, lakukan invalidasi cache untuk:
  - transaksi,
  - stok produk,
  - due service kendaraan.
- Saat delete product/service, tampilkan warning bahwa paket terkait **tidak otomatis nonaktif**.
- Gunakan guard role di menu + action button, selain tetap handle 401/403 dari API.
