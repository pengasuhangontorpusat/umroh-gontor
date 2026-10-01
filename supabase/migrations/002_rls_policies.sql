-- ============================================================
-- RLS Policies: Portal Pendaftaran Umrah 100 Tahun Gontor
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE registration_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamaahs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE panitia_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE departure_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: check if user is panitia/admin
-- ============================================================

CREATE OR REPLACE FUNCTION is_panitia()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM panitia_profiles
    WHERE id = auth.uid() AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM panitia_profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- departure_points: public read, admin write
-- ============================================================

CREATE POLICY "departure_points_public_read"
  ON departure_points FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "departure_points_admin_write"
  ON departure_points FOR ALL
  USING (is_admin());

-- ============================================================
-- packages: public read, admin write
-- ============================================================

CREATE POLICY "packages_public_read"
  ON packages FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "packages_admin_write"
  ON packages FOR ALL
  USING (is_admin());

-- ============================================================
-- registration_groups
-- ============================================================

-- Jamaah: can only see their own group
CREATE POLICY "groups_jamaah_own"
  ON registration_groups FOR SELECT
  USING (user_id = auth.uid());

-- Jamaah: can insert their own group
CREATE POLICY "groups_jamaah_insert"
  ON registration_groups FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Jamaah: can update draft/revision_required status
CREATE POLICY "groups_jamaah_update"
  ON registration_groups FOR UPDATE
  USING (
    user_id = auth.uid()
    AND group_status IN ('draft', 'revision_required')
  );

-- Panitia: can see all
CREATE POLICY "groups_panitia_read"
  ON registration_groups FOR SELECT
  USING (is_panitia());

-- Panitia: can update status
CREATE POLICY "groups_panitia_update"
  ON registration_groups FOR UPDATE
  USING (is_panitia());

-- ============================================================
-- jamaahs
-- ============================================================

-- Jamaah: only own group members
CREATE POLICY "jamaahs_jamaah_own"
  ON jamaahs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registration_groups rg
      WHERE rg.id = jamaahs.group_id AND rg.user_id = auth.uid()
    )
  );

CREATE POLICY "jamaahs_jamaah_insert"
  ON jamaahs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registration_groups rg
      WHERE rg.id = jamaahs.group_id AND rg.user_id = auth.uid()
    )
  );

CREATE POLICY "jamaahs_jamaah_update"
  ON jamaahs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM registration_groups rg
      WHERE rg.id = jamaahs.group_id
        AND rg.user_id = auth.uid()
        AND rg.group_status IN ('draft', 'revision_required')
    )
  );

-- Panitia: full access
CREATE POLICY "jamaahs_panitia_all"
  ON jamaahs FOR ALL
  USING (is_panitia());

-- ============================================================
-- documents
-- ============================================================

CREATE POLICY "documents_jamaah_own"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jamaahs j
      JOIN registration_groups rg ON rg.id = j.group_id
      WHERE j.id = documents.jamaah_id AND rg.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_jamaah_insert"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jamaahs j
      JOIN registration_groups rg ON rg.id = j.group_id
      WHERE j.id = documents.jamaah_id AND rg.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_jamaah_update"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jamaahs j
      JOIN registration_groups rg ON rg.id = j.group_id
      WHERE j.id = documents.jamaah_id
        AND rg.user_id = auth.uid()
        AND documents.verification_status IN ('not_uploaded', 'revision_required')
    )
  );

CREATE POLICY "documents_panitia_all"
  ON documents FOR ALL
  USING (is_panitia());

-- ============================================================
-- payments
-- ============================================================

CREATE POLICY "payments_jamaah_own"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registration_groups rg
      WHERE rg.id = payments.group_id AND rg.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_jamaah_insert"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registration_groups rg
      WHERE rg.id = payments.group_id AND rg.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_panitia_all"
  ON payments FOR ALL
  USING (is_panitia());

-- ============================================================
-- panitia_profiles
-- ============================================================

-- Panitia can see own profile
CREATE POLICY "panitia_own_profile"
  ON panitia_profiles FOR SELECT
  USING (id = auth.uid());

-- Admin can manage all
CREATE POLICY "panitia_admin_all"
  ON panitia_profiles FOR ALL
  USING (is_admin());

-- ============================================================
-- audit_logs: panitia read only
-- ============================================================

CREATE POLICY "audit_panitia_read"
  ON audit_logs FOR SELECT
  USING (is_panitia());

-- System inserts via service role (bypasses RLS)
