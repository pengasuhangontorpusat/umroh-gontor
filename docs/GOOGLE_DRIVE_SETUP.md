# GOOGLE DRIVE SETUP — Portal Pendaftaran Umrah 100 Tahun Gontor

## 1. Arsitektur

Alur:

Jamaah
↓
Next.js / Vercel
↓
Google Drive API
↓
Google Drive

Setelah upload berhasil:

Google Drive
↓
file ID + metadata
↓
Next.js backend
↓
Supabase PostgreSQL

Supabase tidak menyimpan file binary.

---

# 2. Rekomendasi Struktur Drive

Buat satu folder utama:

`UMRAH 100 TAHUN GONTOR`

Di dalamnya:

```text
UMRAH 100 TAHUN GONTOR/
│
├── 01_JAMAAH/
│   ├── UMR-2026-G0001/
│   │   ├── 01_AHMAD_FAUZAN/
│   │   │   ├── KTP/
│   │   │   ├── KK/
│   │   │   ├── VAKSIN/
│   │   │   └── PASPOR/
│   │   ├── 02_SITI_AMINAH/
│   │   │   ├── KTP/
│   │   │   ├── KK/
│   │   │   ├── VAKSIN/
│   │   │   └── PASPOR/
│   │   └── PEMBAYARAN/
│   │
│   └── UMR-2026-G0002/
│
├── 02_EKSPOR/
│
├── 03_DOKUMEN_PANITIA/
│
└── 99_ARSIP/
```

Nama folder kelompok menggunakan kode pendaftaran, bukan nama PIC sebagai identitas utama.

---

# 3. Google Account

Jika organisasi memiliki Google Workspace, gunakan Shared Drive.

Rekomendasi:

`Shared Drive > Umrah 100 Tahun Gontor`

Keuntungannya:
- kepemilikan file tidak bergantung pada akun pribadi;
- akses panitia dapat dikelola;
- lebih aman untuk pergantian panitia;
- folder dapat tetap dimiliki organisasi.

Jika belum ada Google Workspace, gunakan Google Drive biasa dan share folder root kepada service account.

---

# 4. Google Cloud Project

Buat project khusus.

Contoh:

`umrah-100-gontor`

Jangan mencampur credential dengan project pribadi yang tidak berkaitan.

---

# 5. Aktifkan Google Drive API

Google Cloud Console:

APIs & Services
→ Library
→ Google Drive API
→ Enable

API yang dibutuhkan:
- Google Drive API

Tidak perlu mengaktifkan API lain jika tidak digunakan.

---

# 6. Buat Service Account

Google Cloud Console:

IAM & Admin
→ Service Accounts
→ Create Service Account

Contoh:

`umrah-drive-uploader`

Tujuannya hanya untuk server.

Jangan menggunakan akun Gmail panitia dengan password yang ditanam di aplikasi.

---

# 7. Credential

Buat key JSON untuk service account jika menggunakan metode service-account key.

Credential berisi:
- client_email
- private_key
- project_id

Simpan hanya sebagai environment variable server.

Jangan:
- commit ke Git;
- memasukkan ke GitHub;
- memasukkan ke browser;
- memasukkan ke `NEXT_PUBLIC_*`.

---

# 8. Share Folder Google Drive

Ambil email service account.

Contoh:

`umrah-drive-uploader@PROJECT_ID.iam.gserviceaccount.com`

Share folder root:

`UMRAH 100 TAHUN GONTOR`

Permission:
`Editor`

Jika menggunakan Shared Drive, berikan akses yang diperlukan pada service account sesuai kebijakan organisasi.

---

# 9. Ambil Folder ID

Buka folder utama.

URL biasanya:

`https://drive.google.com/drive/folders/FOLDER_ID`

Yang disimpan ke environment:

`GOOGLE_DRIVE_ROOT_FOLDER_ID`

Jangan menyimpan URL lengkap jika aplikasi hanya membutuhkan ID.

---

# 10. Environment Variables

Development `.env.local`:

```env
GOOGLE_DRIVE_CLIENT_EMAIL=...
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=...
```

Production Vercel:

Project
→ Settings
→ Environment Variables

Masukkan variable yang sama.

Private key harus tetap server-only.

---

# 11. Google Drive API Layer

Buat module:

```text
src/
└── lib/
    └── google-drive/
        ├── client.ts
        ├── folders.ts
        ├── upload.ts
        ├── files.ts
        └── permissions.ts
```

Tanggung jawab:

`client.ts`
- membuat authenticated Drive client.

`folders.ts`
- mencari/membuat folder.

`upload.ts`
- upload file.

`files.ts`
- metadata;
- delete/replace;
- move.

`permissions.ts`
- permission jika memang dibutuhkan.

---

# 12. Folder Creation Flow

Saat kelompok pertama kali dibuat:

1. Generate `registration_code`.
2. Backend membuat folder:
   `UMR-2026-G0001`
3. Simpan folder ID ke database.

Kemudian ketika jamaah ditambahkan:

1. Generate folder berdasarkan urutan:
   `01_AHMAD_FAUZAN`
2. Buat subfolder:
   - KTP
   - KK
   - VAKSIN
   - PASPOR
3. Simpan ID masing-masing folder jika diperlukan.

Tidak perlu membuat folder untuk dokumen yang tidak relevan jika ingin mengurangi jumlah object.

---

# 13. Upload Flow Detail

```text
User memilih file
        ↓
Client validation
        ↓
POST /api/uploads
        ↓
Server authentication
        ↓
Validasi registration/member
        ↓
Validasi document type
        ↓
Upload ke Google Drive
        ↓
Drive mengembalikan metadata
        ↓
Insert document record ke Supabase
        ↓
Return success
```

Server harus memastikan user hanya dapat upload ke registration yang memang sedang dikerjakan.

---

# 14. Nama File

Jangan mempertahankan nama file pengguna sebagai nama utama.

Contoh:

```text
UMR-2026-G0001_AHMAD_FAUZAN_KTP_20261001.pdf
```

atau:

```text
KTP.pdf
```

di dalam folder jamaah.

Rekomendasi kedua lebih bersih karena folder sudah menjadi konteks.

---

# 15. File Metadata di Supabase

Contoh:

```text
documents
---------------------------------
id
jamaah_id
document_type
drive_file_id
drive_folder_id
file_name
mime_type
file_size
drive_web_view_url
verification_status
verification_note
uploaded_at
verified_at
verified_by
```

Database tidak menyimpan:
- binary;
- base64;
- blob;
- file content.

---

# 16. File Replacement

Jika jamaah mengganti paspor:

Jangan langsung overwrite tanpa jejak.

Flow:

Old file
↓
mark as superseded
↓
upload new file
↓
save new drive_file_id
↓
new document record

Dengan begitu panitia masih mempunyai audit trail.

Jika kebutuhan storage harus ditekan, file lama dapat dipindahkan ke:

`99_ARSIP`

---

# 17. Akses File

Rekomendasi:

Jangan menggunakan:

`Anyone with the link`

untuk seluruh dokumen jamaah.

Gunakan permission internal panitia.

Admin dashboard menyimpan:

`drive_web_view_url`

Ketika panitia menekan "Lihat Dokumen", browser membuka Google Drive.

Akun panitia harus mempunyai permission.

---

# 18. Jika Jamaah Perlu Melihat Dokumen

Jangan memberikan folder Drive langsung kepada jamaah.

Lebih aman:

Jamaah
↓
Dashboard aplikasi
↓
Backend authorization
↓
Dokumen yang sesuai

Jika fitur ini belum dibutuhkan, jangan dibuat pada MVP.

---

# 19. File Size Limit

Tetapkan batas di aplikasi.

Contoh awal:

- JPG/JPEG/PNG: maksimal 10 MB
- PDF: maksimal 10 MB

Nilai dapat dibuat configurable.

Tujuan:
- mencegah file kamera berukuran sangat besar;
- mempercepat upload;
- mengurangi penggunaan bandwidth.

Jika dokumen kamera menghasilkan file terlalu besar, frontend dapat melakukan kompresi gambar sebelum upload.

---

# 20. Validasi MIME

Jangan hanya memeriksa ekstensi.

Validasi:
- extension;
- MIME type;
- file signature jika diperlukan.

Jangan menerima executable atau file yang tidak diperlukan.

Whitelist:

```text
application/pdf
image/jpeg
image/png
```

---

# 21. Upload Error Handling

Jika Drive berhasil tetapi Supabase gagal:

Status harus masuk ke kondisi yang dapat direkonsiliasi.

Contoh:

```text
Drive upload success
Supabase insert failed
        ↓
retry / reconciliation job
```

Jangan membuat user mengupload berkali-kali tanpa pemeriksaan.

Untuk MVP, backend dapat melakukan:
1. upload Drive;
2. insert database;
3. jika database gagal, simpan error log dan tandai file untuk reconciliation.

---

# 22. Security

Credential Google hanya berada di server.

Tidak boleh ada:

```text
NEXT_PUBLIC_GOOGLE_DRIVE_PRIVATE_KEY
```

Tidak boleh ada service account JSON di repository.

Tambahkan ke `.gitignore`:

```text
*.json
.env
.env.local
```

Jika file credential pernah masuk Git, segera revoke dan buat credential baru.

---

# 23. Vercel

Environment variables dipasang pada:

Development
Preview
Production

Gunakan credential yang sesuai.

Untuk production:
- gunakan Google Drive account organisasi;
- jangan memakai credential developer pribadi.

---

# 24. Supabase RLS

Jangan memberikan akses service role kepada browser.

Browser hanya menggunakan public/anon key.

Operasi Google Drive:
- dilakukan server;
- menggunakan credential server.

---

# 25. Monitoring

Simpan log minimal:

- upload started;
- upload success;
- upload failed;
- Drive file ID;
- jamaah ID;
- document type;
- actor;
- timestamp.

Jangan log:
- private key;
- isi dokumen;
- NIK penuh;
- nomor paspor penuh.

---

# 26. Backup

Google Drive:
- menjadi storage utama dokumen.

Supabase:
- backup database melalui mekanisme backup Supabase.

Jangan menganggap Google Drive dan Supabase saling menggantikan.

Keduanya memiliki fungsi berbeda.

---

# 27. Setup Checklist

## Google Drive

- [ ] Buat folder root
- [ ] Buat Shared Drive jika tersedia
- [ ] Buat folder struktur
- [ ] Buat Google Cloud Project
- [ ] Enable Drive API
- [ ] Buat Service Account
- [ ] Berikan akses folder kepada Service Account
- [ ] Ambil Root Folder ID
- [ ] Buat credential
- [ ] Simpan credential sebagai environment variable

## Supabase

- [ ] Buat project
- [ ] Buat tables
- [ ] Buat RLS
- [ ] Buat seed package
- [ ] Buat seed departure points
- [ ] Simpan Google Drive metadata

## Vercel

- [ ] Connect GitHub
- [ ] Set environment variables
- [ ] Deploy preview
- [ ] Test upload
- [ ] Test permission
- [ ] Deploy production

---

# 28. Testing Wajib

Sebelum production:

### Test 1
Pendaftaran sendiri.

### Test 2
Pendaftaran keluarga 4 orang.

### Test 3
Anak di bawah 17 tahun tanpa KTP.

### Test 4
Paspor belum tersedia.

### Test 5
Upload KTP.

### Test 6
Upload PDF.

### Test 7
File terlalu besar.

### Test 8
Upload gagal.

### Test 9
Dua user submit bersamaan.

### Test 10
User mencoba membuka registration ID milik orang lain.

### Test 11
Panitia membuka Drive.

### Test 12
Credential Google tidak muncul di browser.

---

# 29. Rekomendasi Final

Untuk jumlah sekitar 500 jamaah:

```text
Vercel
   |
   v
Next.js
   |
   +---- Supabase PostgreSQL
   |       |
   |       +---- Jamaah
   |       +---- Kelompok
   |       +---- Dokumen Metadata
   |       +---- Pembayaran
   |       +---- Audit Log
   |
   +---- Google Drive API
           |
           +---- KTP
           +---- KK
           +---- Vaksin
           +---- Paspor
           +---- Bukti Pembayaran
```

Arsitektur ini menjaga database tetap ringan, dokumen tetap terorganisir di Drive, dan seluruh proses administrasi tetap berada dalam satu portal.
