# DESAIN — Portal Pendaftaran Umrah 100 Tahun Gontor

## 1. Design Direction

Arah desain:

**Institutional, modern, calm, trustworthy.**

Bukan:
- landing page travel yang terlalu ramai;
- dashboard template generik;
- desain penuh gradient;
- kartu-kartu berlebihan;
- icon emoji;
- ilustrasi AI;
- dekorasi Islami yang berlebihan.

Portal harus terasa seperti sistem administrasi resmi yang modern.

---

# 2. Prinsip Visual

## Typography

Gunakan satu keluarga font utama.

Rekomendasi:
- Inter
- Geist

Heading:
- medium/semibold
- tidak terlalu besar

Body:
- 14–16px

Label:
- 13–14px

Angka statistik:
- 24–32px

Hindari terlalu banyak font weight.

---

# 3. Color System

Gunakan warna netral dengan satu warna identitas.

Base:
- putih
- off-white
- slate/gray

Primary:
- hijau gelap institutional

Accent:
- digunakan seperlunya

Semantic:
- success
- warning
- danger
- info

Tidak menggunakan gradient sebagai elemen utama.

Tidak menggunakan warna terlalu saturated.

---

# 4. Iconography

Gunakan icon library yang konsisten, misalnya Lucide.

Dilarang:
- emoji sebagai icon;
- campuran icon dari berbagai library;
- icon 3D;
- icon dekoratif yang tidak memiliki fungsi.

Icon harus mendukung pemahaman, bukan menjadi hiasan.

---

# 5. Landing Page

Struktur:

Header
- logo/nama program;
- Informasi;
- tombol Mulai Pendaftaran.

Hero:
- judul;
- deskripsi singkat;
- CTA;
- informasi biaya.

Section:
- pilihan keberangkatan;
- dokumen yang diperlukan;
- alur pendaftaran;
- FAQ;
- informasi kontak panitia.

Footer:
- identitas panitia;
- kontak;
- tahun.

Hero jangan memenuhi seluruh layar secara berlebihan.

---

# 6. Halaman Pendaftaran

Gunakan wizard horizontal pada desktop dan compact progress pada mobile.

Contoh:

01 Data
→
02 Jamaah
→
03 Dokumen
→
04 Pembayaran
→
05 Review

Step aktif diberi emphasis.

Step yang sudah selesai tidak perlu menggunakan animasi berlebihan.

---

# 7. Form

Gunakan dua kolom pada desktop jika field pendek.

Contoh:

| Nama Lengkap | Jenis Kelamin |
|---|---|
| Tempat Lahir | Tanggal Lahir |

Field alamat dapat dibuat full-width.

Mobile:
- satu kolom.

Input:
- border tipis;
- radius sedang;
- tinggi 44–48px;
- focus state jelas.

Label berada di atas input.

Placeholder bukan pengganti label.

---

# 8. Pendaftaran Keluarga

Setelah memilih:

"Daftar bersama keluarga"

Tampilkan:

### Kelompok Pendaftaran

PIC:
Ahmad Fauzan

Anggota:
01 Ahmad Fauzan
02 Siti Aminah
03 Muhammad Ali
04 Fatimah Zahra

CTA:
`Tambah Anggota`

Setiap anggota menjadi expandable card.

Jangan membuat semua form anggota terbuka bersamaan.

---

# 9. Dokumen

Gunakan component:

DocumentCard

Isi:

Nama dokumen
Status
Nama file
Tanggal upload
Action

Contoh:

PASPOR

Belum diunggah

[ Upload Paspor ]

Jika sudah:

PASPOR

Menunggu pemeriksaan

paspor-ahmad.pdf

[ Lihat ] [ Ganti ]

Upload menggunakan drag & drop pada desktop dan file picker pada mobile.

---

# 10. Upload State

State:

Idle
Uploading
Processing
Uploaded
Verification
Rejected

Jangan hanya menampilkan spinner.

Saat upload:

"Sedang mengunggah dokumen..."

Saat selesai:

"Dokumen berhasil diunggah."

Jika gagal:

"Dokumen belum berhasil diunggah. Silakan coba lagi."

Error teknis tidak ditampilkan mentah kepada jamaah.

---

# 11. Payment Page

Tampilkan:

Total biaya
Rp37.200.000

Pilihan:

Bayar penuh
Rp37.200.000

atau

Bayar DP
Rp5.000.000

Setelah pilihan:

Nominal pembayaran
Upload bukti transfer

Informasi rekening ditampilkan dalam panel khusus.

Nomor rekening jangan dijadikan headline visual.

---

# 12. Review Page

Gunakan summary sections:

### Data Pendaftaran
Jenis: Keluarga
PIC: Ahmad Fauzan
Keberangkatan: Surabaya

### Jamaah
4 orang

### Dokumen
3 lengkap
1 belum lengkap

### Pembayaran
DP
Rp5.000.000
Menunggu verifikasi

Tampilkan warning jika masih ada kekurangan.

---

# 13. Success Page

Setelah submit:

Pendaftaran berhasil diterima.

Kode Pendaftaran:

`UMR-2026-G0001`

Informasi:
"Simpan kode ini untuk memeriksa status pendaftaran."

CTA:
`Lihat Status Pendaftaran`

Jangan menggunakan confetti atau animasi berlebihan.

---

# 14. Status Page

Header:

UMR-2026-G0001

Dalam Pemeriksaan Panitia

Timeline:

Data
✓

Dokumen
Sedang diperiksa

Pembayaran
Menunggu verifikasi

Keberangkatan
Surabaya

Kemudian daftar anggota:

Ahmad
Data lengkap
Dokumen lengkap

Siti
Data lengkap
Paspor perlu diperbaiki

---

# 15. Admin Dashboard

Layout desktop:

Sidebar kiri
Main content
Utility area kanan atas

Sidebar:

Dashboard
Pendaftaran
Jamaah
Dokumen
Pembayaran
Keberangkatan
Manifest
Ekspor
Pengaturan

Pada mobile:
- sidebar menjadi drawer;
- tabel menjadi card/list;
- filter menjadi bottom sheet atau collapsible panel.

---

# 16. Dashboard Admin

Top cards:

Total Jamaah
Total Kelompok
Dokumen Perlu Diperiksa
Pembayaran Perlu Diperiksa

Kemudian:

Pendaftaran terbaru

dan:

Kondisi dokumen

Hindari dashboard dengan 10+ chart.

Data operasional lebih penting daripada visualisasi.

---

# 17. Table

Table desktop:

| Kode | PIC | Jamaah | Keberangkatan | Dokumen | Pembayaran | Status |
|---|---|---:|---|---|---|---|

Gunakan:
- sticky header;
- pagination;
- search;
- filter;
- column visibility.

Mobile:
jangan memaksa tabel horizontal terlalu lebar.

Gunakan card row dengan informasi terpenting.

---

# 18. Detail Kelompok

Header:

UMR-2026-G0001
Ahmad Fauzan
4 Jamaah
Surabaya

Tabs:

Overview
Jamaah
Dokumen
Pembayaran
Activity

Tab Jamaah:

| Nama | Hubungan | Paspor | Dokumen | Status |
|---|---|---|---|---|

Klik nama membuka detail.

---

# 19. Verification UI

Panitia melihat dokumen dalam split view:

Kiri:
data jamaah

Kanan:
preview dokumen

Action:

`Verifikasi`
`Minta Perbaikan`
`Tolak`

Jika minta perbaikan:
modal:

Alasan perbaikan
[ textarea ]

[ Kirim Permintaan Perbaikan ]

---

# 20. Status Badges

Gunakan badge sederhana.

Contoh:

Verified
Pending
Revision Required
Incomplete

Badge tidak boleh menjadi satu-satunya indikator. Gunakan text yang jelas.

---

# 21. Empty State

Jangan menggunakan ilustrasi besar.

Contoh:

Belum ada pendaftaran.

Pendaftaran jamaah akan muncul di halaman ini setelah jamaah mengirim formulir.

---

# 22. Loading

Gunakan skeleton untuk halaman data.

Jangan menggunakan full-screen spinner kecuali proses autentikasi atau proses kritis.

---

# 23. Responsive Behavior

Breakpoint utama:

Mobile
Tablet
Desktop

Mobile harus menjadi prioritas karena jamaah kemungkinan besar mengisi melalui WhatsApp/HP.

Target:
- tombol mudah ditekan;
- input tidak terlalu kecil;
- file upload mudah;
- keyboard tidak menutupi CTA;
- review mudah dibaca.

---

# 24. Accessibility

Minimal:

- contrast yang cukup;
- keyboard navigation;
- visible focus;
- label form;
- aria-label untuk icon-only button;
- error message terkait field;
- jangan mengandalkan warna saja.

---

# 25. Interaction

Animasi sangat ringan:

- 150–200ms;
- opacity;
- translate kecil;
- accordion;
- drawer.

Hindari:
- parallax;
- cursor gimmick;
- bouncing cards;
- excessive hover;
- loading animation dekoratif.

Sistem administrasi harus terasa cepat.

---

# 26. Visual Hierarchy

Prioritas:

1. Apa yang harus dilakukan user sekarang?
2. Apa status pendaftaran?
3. Data apa yang masih kurang?
4. Action apa yang tersedia?
5. Informasi tambahan.

Jangan membuat semua elemen terlihat sama penting.

---

# 27. File Upload UX

Dropzone:

Upload dokumen

PDF, JPG, JPEG, PNG
Maksimal ukuran sesuai konfigurasi sistem.

Pada mobile:

[ Pilih File ]

Setelah dipilih:
- filename;
- size;
- progress;
- status.

---

# 28. Design Tokens

Contoh struktur:

--background
--surface
--surface-muted
--border
--text-primary
--text-secondary
--text-muted
--primary
--primary-hover
--success
--warning
--danger
--radius-sm
--radius-md
--radius-lg
--shadow-sm
--shadow-md

Jangan hardcode warna di setiap component.

---

# 29. Component Architecture

Reusable components:

Button
Input
Select
DatePicker
PhoneInput
Textarea
FileUpload
DocumentCard
StatusBadge
ProgressSteps
MemberCard
PaymentCard
SummarySection
DataTable
FilterBar
Modal
Drawer
Toast
EmptyState
Skeleton
ConfirmDialog

---

# 30. UX Copy

Gunakan Bahasa Indonesia formal tetapi manusiawi.

Contoh:

Kurang baik:
"Oops! File kamu gagal di-upload!"

Lebih baik:
"Dokumen belum berhasil diunggah. Silakan coba lagi."

Kurang baik:
"Submit"

Lebih baik:
"Kirim Pendaftaran"

Kurang baik:
"Error 500"

Lebih baik:
"Terjadi kendala saat menyimpan data. Silakan coba kembali."

---

# 31. Anti AI-Slop Rules

Tidak boleh:

- gradient background sebagai dekorasi utama;
- glassmorphism berlebihan;
- floating cards di semua section;
- terlalu banyak rounded container;
- emoji sebagai icon;
- ilustrasi AI random;
- dashboard dengan chart yang tidak diperlukan;
- typography terlalu besar;
- animasi berlebihan;
- copywriting marketing generik;
- "future-ready", "seamless", "next-generation" tanpa fungsi nyata.

Target desain:

**tenang, administratif, modern, cepat, dan dapat dipercaya.**

---

# 32. Mobile Priority

Urutan prioritas:

1. Form
2. Upload dokumen
3. Status
4. Review
5. Payment
6. Informasi

Desktop dapat memberikan lebih banyak konteks.

Mobile harus menyembunyikan kompleksitas yang tidak diperlukan.

---

# 33. Admin Design Philosophy

Admin tidak perlu dibuat "cantik" seperti landing page.

Yang lebih penting:
- density informasi;
- search;
- filter;
- keyboard efficiency;
- bulk action;
- export;
- status;
- document verification.

Panitia harus dapat memproses banyak jamaah tanpa membuka terlalu banyak halaman.
