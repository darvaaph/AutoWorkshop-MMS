# CRUD Fields Reference — AutoWorkshop MMS

> **Keterangan:**
> - **Wajib** = harus diisi, request gagal jika kosong
> - **Opsional** = boleh tidak diisi
> - **File upload** — Format: JPEG, JPG, PNG, GIF | Ukuran maks: **2MB** (semua bersifat opsional)

---

## 🔐 Auth

### `POST /api/auth/login`
| Field | Status | Keterangan |
|---|---|---|
| `username` | **Wajib** | |
| `password` | **Wajib** | |

### `POST /api/auth/register` *(Admin only)*
| Field | Status | Keterangan |
|---|---|---|
| `username` | **Wajib** | Harus unik |
| `password` | **Wajib** | Min 6 karakter |
| `full_name` | **Wajib** | |
| `role` | **Wajib** | `ADMIN` \| `CASHIER` |
| `is_active` | Opsional | Default: `true` |

### `POST /api/auth/change-password`
| Field | Status | Keterangan |
|---|---|---|
| `old_password` | **Wajib** | |
| `new_password` | **Wajib** | |

### `PUT /api/auth/users/:id/toggle-active` *(Admin only)*
| Field | Status | Keterangan |
|---|---|---|
| `is_active` | **Wajib** | `true` \| `false` |

---

## 👤 Customer

### `POST /api/customers` — Create
| Field | Status | Keterangan |
|---|---|---|
| `name` | **Wajib** | |
| `phone` | **Wajib** | Harus unik |
| `address` | Opsional | |
| `photo` | Opsional | File upload (foto pelanggan) |

### `PUT /api/customers/:id` — Update *(partial update)*
| Field | Status | Keterangan |
|---|---|---|
| `name` | Opsional | |
| `phone` | Opsional | Harus unik jika diubah |
| `address` | Opsional | |
| `photo` | Opsional | File upload (menggantikan foto lama) |

### `DELETE /api/customers/:id` — Delete
Tidak memerlukan body.

### `POST /api/customers/:id/upload-photo` — Upload foto
| Field | Status | Keterangan |
|---|---|---|
| `photo` | **Wajib** | File upload |

---

## 🚗 Vehicle

### `POST /api/vehicles` — Create
| Field | Status | Keterangan |
|---|---|---|
| `customer_id` | **Wajib** | ID pelanggan pemilik |
| `license_plate` | **Wajib** | Harus unik |
| `brand` | **Wajib** | Merek kendaraan |
| `model` | **Wajib** | Model kendaraan |
| `current_km` | Opsional | KM saat ini |
| `image` | Opsional | File upload (foto kendaraan) |

### `PUT /api/vehicles/:id` — Update *(partial update)*
| Field | Status | Keterangan |
|---|---|---|
| `customer_id` | Opsional | |
| `license_plate` | Opsional | Harus unik jika diubah |
| `brand` | Opsional | |
| `model` | Opsional | |
| `current_km` | Opsional | |
| `next_service_date` | Opsional | Format: `YYYY-MM-DD` |
| `next_service_km` | Opsional | |
| `image` | Opsional | File upload (menggantikan foto lama) |

### `DELETE /api/vehicles/:id` — Delete
Tidak memerlukan body.

### `POST /api/vehicles/:id/upload-image` — Upload gambar
| Field | Status | Keterangan |
|---|---|---|
| `image` | **Wajib** | File upload |

### `POST /api/vehicles/:id/mark-contacted` — Tandai sudah dihubungi *(reminder)*
| Field | Status | Keterangan |
|---|---|---|
| `reminder_notes` | Opsional | Catatan pengingat |

### `POST /api/vehicles/:id/reset-reminder` — Reset status reminder
Tidak memerlukan body.

---

## 🔧 Mechanic

### `POST /api/mechanics` — Create
| Field | Status | Keterangan |
|---|---|---|
| `name` | **Wajib** | |
| `is_active` | Opsional | Default: `true` |
| `photo` | Opsional | File upload (foto mekanik) |

### `PUT /api/mechanics/:id` — Update basic *(partial update)*
| Field | Status | Keterangan |
|---|---|---|
| `name` | Opsional | |
| `is_active` | Opsional | `true` \| `false` |
| `photo` | Opsional | File upload (menggantikan foto lama) |

### `PUT /api/mechanics/:id/details` — Update kontak *(partial update)*
| Field | Status | Keterangan |
|---|---|---|
| `phone` | Opsional | Nomor telepon |
| `address` | Opsional | Alamat tempat tinggal |
| `emergency_contact` | Opsional | Kontak darurat |

### `DELETE /api/mechanics/:id` — Delete
Tidak memerlukan body.

---

## 🛠 Service (Jenis Layanan)

### `POST /api/services` — Create
| Field | Status | Keterangan |
|---|---|---|
| `name` | **Wajib** | |
| `price` | **Wajib** | Angka desimal |
| `image` | Opsional | File upload (ilustrasi layanan) |

### `PUT /api/services/:id` — Update *(partial update)*
| Field | Status | Keterangan |
|---|---|---|
| `name` | Opsional | |
| `price` | Opsional | |
| `image` | Opsional | File upload |

### `DELETE /api/services/:id` — Delete (soft delete)
Tidak memerlukan body.

---

## 📦 Product (Inventori)

### `POST /api/products` — Create
| Field | Status | Keterangan |
|---|---|---|
| `sku` | **Wajib** | Harus unik (otomatis uppercase) |
| `name` | **Wajib** | |
| `category` | **Wajib** | |
| `price_buy` | **Wajib** | Harga beli |
| `price_sell` | **Wajib** | Harga jual |
| `stock` | Opsional | Default: `0` |
| `min_stock_alert` | Opsional | Default: `5` |
| `image` | Opsional | File upload |

### `PUT /api/products/:id` — Update *(partial update)*
| Field | Status | Keterangan |
|---|---|---|
| `sku` | Opsional | Harus unik jika diubah |
| `name` | Opsional | |
| `category` | Opsional | |
| `price_buy` | Opsional | |
| `price_sell` | Opsional | |
| `stock` | Opsional | |
| `min_stock_alert` | Opsional | |
| `image` | Opsional | File upload |

### `DELETE /api/products/:id` — Delete (soft delete)
Tidak memerlukan body.

### `POST /api/products/:id/upload-image` — Upload gambar *(Admin only)*
| Field | Status | Keterangan |
|---|---|---|
| `image` | **Wajib** | File upload |

---

## 🗂 Package (Paket Layanan)

### `POST /api/packages` — Create
| Field | Status | Keterangan |
|---|---|---|
| `name` | **Wajib** | |
| `price` | **Wajib** | |
| `description` | Opsional | |
| `is_active` | Opsional | Default: `true` |
| `image` | Opsional | File upload |
| `items` | Opsional | Array item yang termasuk dalam paket |
| `items[].item_type` | **Wajib** *(jika items diisi)* | `PRODUCT` \| `SERVICE` |
| `items[].item_id` | **Wajib** *(jika items diisi)* | ID produk atau layanan |
| `items[].qty` | **Wajib** *(jika items diisi)* | Jumlah |

### `PUT /api/packages/:id` — Update *(partial update)*
| Field | Status | Keterangan |
|---|---|---|
| `name` | Opsional | |
| `price` | Opsional | |
| `description` | Opsional | |
| `is_active` | Opsional | |
| `image` | Opsional | File upload |
| `items` | Opsional | Menggantikan semua item sebelumnya jika diisi |

### `DELETE /api/packages/:id` — Delete (soft delete)
Tidak memerlukan body.

---

## 💰 Transaction (Transaksi / POS)

### `POST /api/transactions` — Create
| Field | Status | Keterangan |
|---|---|---|
| `items` | **Wajib** | Array min 1 item |
| `items[].item_type` | **Wajib** | `PRODUCT` \| `SERVICE` \| `PACKAGE` |
| `items[].item_id` | **Wajib** | |
| `items[].qty` | **Wajib** | |
| `items[].unit_price` | Opsional | Pakai harga default jika tidak diisi |
| `items[].discount` | Opsional | Diskon per item |
| `vehicle_id` | Opsional | Kendaraan terkait |
| `mechanic_id` | Opsional | Mekanik yang bertugas |
| `current_km` | Opsional | KM kendaraan saat servis |
| `discount_amount` | Opsional | Default: `0` |
| `notes` | Opsional | Catatan transaksi |
| `initial_payment` | Opsional | Pembayaran awal saat create |

### `POST /api/transactions/:id/payments` — Tambah Pembayaran
| Field | Status | Keterangan |
|---|---|---|
| `amount` | **Wajib** | Nominal pembayaran |
| `payment_method` | **Wajib** | `CASH` \| `TRANSFER` \| `QRIS` \| `REFUND` |
| `reference_number` | Opsional | No. referensi transfer/QRIS |

### `POST /api/transactions/:id/cancel` — Batalkan Transaksi
| Field | Status | Keterangan |
|---|---|---|
| `reason` | Opsional | Alasan pembatalan |

> **Status transaksi:** `PENDING` → `UNPAID` → `PARTIAL` → `PAID` | `CANCELLED`
>
> **Reminder otomatis saat PAID:** `next_service_date` = tanggal transaksi + 3 bulan | `next_service_km` = current_km + 2.000 KM

---

## 💸 Expense (Pengeluaran)

### `POST /api/expenses` — Create
| Field | Status | Keterangan |
|---|---|---|
| `category` | **Wajib** | `SALARY` \| `UTILITIES` \| `PURCHASING` \| `OTHER` |
| `amount` | **Wajib** | Nominal pengeluaran |
| `date` | **Wajib** | Tanggal pengeluaran |
| `description` | Opsional | Keterangan tambahan |

### `PUT /api/expenses/:id` — Update *(partial update)*
| Field | Status | Keterangan |
|---|---|---|
| `category` | Opsional | |
| `amount` | Opsional | |
| `date` | Opsional | |
| `description` | Opsional | |

### `DELETE /api/expenses/:id` — Delete (soft delete)
Tidak memerlukan body.

---

## 📊 Query Parameters (GET List)

### Products — `GET /api/products`
| Parameter | Keterangan |
|---|---|
| `search` | Cari berdasarkan nama atau SKU |
| `category` | Filter berdasarkan kategori |
| `low_stock` | `true` untuk menampilkan stok di bawah minimum |
| `page` | Default: `1` |
| `limit` | Default: `50` |
| `sort_by` | `name` \| `sku` \| `category` \| `price_sell` \| `stock` \| `created_at` |
| `sort_order` | `ASC` \| `DESC` |

### Vehicles — `GET /api/vehicles/due-service`
Menampilkan kendaraan yang jadwal servisnya dalam 7 hari ke depan atau sudah terlewat.
