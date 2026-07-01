# Alur & Cara Kerja Aplikasi AutoWorkshop MMS

> Catatan logika aplikasi dalam bahasa sehari-hari. Fokus utama: **apa yang terjadi ketika sebuah aksi dilakukan, dan efek berantainya ke bagian lain**. Bukan dokumentasi teknis.

---

## Daftar Isi
1. [Gambaran Umum](#1-gambaran-umum)
2. [Dua Jenis Pengguna: Admin & Kasir](#2-dua-jenis-pengguna-admin--kasir)
3. [Login & Keluar](#3-login--keluar)
4. [Dashboard (Halaman Utama)](#4-dashboard-halaman-utama)
5. [Transaksi / POS (Jantung Aplikasi)](#5-transaksi--pos-jantung-aplikasi)
6. [Status Transaksi & Artinya](#6-status-transaksi--artinya)
7. [Pembayaran & Cicilan](#7-pembayaran--cicilan)
8. [Membatalkan Transaksi](#8-membatalkan-transaksi)
9. [Mengedit Transaksi (Bon Sementara / Rawat Inap)](#9-mengedit-transaksi-bon-sementara--rawat-inap)
10. [Produk / Suku Cadang](#10-produk--suku-cadang)
11. [Layanan & Paket](#11-layanan--paket)
12. [Stok / Inventori](#12-stok--inventori)
13. [Pelanggan](#13-pelanggan)
14. [Kendaraan & Pengingat Servis](#14-kendaraan--pengingat-servis)
15. [Pengeluaran](#15-pengeluaran)
16. [Laporan](#16-laporan)
17. [Montir, Pengaturan, Riwayat Aktivitas](#17-montir-pengaturan-riwayat-aktivitas)
18. [Struk / Cetak](#18-struk--cetak)
19. [Ringkasan Semua Efek Berantai](#19-ringkasan-semua-efek-berantai-penting)

---

## 1. Gambaran Umum

Aplikasi ini adalah sistem pengelolaan bengkel mobil. Intinya: mencatat **penjualan & servis** (transaksi), mengelola **stok suku cadang**, mendata **pelanggan & kendaraannya**, mengingatkan **jadwal servis berikutnya**, mencatat **pengeluaran**, dan merangkum semuanya jadi **laporan**.

Semua data saling terhubung. Misalnya satu transaksi servis bisa langsung: mengurangi stok suku cadang, menjadwalkan servis berikutnya untuk mobil itu, dan masuk ke angka penjualan di dashboard & laporan. Dokumen ini menjelaskan keterhubungan-keterhubungan seperti itu.

**Hal penting yang berlaku di seluruh aplikasi:**
- **Data tidak benar-benar dihapus permanen.** Saat sesuatu "dihapus" (pelanggan, kendaraan, produk), datanya hanya disembunyikan, bukan dimusnahkan. Ini menjaga agar riwayat transaksi lama tidak rusak.
- **Setiap perubahan satu paket utuh.** Kalau di tengah proses ada satu langkah gagal (misal stok kurang saat checkout), maka **seluruh aksi dibatalkan** dan tidak ada yang berubah separuh-separuh. Tidak ada kondisi "stok sudah berkurang tapi transaksi gagal tersimpan".
- **Hampir semua aktivitas dicatat** ke Riwayat Aktivitas (audit log) — siapa melakukan apa dan kapan.

---

## 2. Dua Jenis Pengguna: Admin & Kasir

Ada dua peran, dan yang membedakan adalah **seberapa banyak yang boleh diakses**.

| Yang bisa dilakukan | Admin | Kasir |
|---|:---:|:---:|
| Buat transaksi baru (POS) | ✅ | ✅ |
| Tambah pembayaran / cicilan | ✅ | ✅ |
| Edit transaksi (yang masih boleh diedit) | ✅ | ✅ |
| Kelola pelanggan & kendaraan | ✅ | ✅ |
| Tandai kendaraan "sudah dihubungi" | ✅ | ✅ |
| **Membatalkan transaksi** | ✅ | ❌ |
| **Kelola produk, layanan, paket** | ✅ | ❌ |
| **Catat/ubah/hapus pengeluaran** | ✅ | ❌ |
| **Buka laporan, audit log, pengaturan, montir** | ✅ | ❌ |

> 📌 **Efek berantai peran:** Kasir hanya melihat menu inti (Dashboard, Transaksi/POS, Pelanggan, Kendaraan, Pembayaran). Menu seperti Produk, Laporan, dan Pengaturan tidak muncul untuk kasir. Jadi membuat akun baru sebagai "Kasir" otomatis menyembunyikan banyak menu sekaligus.

---

## 3. Login & Keluar

- Masuk dengan **username + password**. Ada opsi "ingat saya 14 hari".
- Setelah berhasil masuk, langsung diarahkan ke **Dashboard**.
- Tombol keluar ada di area info pengguna. Setelah keluar, sesi diputus dan kembali ke halaman login.

---

## 4. Dashboard (Halaman Utama)

Halaman ringkasan yang menampilkan kondisi bengkel hari ini sekilas:

- **Penjualan & jumlah transaksi** hari ini dan bulan ini.
- **Total pelanggan, kendaraan, produk**, dan **jumlah produk yang stoknya menipis**.
- **Akses cepat** ke menu-menu penting.
- **Kotak pengingat servis** (latar merah) — hanya muncul kalau ada mobil yang jadwalnya sudah dekat/terlewat. Dari sini bisa langsung menghubungi pelanggan.

> 📌 **Efek berantai angka dashboard:** Angka "Penjualan Hari Ini/Bulan Ini" **hanya menghitung transaksi yang sudah menjadi tagihan resmi** — yaitu yang berstatus *Belum Bayar*, *Cicilan*, atau *Lunas*. Transaksi yang masih *Menunggu* (bon sementara) dan yang *Dibatalkan* **tidak dihitung**. Jadi membuat bon sementara tidak akan menaikkan angka penjualan sampai bon itu diresmikan.

> 📌 **Efek berantai "stok menipis":** Angka ini menghitung produk yang stoknya **lebih sedikit atau sama dengan batas minimum** yang Anda tetapkan per produk. Jadi mengubah "batas minimum stok" sebuah produk bisa membuat produk itu tiba-tiba masuk/keluar dari daftar "menipis", walau jumlah stoknya tidak berubah.

---

## 5. Transaksi / POS (Jantung Aplikasi)

Ini layar kasir untuk membuat penjualan/servis. Alurnya:

**Langkah 1 — Pilih barang/jasa.** Ada 4 jenis item yang bisa dimasukkan ke keranjang:
- **Produk** (suku cadang dari stok) — mengurangi stok.
- **Layanan** (jasa, mis. ganti oli) — tidak ada stok, harga bisa disesuaikan saat itu.
- **Paket** (gabungan beberapa produk/jasa jadi satu harga) — komponen produknya mengurangi stok.
- **Lainnya** (item dadakan dari luar, mis. beli sparepart di toko lain) — diketik manual, tidak menyentuh stok.

**Langkah 2 — Pilih kendaraan & montir (opsional).** Bisa pilih kendaraan terdaftar, atau biarkan "Walk-in" (tanpa kendaraan). Jika kendaraan dipilih, bisa pilih montir dan isi **KM saat ini** (km mobil sekarang).

**Langkah 3 — Atur jumlah, diskon, catatan.** Tiap item bisa diatur kuantitasnya. Ada diskon per item dan diskon keseluruhan.

**Langkah 4 — Tentukan pembayaran.** Pilih metode (Tunai/Transfer/QRIS/Debit/Kredit/Lainnya) dan jumlah yang dibayar. Bisa juga **disimpan sebagai bon sementara** (belum bayar).

**Langkah 5 — Proses.** Muncul layar sukses dengan nomor transaksi, lalu bisa **cetak struk**, lihat daftar transaksi, atau buat transaksi baru.

> 📌 **Efek berantai harga:** Harga produk/paket yang dipakai **selalu diambil dari data master saat itu**, bukan dari yang tertera di layar kasir. Ini supaya harga tidak bisa "diakali". Untuk layanan, harga boleh disesuaikan manual saat transaksi.

> 📌 **Efek berantai stok saat checkout:** Begitu transaksi diproses, **stok produk langsung berkurang saat itu juga** — tidak peduli sudah dibayar atau belum. Bon sementara yang berisi produk pun **tetap mengurangi stok**.

> 📌 **Efek berantai stok kurang:** Kalau stok salah satu barang tidak cukup (termasuk komponen di dalam sebuah paket), **seluruh transaksi ditolak** dan tidak ada stok yang berkurang. Tidak bisa checkout produk melebihi stok yang ada.

> 📌 **Efek berantai uang lebih (kembalian):** Kalau pelanggan bayar tunai lebih besar dari total, **yang dicatat hanya sebesar tagihan**. Kelebihannya dianggap kembalian, bukan pemasukan — supaya laporan keuangan tidak menggelembung.

---

## 6. Status Transaksi & Artinya

Setiap transaksi punya satu status yang menentukan perilakunya:

| Status | Arti | Bisa diedit? | Dihitung di laporan? |
|---|---|:---:|:---:|
| **Menunggu** (Pending) | Bon sementara / rawat inap. Pekerjaan belum diresmikan. | ✅ | ❌ |
| **Belum Bayar** (Unpaid) | Sudah resmi jadi tagihan, belum dibayar sepeser pun. | ✅ | ✅ |
| **Cicilan** (Partial) | Sudah dibayar sebagian, masih ada sisa. | ✅ | ✅ |
| **Lunas** (Paid) | Sudah dibayar penuh. | ❌ | ✅ |
| **Dibatalkan** (Cancelled) | Transaksi dibatalkan. | ❌ | ❌ |

**Bagaimana status awal ditentukan saat checkout:**
- Disimpan sebagai bon sementara, belum bayar → **Menunggu**.
- Tidak disimpan sebagai bon, belum bayar → **Belum Bayar**.
- Dibayar sebagian → **Cicilan**.
- Dibayar penuh → **Lunas**.

> 📌 **Efek berantai status Lunas:** Begitu sebuah transaksi yang ada kendaraannya menjadi **Lunas**, aplikasi otomatis **menjadwalkan servis berikutnya** untuk mobil itu (lihat [bagian Kendaraan](#14-kendaraan--pengingat-servis)).

> 📌 **Efek berantai "tidak bisa diedit":** Transaksi yang sudah **Lunas** atau **Dibatalkan** terkunci — tidak bisa diubah isinya lagi. Kalau ada kesalahan pada transaksi lunas, jalan satu-satunya adalah membatalkannya (khusus Admin).

---

## 7. Pembayaran & Cicilan

Transaksi yang belum lunas (Belum Bayar / Cicilan / Menunggu) bisa ditambahi pembayaran kapan saja dari halaman riwayat transaksi.

- Isi jumlah bayar dan metode. Untuk metode non-tunai bisa isi nomor referensi.
- Status akan **naik otomatis** sesuai jumlah terbayar:
  - Bayar sebagian → jadi **Cicilan**.
  - Bayar sampai lunas → jadi **Lunas**.

> 📌 **Efek berantai pembayaran melebihi sisa:** Kalau jumlah bayar lebih besar dari sisa tagihan, **yang tercatat hanya sebesar sisanya**. Tidak ada "saldo lebih" yang tersimpan.

> 📌 **Efek berantai pelunasan:** Saat pembayaran membuat transaksi (yang ada kendaraannya) menjadi **Lunas**, jadwal servis berikutnya mobil tersebut langsung dihitung & disetel.

> 📌 **Batasan:** Tidak bisa menambah pembayaran ke transaksi yang sudah **Lunas** (sudah selesai) atau **Dibatalkan**.

---

## 8. Membatalkan Transaksi

Hanya **Admin** yang bisa membatalkan. Membatalkan transaksi memicu beberapa efek sekaligus:

> 📌 **Efek berantai pembatalan:**
> 1. **Stok dikembalikan.** Semua produk yang tadinya berkurang karena transaksi ini ditambahkan kembali ke stok.
> 2. **Pembayaran dikembalikan (refund).** Jika sudah ada uang masuk, dicatat sebagai pengembalian dana.
> 3. **Jadwal servis ditata ulang.** Kalau transaksi yang dibatalkan tadinya sudah Lunas dan sempat menjadwalkan servis berikutnya, maka jadwal itu **dihitung ulang berdasarkan transaksi lunas terakhir lainnya** untuk mobil tersebut. Kalau tidak ada transaksi lunas lain, jadwal servisnya **dikosongkan**.
> 4. **Hilang dari laporan.** Transaksi yang dibatalkan tidak lagi dihitung dalam penjualan/laporan.

Transaksi dengan status apa pun bisa dibatalkan (termasuk yang sudah Lunas), **kecuali** yang memang sudah berstatus Dibatalkan.

---

## 9. Mengedit Transaksi (Bon Sementara / Rawat Inap)

Konsep "bon sementara" (rawat inap): mobil ditinggal di bengkel, pekerjaan/sparepart ditambahkan bertahap, baru ditagih saat selesai.

- Hanya transaksi berstatus **Menunggu, Belum Bayar, atau Cicilan** yang bisa diedit.
- Saat edit bisa: menambah item baru, mengubah jumlah, menghapus item, mengubah diskon, catatan, montir, dan KM.

> 📌 **Efek berantai edit terhadap stok:** Aplikasi membandingkan jumlah lama vs baru per produk. Kalau jumlah produk **dinaikkan**, stok berkurang lagi (dicek dulu ketersediaannya). Kalau **diturunkan/dihapus**, stok dikembalikan. Jadi mengedit isi transaksi otomatis menyesuaikan stok.

> 📌 **Efek berantai status setelah edit:** Setelah diedit, status dihitung ulang berdasarkan uang yang sudah masuk vs total baru. Misalnya total dinaikkan melebihi yang sudah dibayar, status bisa turun dari "Lunas-sebagian" jadi "Cicilan", dst. (Mengedit tidak menambah pembayaran.)

> 📌 **Batasan paket:** Item berjenis **Paket tidak bisa diutak-atik saat edit** — tidak bisa ditambah, dihapus, atau diubah jumlahnya. Paket hanya bisa diatur saat transaksi dibuat pertama kali.

---

## 10. Produk / Suku Cadang

Dikelola oleh Admin. Tiap produk punya: kode (SKU), nama, kategori, harga beli, harga jual, jumlah stok, dan batas minimum stok.

- **SKU otomatis jadi huruf besar** dan tidak boleh kembar.
- **Jumlah stok tidak diubah lewat form edit produk.** Mengubah stok dilakukan lewat menu Inventori (Stok Masuk / Stok Opname) supaya setiap perubahan stok tercatat alasannya.

> 📌 **Efek berantai hapus produk:** Produk **tidak bisa dihapus kalau masih dipakai oleh paket yang aktif**. Aplikasi akan menolak dan memberi tahu paket mana saja yang memakainya. Solusinya: keluarkan dulu produk itu dari paket, atau nonaktifkan paketnya. (Ini contoh persis seperti yang Anda maksud.)

> 📌 **Efek berantai hapus produk vs riwayat:** Produk yang sudah pernah masuk transaksi **tetap boleh dihapus** (selama tidak dipakai paket aktif). Karena penghapusan hanya menyembunyikan data, transaksi lama tetap menampilkan produk itu dengan benar.

> 📌 **Status stok produk:** "Menipis" = stok ≤ batas minimum; "Habis" = stok 0. Status ini muncul sebagai label dan memengaruhi angka "stok menipis" di dashboard serta apakah produk bisa dijual di POS.

---

## 11. Layanan & Paket

**Layanan** = jasa bengkel (mis. ganti oli, tune-up). Punya nama, harga, deskripsi. Tidak punya stok. Saat dijual di POS, harganya boleh disesuaikan.

**Paket** = gabungan beberapa produk dan/atau layanan dijual dengan satu harga. Tiap paket bisa diaktif/nonaktifkan.

> 📌 **Efek berantai ketersediaan paket:** Sebuah paket hanya bisa dijual kalau **stok semua komponen produknya mencukupi**. Kalau salah satu komponen habis, paket ditandai "stok kurang" dan tidak bisa diproses. Jadi habisnya satu suku cadang bisa membuat satu paket ikut tidak bisa dijual.

> 📌 **Efek berantai biaya & laba paket:** Saat paket terjual, "modal" paket dihitung dari penjumlahan harga beli semua komponen produknya. Layanan dianggap tanpa modal.

> 📌 **Keterkaitan dengan hapus produk:** Lihat [bagian Produk](#10-produk--suku-cadang) — produk yang masih jadi komponen paket aktif terlindungi dari penghapusan.

---

## 12. Stok / Inventori

Semua perubahan jumlah stok tercatat sebagai riwayat (masuk/keluar/penyesuaian), lengkap dengan jumlah sebelum & sesudah. Ada tiga cara stok berubah:

1. **Stok Masuk (restock):** Menambah stok karena pembelian/kulakan. Bisa sekalian memperbarui harga beli.
   > 📌 **Efek berantai harga beli rata-rata:** Saat memasukkan stok dengan harga beli baru, harga beli produk **dihitung ulang sebagai rata-rata tertimbang** antara stok lama dan barang baru. Jadi harga modal produk bergeser mengikuti pembelian terakhir — ini memengaruhi perhitungan laba ke depannya.

2. **Stok Keluar:** Terjadi **otomatis** saat produk terjual lewat transaksi (tidak diinput manual).

3. **Stok Opname (penyesuaian):** Mencocokkan stok sistem dengan stok fisik hasil hitung gudang. Masukkan jumlah fisik sebenarnya, sistem mencatat selisihnya.
   > 📌 **Efek berantai stok opname:** Penyesuaian stok opname **tidak dianggap sebagai penjualan atau pengeluaran** — murni koreksi jumlah, jadi tidak mengacaukan laporan keuangan. Jumlah fisik tidak boleh diisi angka negatif.

> 📌 **Keterkaitan dengan transaksi:** Saat transaksi dibuat → stok keluar (tercatat "OUT" dengan nomor transaksi). Saat transaksi dibatalkan atau jumlahnya dikurangi saat edit → stok kembali (tercatat "IN"). Semua bisa ditelusuri di riwayat stok.

---

## 13. Pelanggan

Data pelanggan: nama, nomor HP (wajib), alamat, foto (opsional). Satu pelanggan bisa punya banyak kendaraan.

> 📌 **Efek berantai nomor HP kembar:** Tidak boleh ada dua pelanggan dengan **nomor HP yang sama**. Sistem menolak jika nomor sudah dipakai pelanggan lain yang masih aktif.

> 📌 **Efek berantai hapus pelanggan:** Menghapus pelanggan **otomatis ikut menyembunyikan semua kendaraan miliknya**. Namun riwayat transaksi tidak terhapus — datanya tetap utuh untuk laporan. (Penghapusan bersifat menyembunyikan, bukan memusnahkan.)

---

## 14. Kendaraan & Pengingat Servis

Data kendaraan: pemilik (pelanggan), plat nomor (wajib, unik), merek, model, KM saat ini, **tanggal servis berikutnya**, dan **KM servis berikutnya**.

**Bagaimana sebuah mobil masuk daftar "perlu servis":**
- Mobil dianggap mendekati servis jika **tanggal servis berikutnya tinggal 7 hari lagi atau kurang** (termasuk yang sudah terlewat).
- Statusnya: **Servis Lewat** (sudah lewat tanggal), **Servis Hari Ini**, atau **Akan Datang**.

**Menghubungi pelanggan:** Dari Dashboard atau halaman Kendaraan, mobil yang perlu servis bisa ditindaklanjuti:
- Tombol **"Hubungi"** membuka dialog dengan tautan **WhatsApp** (nomor pelanggan otomatis terisi) dan kolom catatan.
- **"Tandai Dihubungi"** menyimpan bahwa pelanggan sudah dikontak (lengkap dengan waktu, siapa yang menghubungi, dan catatannya). Mobil itu lalu menampilkan label "Dihubungi".
- **"Reset reminder"** menghapus tanda "sudah dihubungi" — berguna kalau perlu menghubungi ulang.

> 📌 **Efek berantai transaksi Lunas → jadwal servis baru:** Setiap kali sebuah transaksi (yang ada kendaraannya) menjadi **Lunas**, aplikasi otomatis menyetel **servis berikutnya = tanggal transaksi + 3 bulan** dan **KM servis berikutnya = KM saat itu + 2.000 km**. Jadi pelanggan yang baru servis otomatis terjadwal untuk servis berikutnya tanpa input manual.

> 📌 **Efek berantai pembatalan terhadap jadwal:** Kalau transaksi lunas tadi dibatalkan, jadwal servis ditata ulang dari transaksi lunas terakhir lainnya, atau dikosongkan bila tidak ada (lihat [bagian Pembatalan](#8-membatalkan-transaksi)).

> 📌 **Efek berantai hapus pelanggan:** Menghapus pemilik akan menyembunyikan kendaraannya juga (lihat [bagian Pelanggan](#13-pelanggan)).

---

## 15. Pengeluaran

Hanya **Admin** yang bisa mencatat/mengubah/menghapus pengeluaran. Kategori: Gaji, Utilitas, Pembelian, Lainnya. Tiap pengeluaran punya tanggal, deskripsi, dan jumlah.

> 📌 **Efek berantai ke laba:** Pengeluaran **langsung mengurangi laba** di Laporan Keuangan. Rumus laba kotor yang dipakai aplikasi: **uang yang benar-benar diterima − total pengeluaran** pada rentang tanggal tersebut.

---

## 16. Laporan

Hanya **Admin**. Ada beberapa sudut pandang:

- **Keuangan:** total penjualan, uang yang sudah diterima, sisa tagihan (piutang), total pengeluaran per kategori, dan laba kotor.
- **Penjualan:** produk & layanan terlaris, tren penjualan harian.
- **Inventori:** total produk, nilai stok, daftar stok menipis & habis.

> 📌 **Efek berantai status terhadap laporan:** Semua laporan **hanya menghitung transaksi berstatus Belum Bayar, Cicilan, dan Lunas**. Transaksi **Menunggu (bon sementara)** dan **Dibatalkan** selalu dikecualikan. Maka:
> - "Total penjualan" memakai nilai tagihan (termasuk yang belum/baru sebagian dibayar).
> - "Uang diterima" hanya menghitung pembayaran yang betul-betul masuk.
> - "Sisa tagihan/piutang" = total penjualan − uang diterima.

---

## 17. Montir, Pengaturan, Riwayat Aktivitas

- **Montir:** (Admin) daftar mekanik bengkel. Montir yang aktif bisa dipilih saat membuat transaksi servis, dan namanya muncul di struk/work order.
- **Pengaturan:** (Admin) dua bagian:
  - *Informasi Bengkel:* logo, nama, telepon, alamat, **lebar printer (58mm/80mm)**, dan pesan footer struk. → Ini langsung memengaruhi tampilan struk yang dicetak.
  - *Pengguna:* tambah akun baru (Admin/Kasir), aktif/nonaktifkan pengguna.
- **Riwayat Aktivitas (Audit Log):** (Admin) catatan otomatis semua aksi penting — siapa membuat/mengubah/menghapus apa dan kapan.

> 📌 **Efek berantai pengaturan struk:** Mengubah lebar printer atau pesan footer di Pengaturan langsung mengubah hasil cetak struk berikutnya, tanpa perlu ubah apa pun di transaksi.

---

## 18. Struk / Cetak

Setiap transaksi bisa dicetak sebagai **struk pembayaran** atau **work order** (perintah kerja). Isinya menyesuaikan data bengkel di Pengaturan dan isi transaksi:
- Identitas bengkel (nama, alamat, telepon, logo) dari Pengaturan.
- Detail transaksi: nomor, tanggal, kasir, montir.
- Pelanggan & kendaraan: nama, plat, merek/model, KM.
- Rincian item, subtotal, diskon, total.
- Bagian pembayaran (di struk): metode, jumlah, sisa tagihan, dan kembalian bila bayar tunai berlebih.
- Pesan footer dari Pengaturan.

> 📌 **Efek berantai work order vs struk:** Tampilan "work order" menyembunyikan bagian pembayaran (untuk diberikan ke montir/pelanggan saat pengerjaan), sedangkan "struk" menampilkan rincian pembayaran lengkap.

---

## 19. Ringkasan Semua Efek Berantai (Penting)

| Aksi | Efek berantai yang terjadi |
|---|---|
| **Checkout transaksi (POS)** | Stok produk langsung berkurang (walau belum dibayar). Jika ada kendaraan & langsung lunas → jadwal servis berikutnya disetel. |
| **Stok kurang saat checkout** | Seluruh transaksi ditolak; tidak ada yang berubah. |
| **Bayar tunai berlebih** | Hanya sebesar tagihan yang dicatat; sisanya dianggap kembalian. |
| **Transaksi jadi Lunas** | Jadwal servis mobil disetel: +3 bulan & +2.000 km. |
| **Membatalkan transaksi** (Admin) | Stok dikembalikan + refund dicatat + jadwal servis ditata ulang/dikosongkan + hilang dari laporan. |
| **Edit transaksi: naikkan jumlah produk** | Stok berkurang lagi (dicek dulu cukup/tidak). |
| **Edit transaksi: turunkan/hapus produk** | Stok dikembalikan. |
| **Hapus produk** | Ditolak jika masih dipakai paket aktif; jika tidak, produk disembunyikan tapi riwayat transaksi tetap utuh. |
| **Stok salah satu komponen habis** | Paket yang memuatnya jadi "stok kurang" & tak bisa dijual. |
| **Stok Masuk dengan harga baru** | Harga beli produk dihitung ulang sebagai rata-rata tertimbang → memengaruhi laba berikutnya. |
| **Stok Opname** | Stok dikoreksi tanpa dihitung sebagai penjualan/pengeluaran. |
| **Hapus pelanggan** | Semua kendaraannya ikut disembunyikan; riwayat transaksi tetap utuh. |
| **Ubah harga master produk** | Transaksi baru memakai harga baru; transaksi lama tetap pakai harga saat itu. |
| **Ubah batas minimum stok** | Bisa mengubah status "menipis" produk & angka di dashboard tanpa mengubah stok. |
| **Catat pengeluaran** (Admin) | Langsung mengurangi laba di Laporan Keuangan. |
| **Ubah Pengaturan bengkel/printer** | Langsung mengubah tampilan struk berikutnya. |
| **Buat akun sebagai Kasir** | Banyak menu (Produk, Laporan, Pengaturan, dll) otomatis tersembunyi. |

---

*Dokumen ini menjelaskan perilaku aplikasi sebagaimana yang berjalan saat ini. Bila ada aturan bisnis yang diubah di kode, perbarui juga catatan ini.*
