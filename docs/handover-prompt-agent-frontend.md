# Handover Prompt — Agent Frontend

Gunakan prompt ini untuk agent/frontend coder agar implementasi UI mengikuti backend yang sudah ada.

---

## Prompt Siap Pakai

Kamu adalah agent frontend untuk project **AutoWorkshop MMS**.

### Konteks
- Monorepo path frontend: `apps/web`
- Backend sudah berjalan dan **menjadi sumber kebenaran**
- Aturan bisnis wajib mengacu ke dokumen:
  - `docs/aturan-frontend-berdasarkan-backend.md`
- Jangan mengubah backend kecuali diminta eksplisit.

### Tujuan
Implementasikan dan/atau rapikan frontend agar:
1. Seluruh alur utama mengikuti kontrak backend.
2. Role & permission berjalan benar (`ADMIN` vs `CASHIER`).
3. POS, Paket, Inventory, dan error handling stabil untuk edge case nyata.
4. UI tidak mengizinkan aksi yang pasti ditolak backend.

### Hard Constraints (Wajib)
1. **Jangan bikin endpoint baru** yang tidak ada di backend.
2. **Jangan override rule harga**:
   - `PRODUCT`: harga dari DB (tidak custom)
   - `PACKAGE`: harga dari DB (tidak custom)
   - `SERVICE`: boleh `custom_price`
3. File upload wajib validasi client-side:
   - MIME: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`
   - Ukuran maksimal: 2MB
4. Tangani HTTP status global:
   - `401`: clear session + redirect login
   - `403`: tampilkan akses ditolak
   - `400/404/409/500`: tampilkan pesan backend secara jelas
5. Terapkan role-based UI:
   - Sembunyikan aksi admin dari cashier (jangan hanya disabled).

### Prioritas Implementasi (urut kerja)
1. **Auth & Session Guard**
   - Interceptor untuk `401/403`
   - Proteksi route berdasarkan login & role
   - Auto logout jika token invalid/expired/blacklisted/nonaktif

2. **POS / Transactions (kritikal)**
   - Create transaction dengan item `PRODUCT`, `SERVICE`, `PACKAGE`, `EXTERNAL`
   - Payment flow `UNPAID -> PARTIAL -> PAID`
   - Cancel transaction (admin only)
   - Print flow `receipt` vs `workorder`

3. **Packages + Availability Guard**
   - Tampilkan `is_available`, `unavailable_reason`, `stock_details`
   - Block add-to-cart/checkout jika paket tidak tersedia
   - Validasi endpoint `GET /api/packages/:id/check-availability`
   - Skenario wajib: paket berisi produk yang di-soft-delete harus terbaca sebagai tidak bisa dijual

4. **Inventory UX**
   - Form Stock In (`/api/inventory/in`)
   - Form Stock Audit (`/api/inventory/stock-audit`)
   - Tampilkan info bahwa stock audit tidak dihitung sebagai sales/profit

5. **Master Data (Products, Services, Vehicles, Customers, Mechanics, Settings, Expenses)**
   - Pastikan semua form create/update sesuai field required/optional di backend
   - Hapus aksi yang tidak didukung endpoint backend

### Endpoint Kritis yang Harus Dipakai
- Auth:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `POST /api/auth/register` (admin)
  - `PUT /api/auth/users/:id/status` (admin)
- Transactions:
  - `POST /api/transactions`
  - `POST /api/transactions/:id/pay`
  - `PUT /api/transactions/:id/cancel` (admin)
  - `GET /api/transactions/:id/print?type=receipt|workorder`
- Packages:
  - `GET /api/packages`
  - `GET /api/packages/:id/check-availability`
- Inventory:
  - `POST /api/inventory/in`
  - `POST /api/inventory/stock-audit`

### Acceptance Criteria (Definition of Done)
1. Cashier tidak melihat aksi admin (delete, cancel, settings update, user management, audit log).
2. POS mencegah transaksi paket tidak available sebelum submit.
3. Jika backend mengembalikan error stok/produk terhapus/inactive mechanic, UI menampilkan pesan yang bisa ditindak user.
4. Harga item di POS mengikuti rule per tipe item (tidak ada override ilegal).
5. Upload image gagal di client jika file > 2MB atau MIME tidak valid.
6. Error handling konsisten di seluruh halaman (`400/401/403/404/409/500`).
7. Unit/integration check minimal untuk:
   - auth guard
   - role guard
   - package availability guard
   - POS price rule

### Test Scenario Wajib
1. **Deleted product in package**
   - Buka list paket -> paket tampil unavailable
   - Coba jual paket di POS -> diblokir, muncul alasan
2. **Insufficient stock**
   - Checkout dengan qty melebihi stok -> tampil error stok dari backend
3. **Inactive mechanic**
   - Coba submit transaksi dengan mekanik nonaktif -> gagal dengan pesan jelas
4. **Payment flow**
   - Bayar sebagian -> status PARTIAL
   - Bayar pelunasan -> status PAID
5. **Cancel flow**
   - Admin cancel transaksi berbayar -> tampil info refund + stok restored

### Output yang Saya Harapkan dari Kamu (agent frontend)
Setiap kali selesai 1 batch perubahan, laporkan:
1. File yang diubah
2. Ringkasan perubahan
3. Rule backend mana yang dicakup
4. Cara test manual singkat
5. Known issue (jika ada)

Mulai dari audit cepat codebase frontend, lalu kerjakan prioritas #1 sampai #3 terlebih dulu.
