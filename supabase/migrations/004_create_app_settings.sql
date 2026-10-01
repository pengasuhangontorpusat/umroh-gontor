-- ============================================================
-- Migration 004: Create app_settings table for dynamic configs
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins/panitia can read and modify settings
DROP POLICY IF EXISTS "app_settings_panitia_all" ON app_settings;
CREATE POLICY "app_settings_panitia_all"
  ON app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM panitia_profiles
      WHERE id = auth.uid() AND is_active = TRUE
    )
  );

COMMENT ON TABLE app_settings IS 'Tabel konfigurasi dinamis aplikasi (Google Drive API, kontak, kuota global, dsb)';
