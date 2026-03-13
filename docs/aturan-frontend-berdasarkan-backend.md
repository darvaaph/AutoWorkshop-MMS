# Aturan Frontend Berdasarkan Backend (AutoWorkshop MMS)

Dokumen ini adalah ringkasan aturan implementasi frontend yang **wajib mengikuti perilaku backend saat ini**.

## 1) Auth & Akses

## Token
- Semua endpoint protected butuh header: `Authorization: Bearer <token>`.
- Jika token expired/invalid/blacklisted: anggap sesi habis, logout lokal, redirect ke login.
- Jika backend kirim `401` karena akun nonaktif: tampilkan pesan dan paksa login ulang.

## Role
- Role yang tersedia: `ADMIN`, `CASHIER`.
- `ADMIN`: bisa CRUD master data, settings, cancel transaksi, audit log.
- `CASHIER`: fokus operasional transaksi + lihat data yang diizinkan.

## Aturan UI
- Sembunyikan action/button sesuai role (jangan hanya disable).
- Tangani `403` dengan halaman/alert “Akses ditolak”.

---

## 2) Produk (Products)

## Create `POST /api/products`
Wajib:
- `sku` (unik, backend simpan uppercase)
- `name`
- `category`
- `price_buy`
- `price_sell`

Opsional:
- `stock` (default `0`)
- `min_stock_alert` (default `5`)
- `image` upload (jpeg/jpg/png/gif, max 2MB)

## Update `PUT /api/products/:id`
- Boleh partial update.
- `sku` tetap unik jika diubah.
- Upload image baru akan replace image lama.

## Delete `DELETE /api/products/:id`
- Soft delete.
- Produk terhapus bisa berdampak ke paket (lihat bagian paket).

## Catatan penting frontend
- SKU sebaiknya otomatis uppercase di input.
- Tampilkan warning sebelum hapus produk: bisa membuat paket tidak tersedia.

---

## 3) Inventory

## Stock In `POST /api/inventory/in`
Wajib:
- `product_id`
- `qty` > 0

Opsional:
- `buy_price`
- `notes`

Aturan backend:
- Menggunakan moving average untuk harga beli.

## Stock Audit `POST /api/inventory/stock-audit`
Wajib:
- `product_id`
- `actual_stock` >= 0

Opsional:
- `reason`
- `notes`

Aturan backend:
- Stock audit hanya mengubah stok fisik.
- Tidak mempengaruhi laporan penjualan/profit.

## UI
- Validasi angka sebelum submit.
- Tampilkan riwayat audit dari endpoint history/report bila dibutuhkan.

---

## 4) Pelanggan (Customers)

## Create `POST /api/customers`
Wajib:
- `name`
- `phone` (unik untuk data aktif)

Opsional:
- `address`
- `photo` upload (max 2MB)

## Update `PUT /api/customers/:id`
- Partial update.
- Jika `phone` diubah, tetap harus unik.

## Delete `DELETE /api/customers/:id`
- Soft delete.

---

## 5) Kendaraan (Vehicles)

## Create `POST /api/vehicles`
Wajib:
- `customer_id`
- `license_plate` (unik)
- `brand`
- `model`

Opsional:
- `current_km`
- `image` upload

## Update `PUT /api/vehicles/:id`
- Partial update.
- Bisa update `next_service_date`, `next_service_km`.

## Reminder
- `GET /api/vehicles/due-service`: kendaraan jatuh tempo/overdue servis.
- `POST /api/vehicles/:id/mark-contacted`: tandai sudah dihubungi.
- `POST /api/vehicles/:id/reset-reminder`: reset status reminder.

## Aturan auto-update dari transaksi
Saat transaksi jadi `PAID` + ada `vehicle_id`:
- `next_service_date = tanggal transaksi + 3 bulan`
- `next_service_km = current_km + 2000`

Frontend cukup tampilkan hasil dari response backend.

---

## 6) Mekanik (Mechanics)

## Create `POST /api/mechanics`
Wajib:
- `name`

Opsional:
- `is_active` (default `true`)
- `photo` upload

## Update
- `PUT /api/mechanics/:id`: basic data (`name`, `is_active`, photo)
- `PUT /api/mechanics/:id/details`: data sensitif (`phone`, `address`, `emergency_contact`)

## Aturan transaksi
- Mekanik nonaktif tidak boleh dipakai di transaksi.
- Dropdown mekanik di POS sebaiknya hanya menampilkan `is_active = true`.

---

## 7) Layanan (Services)

## Create `POST /api/services`
Wajib:
- `name`
- `price`

Opsional:
- `image` upload

## Update `PUT /api/services/:id`
- Partial update.

## Delete `DELETE /api/services/:id`
- Soft delete.

## Aturan harga di transaksi
- Item `SERVICE` boleh pakai `custom_price`.

---

## 8) Paket (Packages)

## Create `POST /api/packages`
Wajib:
- `name`
- `price`

Opsional:
- `description`
- `is_active` (default `true`)
- `image` upload
- `items[]`

Jika `items[]` diisi, tiap item wajib:
- `item_type` = `PRODUCT` atau `SERVICE`
- `item_id`
- `qty`

## Update `PUT /api/packages/:id`
- Partial update.
- Jika kirim `items`, backend mengganti seluruh item lama dengan item baru.

## Ketersediaan paket
Backend mengirim indikator:
- `is_available`
- `unavailable_reason`
- `stock_details`

## Skenario penting: produk komponen dihapus
Jika produk komponen paket dihapus dari halaman produk:
- Paket bisa tetap ada, tapi tidak bisa dijual jika komponen produk sudah deleted.
- Saat transaksi, backend akan menolak dengan error terkait deleted product.

## UI wajib
- Di list/detail paket, tampilkan status tidak tersedia dengan jelas.
- Di POS, blokir pilih/checkout paket jika `is_available = false`.
- Tampilkan alasan dari `unavailable_reason`.

## Harga paket di transaksi
- Harga paket dari DB, tidak bisa override custom di frontend.

---

## 9) Transaksi (POS)

## Create `POST /api/transactions`
Wajib:
- `items[]` minimal 1 item

Opsional:
- `vehicle_id`
- `mechanic_id` (harus aktif jika diisi)
- `current_km`
- `discount_amount` (default 0)
- `notes`
- `initial_payment`

## Tipe item
- `PRODUCT`: harga dari DB (`price_sell`), tidak bisa override.
- `SERVICE`: harga DB, bisa override lewat `custom_price`.
- `PACKAGE`: harga dari DB (`price`), tidak bisa override.
- `EXTERNAL`: nama/harga manual.

## Pembayaran `POST /api/transactions/:id/pay`
Wajib:
- `amount` > 0
- `payment_method`

Opsional:
- `reference_number`

Aturan:
- Tidak bisa bayar transaksi `CANCELLED`/`PAID`.
- Status berubah otomatis: `UNPAID` → `PARTIAL` → `PAID`.

## Cancel `PUT /api/transactions/:id/cancel`
- Hanya ADMIN.
- Saat cancel: stok dikembalikan otomatis.
- Jika sudah ada pembayaran: backend membuat pembayaran `REFUND` negatif otomatis.

## Print `GET /api/transactions/:id/print?type=...`
- `type=receipt`: tampilan struk pelanggan.
- `type=workorder`: paket dipecah tampil komponen untuk mekanik.

---

## 10) Expenses

## Create `POST /api/expenses`
Wajib:
- `category` (`SALARY`, `UTILITIES`, `PURCHASING`, `OTHER`)
- `amount`
- `date`

Opsional:
- `description`

## Update `PUT /api/expenses/:id`
- Partial update.

## Delete `DELETE /api/expenses/:id`
- Soft delete.

---

## 11) Reports

Endpoint utama:
- `GET /api/reports/dashboard`
- `GET /api/reports/financial`
- `GET /api/reports/inventory`
- `GET /api/reports/sales`

Aturan:
- Stock audit tidak diperlakukan sebagai penjualan/profit event.

---

## 12) Settings

## Get `GET /api/settings`
- Ambil pengaturan toko (nama, alamat, telepon, printer_width, footer, logo).

## Update `PUT /api/settings`
- Hanya ADMIN.
- Partial update.

## Upload logo `POST /api/settings/upload-logo`
- Hanya ADMIN.
- Upload logo baru akan menggantikan logo lama.

---

## 13) Aturan Error Handling Frontend (Wajib)

Mapping minimum:
- `400`: tampilkan pesan validasi dari backend.
- `401`: clear session + redirect login.
- `403`: tampilkan akses ditolak.
- `404`: data tidak ditemukan.
- `409`: konflik data unik (SKU/username/phone/plate).
- `500`: tampilkan pesan generik + retry action.

---

## 14) Aturan Upload File (Global)

Berlaku untuk customer, vehicle, mechanic, product, service, package, settings logo:
- Tipe file: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`
- Maksimum ukuran: `2MB`
- Saat upload gagal validasi, tampilkan alasan dari backend apa adanya.

---

## 15) Checklist Implementasi Agent Frontend

- [ ] Role-based menu dan tombol aksi.
- [ ] Global interceptor 401/403.
- [ ] Form validasi sesuai field wajib backend.
- [ ] File upload validation (type + size) sebelum submit.
- [ ] POS price-rule per item type (`PRODUCT/SERVICE/PACKAGE/EXTERNAL`).
- [ ] Blocking paket tidak tersedia (`is_available = false`).
- [ ] UX khusus untuk cancel transaksi dan refund otomatis.
- [ ] Tampilan due-service + mark-contacted/reset.
- [ ] Soft-delete aware UI (jangan asumsi hard delete).
- [ ] Tampilkan pesan error backend secara spesifik.

---

_Last update: 2026-03-13_

## 16) Handover Prompt Siap Pakai

Gunakan prompt siap pakai untuk agent frontend di file:
- `docs/handover-prompt-agent-frontend.md`