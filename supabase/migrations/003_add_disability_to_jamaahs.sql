-- ============================================================
-- Migration: Add disability and special needs to jamaahs table
-- ============================================================

ALTER TABLE jamaahs
  ADD COLUMN IF NOT EXISTS has_disability BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disability_description TEXT,
  ADD COLUMN IF NOT EXISTS medical_history TEXT,
  ADD COLUMN IF NOT EXISTS clothing_size VARCHAR(10);

COMMENT ON COLUMN jamaahs.has_disability IS 'Menandakan apakah jamaah memiliki disabilitas atau kebutuhan khusus (kursi roda, tunanetra, dsb)';
COMMENT ON COLUMN jamaahs.disability_description IS 'Rincian kebutuhan khusus atau bantuan fasilitas yang dibutuhkan jamaah';
