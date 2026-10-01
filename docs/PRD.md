# PRD — Portal Pendaftaran Umrah 100 Tahun Gontor

## 1. Ringkasan Produk

Portal ini digunakan untuk pendataan jamaah Umrah 100 Tahun Gontor dengan prinsip utama:

> Jamaah dibuat sesederhana mungkin. Kerumitan administrasi dipindahkan ke sisi panitia.

Sistem menangani:
- pendaftaran jamaah individu;
- pendaftaran kolektif keluarga;
- data identitas setiap jamaah;
- dokumen KTP, KK, kartu vaksin, dan paspor;
- pembayaran penuh atau DP;
- pilihan titik keberangkatan: Jakarta, Surabaya, atau Gontor;
- status verifikasi dokumen;
- status pembayaran;
- pengelolaan data oleh panitia;
- ekspor data untuk kebutuhan manifest, room-list, dan administrasi travel.

Database utama menggunakan Supabase PostgreSQL. Berkas tidak disimpan di database maupun Supabase Storage, tetapi di Google Drive. Supabase hanya menyimpan metadata dan link/ID berkas.

Deployment:
- Frontend + server application: Vercel
- Database + Auth + RLS: Supabase
- File storage: Google Drive API
- Framework: Next.js + TypeScript

---

# 2. Tujuan

## Tujuan Utama

1. Memudahkan jamaah mengirim data dan berkas.
2. Memungkinkan satu pendaftar mendaftarkan beberapa anggota keluarga.
3. Menghindari pengisian data berulang.
4. Mengurangi file storage di database.
5. Memudahkan panitia memverifikasi dokumen.
6. Memudahkan panitia menghasilkan data manifest.
7. Menyediakan data yang siap diteruskan ke travel.
8. Menyediakan audit trail perubahan data penting.

## Prinsip UX

- Mobile-first.
- Satu halaman tidak terlalu padat.
- Progressive disclosure.
- Auto-save.
- Data keluarga cukup dimasukkan satu kali.
- Dokumen dapat dilengkapi kemudian.
- Jamaah tidak perlu memahami istilah teknis.
- Error harus menjelaskan apa yang harus diperbaiki.
- Tidak menggunakan dekorasi berlebihan.

---

# 3. Aktor

## Jamaah

Dapat:
- membuat pendaftaran;
- memilih individu atau keluarga;
- mengisi data;
- menambahkan anggota keluarga;
- mengunggah dokumen;
- memilih keberangkatan;
- mengirim bukti pembayaran;
- melihat status pendaftaran;
- memperbaiki data yang dikembalikan panitia.

## Panitia

Dapat:
- melihat seluruh pendaftaran;
- melihat anggota dalam satu kelompok;
- memverifikasi data;
- memverifikasi dokumen;
- memverifikasi pembayaran;
- mengubah status;
- melihat file Google Drive;
- mengunduh/ekspor data;
- mengelola pilihan keberangkatan;
- mengelola paket/biaya;
- melihat log aktivitas.

## Admin

Memiliki seluruh hak panitia dan:
- mengelola akun panitia;
- mengelola konfigurasi sistem;
- mengatur hak akses;
- mengubah konfigurasi Google Drive;
- melihat audit log.

---

# 4. Konsep Pendaftaran

Sistem membedakan:

### A. Pendaftaran Sendiri

Satu pendaftar = satu jamaah.

Contoh:
- Ahmad mendaftar sendiri.

### B. Pendaftaran Keluarga

Satu pendaftar membuat satu kelompok.

Contoh:

Kelompok:
- PIC: Ahmad

Anggota:
- Ahmad — Suami
- Siti — Istri
- Ali — Anak
- Fatimah — Anak

Setiap anggota tetap memiliki record jamaah sendiri karena masing-masing memiliki:
- NIK;
- paspor;
- tanggal lahir;
- dokumen;
- status verifikasi;
- data manifest.

Kelompok hanya digunakan untuk menghubungkan mereka.

---

# 5. User Journey Jamaah

## Step 1 — Landing

Informasi singkat:
- Umrah 100 Tahun Gontor
- biaya;
- pilihan keberangkatan;
- dokumen yang diperlukan;
- catatan jamaah di bawah umur;
- tombol "Mulai Pendaftaran".

Jangan langsung menampilkan form panjang.

## Step 2 — Jenis Pendaftaran

Pilihan:

- Saya mendaftar sendiri
- Saya mendaftarkan keluarga

Jika keluarga, sistem membuat `registration_group`.

## Step 3 — Data PIC

Minimal:
- nama lengkap;
- nomor WhatsApp;
- email opsional;
- kota domisili;
- pilihan keberangkatan.

Jika keluarga, PIC otomatis menjadi anggota pertama dan tidak perlu diinput ulang.

## Step 4 — Data Jamaah

Form anggota menggunakan pola:

Nama lengkap
Jenis kelamin
Tempat lahir
Tanggal lahir
NIK
Kewarganegaraan
Status pernikahan
Pekerjaan
Nama ayah
Nomor HP
Alamat
Provinsi
Kabupaten/Kota
Kecamatan
Kelurahan
Hubungan keluarga

Data yang sudah tersedia dapat dipakai untuk anggota lain jika relevan, tetapi jangan melakukan autofill yang berisiko salah.

## Step 5 — Dokumen

Untuk setiap anggota:

- KTP
- KK
- kartu kuning vaksin meningitis dan polio
- paspor

KTP:
- wajib untuk usia >= 17 tahun;
- tidak wajib untuk jamaah di bawah 17 tahun.

Paspor:
- jika sudah punya: upload;
- jika belum punya: pilih "Belum memiliki paspor".

Vaksin:
- jika belum ada: pilih status "Belum ada";
- panitia dapat menandai "Dikoordinasikan Panitia".

## Step 6 — Pembayaran

Pilihan:

- Bayar penuh: Rp37.200.000
- Bayar DP: Rp5.000.000

Sistem tidak menganggap upload bukti sebagai pembayaran terverifikasi.

Status awal:
`Menunggu Verifikasi`

Panitia yang mengonfirmasi pembayaran.

## Step 7 — Review

Tampilkan ringkasan:

Kelompok
Jumlah jamaah
PIC
Keberangkatan
Data anggota
Dokumen
Pembayaran

User harus melakukan konfirmasi sebelum submit final.

## Step 8 — Submit

Setelah submit:
- generate registration code;
- tampilkan nomor pendaftaran;
- tampilkan status;
- tampilkan instruksi lanjutan;
- tawarkan tombol masuk kembali ke halaman status.

---

# 6. Dashboard Jamaah

Setelah submit, jamaah melihat:

## Status Pendaftaran

Contoh:

`Dalam Pemeriksaan Panitia`

Progress:

1. Data pendaftaran
2. Dokumen
3. Pembayaran
4. Verifikasi
5. Selesai

Status per anggota juga ditampilkan.

Contoh:

| Anggota | Data | Dokumen | Pembayaran |
|---|---|---|---|
| Ahmad | Lengkap | Lengkap | Terverifikasi |
| Siti | Lengkap | Kurang Paspor | Terverifikasi |
| Ali | Lengkap | Lengkap | Terverifikasi |

Jika panitia meminta revisi:
- tampilkan alasan;
- arahkan langsung ke field yang perlu diperbaiki.

---

# 7. Dokumen dan Google Drive

## Prinsip

Google Drive adalah file storage.

Supabase hanya menyimpan:

- drive_file_id;
- drive_folder_id;
- file_name;
- mime_type;
- size;
- drive_web_view_url;
- document type;
- uploaded_at;
- uploader;
- status verifikasi.

Jangan menyimpan binary file di PostgreSQL.

## Struktur folder

Direkomendasikan:

Umrah 100 Tahun Gontor/
├── 01_Pendaftaran/
├── 02_Jamaah/
│   ├── UMR-2026-0001/
│   │   ├── 01_KTP/
│   │   ├── 02_KK/
│   │   ├── 03_VAKSIN/
│   │   └── 04_PASPOR/
│   └── UMR-2026-0002/
├── 03_Pembayaran/
├── 04_Ekspor/
└── 99_Arsip/

Untuk keluarga, gunakan satu folder kelompok:

UMR-2026-G0001/
├── 00_PIC/
├── 01_AHMAD/
├── 02_SITI/
├── 03_ALI/
└── 04_FATIMAH/

Struktur sebenarnya dapat disederhanakan apabila panitia lebih nyaman dengan satu folder kelompok dan subfolder per jamaah.

---

# 8. Google Drive Upload Flow

1. Jamaah memilih file.
2. Frontend melakukan validasi:
   - tipe file;
   - ukuran;
   - field tujuan.
3. File dikirim ke backend/server route.
4. Backend menggunakan Google Drive API.
5. File di-upload ke folder jamaah.
6. Google Drive mengembalikan:
   - file ID;
   - name;
   - mimeType;
   - size;
   - webViewLink.
7. Backend menyimpan metadata file ke Supabase.
8. Frontend menampilkan "Berhasil diunggah".
9. File tidak disimpan di Vercel filesystem.

Jangan menyimpan Google service-account private key di frontend.

---

# 9. Database

## registration_groups

Kolom utama:

- id UUID
- registration_code VARCHAR UNIQUE
- type ENUM(individual,family)
- pic_jamaah_id UUID nullable
- departure_point_id UUID
- package_id UUID
- group_status
- created_at
- updated_at

## jamaahs

- id UUID
- group_id UUID
- registration_order INTEGER
- full_name
- gender
- father_name
- nik
- passport_number
- passport_issue_place
- passport_issue_date
- passport_expiry_date
- birth_place
- birth_date
- nationality
- marital_status
- occupation
- phone
- address
- province
- city
- district
- village
- relationship_to_pic
- passport_status
- ktp_required BOOLEAN
- created_at
- updated_at

Jangan menggunakan `usia` sebagai data permanen. Usia dihitung dari `birth_date`.

## documents

- id UUID
- jamaah_id UUID
- document_type
- drive_file_id
- drive_folder_id
- file_name
- mime_type
- file_size
- drive_web_view_url
- verification_status
- verification_note
- verified_by
- verified_at
- uploaded_at

## payments

- id UUID
- group_id UUID
- payer_jamaah_id UUID nullable
- payment_type ENUM(dp,full,other)
- amount
- payment_date
- drive_file_id nullable
- drive_web_view_url nullable
- verification_status
- verification_note
- verified_by
- verified_at

## departure_points

Seed awal:

- Jakarta
- Surabaya
- Gontor

Fields:
- id
- code
- name
- description
- is_active
- sort_order

## packages

Fields:
- id
- name
- price
- dp_amount
- currency
- departure_date nullable
- return_date nullable
- is_active

## audit_logs

- id
- actor_id
- action
- entity_type
- entity_id
- old_data JSONB
- new_data JSONB
- created_at

---

# 10. Status

## Group Status

`draft`
`submitted`
`under_review`
`revision_required`
`documents_incomplete`
`payment_pending`
`verified`
`ready_for_departure`
`completed`
`cancelled`

## Document Status

`not_uploaded`
`uploaded`
`under_review`
`verified`
`revision_required`
`rejected`

## Payment Status

`pending`
`proof_uploaded`
`verified`
`rejected`

---

# 11. Security

## Supabase

Gunakan Row Level Security.

Jamaah tidak boleh dapat:
- membaca jamaah lain;
- membaca data kelompok lain;
- membaca audit log;
- membaca database langsung;
- mengakses credential Google Drive.

## Google Drive

Jangan membuat seluruh folder publik.

Rekomendasi:
- folder utama hanya dapat diakses akun panitia;
- service account diberikan akses Editor pada folder;
- link `webViewLink` hanya berguna bagi akun yang memiliki permission;
- dokumen tidak menggunakan "Anyone with the link" kecuali ada alasan operasional yang jelas.

## Sensitive Data

NIK dan nomor paspor merupakan data sensitif secara operasional.

Jangan:
- menampilkan NIK penuh di tabel publik;
- memasukkan NIK/paspor ke URL;
- mencetak NIK penuh di log;
- mengirim data lengkap ke browser tanpa kebutuhan.

---

# 12. Admin Dashboard

Sidebar:

Dashboard
Pendaftaran
Kelompok
Jamaah
Dokumen
Pembayaran
Keberangkatan
Manifest
Ekspor
Pengaturan
Audit Log

## Dashboard

Cards:
- Total jamaah
- Total kelompok
- Dokumen belum lengkap
- Pembayaran belum diverifikasi
- Siap berangkat

Charts hanya jika benar-benar membantu.

## Pendaftaran

Table:

Kode
PIC
Jumlah Jamaah
Keberangkatan
Dokumen
Pembayaran
Status
Tanggal

Filter:
- status;
- keberangkatan;
- tanggal;
- tipe individu/keluarga;
- kelengkapan dokumen.

## Detail Kelompok

Header:
- kode;
- PIC;
- keberangkatan;
- status;
- jumlah anggota.

Tab:
- Ringkasan
- Jamaah
- Dokumen
- Pembayaran
- Aktivitas

---

# 13. Manifest

Sistem harus dapat menghasilkan data yang sesuai kebutuhan administrasi travel.

Field dasar manifest mengikuti struktur workbook yang digunakan panitia, antara lain:
- nama jamaah;
- gender;
- nama ayah;
- nomor paspor;
- NIK;
- tempat/tanggal lahir;
- masa berlaku paspor;
- hubungan;
- alamat;
- provinsi;
- kabupaten/kota;
- kecamatan;
- kelurahan;
- nomor HP;
- kewarganegaraan;
- status pernikahan;
- pekerjaan.

Data ini sebaiknya diekspor ke XLSX/CSV dari admin dashboard.

---

# 14. Validasi

## Identitas

- nama wajib;
- tanggal lahir wajib;
- tanggal lahir tidak boleh di masa depan;
- NIK harus 16 digit untuk WNI jika diwajibkan;
- nomor telepon dinormalisasi;
- paspor memiliki format yang masuk akal;
- tanggal kedaluwarsa paspor harus valid.

## Dokumen

- PDF, JPG, JPEG, PNG;
- batas ukuran configurable;
- nama file dihasilkan sistem agar konsisten;
- file lama tidak langsung dihapus ketika replacement dilakukan;
- gunakan versioning/log metadata.

## Pembayaran

Nominal tidak boleh diubah oleh jamaah.

Nilai berasal dari konfigurasi package.

---

# 15. Pencegahan Double Submit

Saat submit:
- gunakan transaction;
- generate registration code menggunakan database sequence/UUID;
- gunakan unique constraint;
- disable submit button setelah request;
- gunakan idempotency key;
- server melakukan validasi ulang.

Jika dua request masuk bersamaan, hanya satu yang boleh membuat submission final.

---

# 16. Teknologi

Frontend:
- Next.js App Router
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod

Backend:
- Next.js server actions/API routes
- Supabase
- PostgreSQL
- Supabase Auth untuk admin

Storage:
- Google Drive API
- Google Workspace Shared Drive jika tersedia

Deployment:
- Vercel

Development:
- Node.js LTS
- Git
- GitHub
- local development via VS Code

---

# 17. Environment Variables

Contoh:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_DRIVE_CLIENT_EMAIL=
GOOGLE_DRIVE_PRIVATE_KEY=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
GOOGLE_DRIVE_SHARED_DRIVE_ID=

APP_URL=

Credential server-only tidak boleh menggunakan prefix `NEXT_PUBLIC_`.

---

# 18. Tahapan Development

## Phase 1

- project setup;
- Supabase;
- database migration;
- RLS;
- admin authentication;
- landing page.

## Phase 2

- pendaftaran individu;
- pendaftaran keluarga;
- autosave;
- validasi.

## Phase 3

- Google Drive upload;
- document metadata;
- document verification.

## Phase 4

- payment proof;
- verification;
- status workflow.

## Phase 5

- admin dashboard;
- filters;
- search;
- detail group.

## Phase 6

- manifest;
- export XLSX;
- audit log.

## Phase 7

- security testing;
- mobile testing;
- concurrency testing;
- backup/recovery;
- production deployment.

---

# 19. Acceptance Criteria

Sistem dianggap siap apabila:

1. Jamaah dapat mendaftar dari HP.
2. Jamaah dapat memilih individu/keluarga.
3. Keluarga dapat memiliki beberapa anggota.
4. Setiap anggota memiliki dokumen sendiri.
5. Anak di bawah 17 tahun tidak diwajibkan KTP.
6. Paspor yang belum tersedia dapat ditandai.
7. Bukti pembayaran masuk Google Drive.
8. Supabase hanya menyimpan metadata/link file.
9. Panitia dapat memverifikasi dokumen.
10. Panitia dapat memverifikasi pembayaran.
11. Panitia dapat mengubah status.
12. Panitia dapat melihat kelompok secara utuh.
13. Panitia dapat filter Jakarta/Surabaya/Gontor.
14. Panitia dapat ekspor manifest.
15. Dua submit bersamaan tidak membuat duplikasi.
16. Jamaah tidak dapat membaca data jamaah lain.
17. Credential Google tidak pernah terkirim ke browser.
18. Tampilan tetap nyaman pada layar mobile.

---

# 20. Keputusan Produk yang Sengaja Dipilih

### Tidak menggunakan upload langsung ke Supabase Storage

Karena kebutuhan utama adalah Google Drive sebagai arsip panitia.

### Tidak membuat satu form 40+ field

Form dibagi menjadi beberapa langkah.

### Tidak memaksa seluruh dokumen selesai saat pertama kali mendaftar

Pendaftaran boleh masuk lebih dahulu, kemudian dokumen dilengkapi.

### Tidak menjadikan Google Drive sebagai database

Drive hanya untuk file.

### Tidak menjadikan link file sebagai akses publik

Permission tetap dikontrol oleh Google Drive.

---

# 21. Catatan Operasional

Biaya pendaftaran dan DP harus diletakkan sebagai konfigurasi package, bukan hardcode pada frontend.

Nilai awal berdasarkan informasi panitia:
- Harga: Rp37.200.000
- DP: Rp5.000.000

Pembayaran tetap dianggap `pending` sampai diverifikasi panitia.

Titik keberangkatan:
- Jakarta
- Surabaya
- Gontor

Jika nantinya berubah, admin cukup mengubah master data tanpa deploy ulang.
