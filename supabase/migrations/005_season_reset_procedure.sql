-- ============================================================
-- Migration: Stored Procedure for Season Reset & Sequence Restart
-- ============================================================

CREATE OR REPLACE FUNCTION reset_registration_sequence()
RETURNS void AS $$
BEGIN
  -- Restart the sequence for registration codes back to 1
  ALTER SEQUENCE reg_code_seq RESTART WITH 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
