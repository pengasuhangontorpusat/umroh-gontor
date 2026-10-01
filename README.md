# Portal Pendaftaran Umrah 100 Tahun Gontor

Aplikasi web portal resmi pendaftaran jamaah umrah dalam rangka Peringatan 100 Tahun Pondok Modern Darussalam Gontor.

---

## 🌟 Fitur Utama

### 1. POV User / Jamaah
- **Alur Pendaftaran Multi-Step (7 Langkah)**:
  - Step 1: Pilihan Jenis Pendaftaran (Mandiri / Keluarga).
  - Step 2: Data PIC / Penanggung Jawab & Titik Keberangkatan.
  - Step 3: Formulir Lengkap Data Jamaah (dengan validasi NIK 16 digit, riwayat kesehatan, ukuran batik, dan opsi disabilitas/kursi roda).
  - Step 4: Unggah Dokumen (KTP, KK, Paspor, Kartu Vaksin Meningitis/Polio).
  - Step 5: Pembayaran (Pilihan Bayar DP / Pelunasan dengan kalkulasi otomatis jumlah anggota keluarga).
  - Step 6: Tinjau & Konfirmasi Data.
  - Step 7: Penerbitan Kode Registrasi Unik (`UMR-2026-xxxx`).
- **Pelacakan Status Jamaah (`/status`)**:
  - Cek progres verifikasi dokumen, pembayaran, dan keberangkatan secara real-time via kode pendaftaran.

### 2. POV Admin Panel (`/admin`)
- **Dashboard & Statistik**: Ringkasan jumlah pendaftar, kuota per embarkasi, dan status verifikasi.
- **Manajemen Pendaftaran (`/admin/pendaftaran`)**:
  - Filter status (Terkirim, Dalam Pemeriksaan, Perlu Revisi, Terverifikasi, Siap Berangkat, Selesai).
  - Verifikasi dokumen interaktif (Setujui, Minta Revisi dengan catatan, Tolak).
  - Verifikasi pembayaran (Diterima / Ditolak).
- **Manifest Keberangkatan (`/admin/manifest`)**:
  - Tabel manifest lengkap data jamaah, kebutuhan kursi roda/disabilitas, ukuran seragam, dan status paspor.
  - Ekspor ke Excel (.xlsx) dan CSV.
- **Pengaturan Master Data (`/admin/pengaturan`)**:
  - CRUD Titik Keberangkatan (Jakarta, Surabaya, Solo/Gontor, Medan, Makassar, dsb).
  - CRUD Paket Kamar & Harga (Quad, Triple, Double).
  - Rekening Panitia & Parameter Pendaftaran.
- **Audit Log (`/admin/audit-log`)**: Riwayat aktivitas perubahan status dan verifikasi panitia.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL dengan Row Level Security)
- **Styling**: Tailwind CSS & CSS Design Tokens (Institutional Green `#14532d` theme)
- **Icons**: Lucide React
- **Validation**: Zod & React Hook Form
- **Exporting**: xlsx (SheetJS)

---

## 🚀 Memulai (Local Development)

1. **Clone repository**:
   ```bash
   git clone https://github.com/pengasuhangontorpusat/umroh-gontor.git
   cd umroh-gontor
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Setup Environment**:
   Salin `.env.example` ke `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Isi konfigurasi Supabase Anda di `.env.local`.

4. **Jalankan database migration di Supabase SQL Editor**:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_add_disability_to_jamaahs.sql`

5. **Jalankan server pengembangan**:
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 📁 Dokumentasi Terkait
- [PRD (Product Requirement Document)](docs/PRD.md)
- [Design Guidelines & UI Tokens](docs/DESAIN.md)
- [Panduan Setup Google Drive API](docs/GOOGLE_DRIVE_SETUP.md)
