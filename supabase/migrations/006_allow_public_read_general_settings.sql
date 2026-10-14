-- ============================================================
-- Migration 006: Allow public read on non-sensitive app_settings
-- ============================================================
-- Allows anonymous and public visitors (landing page, payment info)
-- to read general branding parameters and active bank accounts,
-- while keeping sensitive credentials (such as Google Drive keys)
-- strictly restricted to authenticated panitia/admins.

DROP POLICY IF EXISTS "app_settings_public_read" ON app_settings;
CREATE POLICY "app_settings_public_read"
  ON app_settings FOR SELECT
  USING (key IN ('general_parameters', 'bank_accounts'));

COMMENT ON POLICY "app_settings_public_read" ON app_settings IS
  'Mengizinkan pengunjung umum membaca parameter web (judul, kontak, kuota, rekening) tanpa mengekspos kredensial API Google Drive.';
