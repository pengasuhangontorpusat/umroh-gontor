-- ============================================================
-- Migration: Portal Pendaftaran Umrah 100 Tahun Gontor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM Types
-- ============================================================

CREATE TYPE registration_type AS ENUM ('individual', 'family');

CREATE TYPE group_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'revision_required',
  'documents_incomplete',
  'payment_pending',
  'verified',
  'ready_for_departure',
  'completed',
  'cancelled'
);

CREATE TYPE document_type AS ENUM ('ktp', 'kk', 'vaksin', 'paspor', 'bukti_bayar');

CREATE TYPE document_status AS ENUM (
  'not_uploaded',
  'uploaded',
  'under_review',
  'verified',
  'revision_required',
  'rejected'
);

CREATE TYPE payment_type AS ENUM ('dp', 'full', 'other');

CREATE TYPE payment_status AS ENUM ('pending', 'proof_uploaded', 'verified', 'rejected');

CREATE TYPE passport_status AS ENUM ('has_passport', 'no_passport', 'in_process');

-- ============================================================
-- departure_points
-- ============================================================

CREATE TABLE departure_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO departure_points (code, name, sort_order) VALUES
  ('JKT', 'Jakarta', 1),
  ('SBY', 'Surabaya', 2),
  ('GNT', 'Gontor', 3);

-- ============================================================
-- packages
-- ============================================================

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  price NUMERIC(15, 2) NOT NULL,
  dp_amount NUMERIC(15, 2) NOT NULL,
  currency CHAR(3) DEFAULT 'IDR',
  departure_date DATE,
  return_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO packages (name, price, dp_amount) VALUES
  ('Umrah 100 Tahun Gontor', 37200000, 5000000);

-- ============================================================
-- registration_groups
-- ============================================================

CREATE TABLE registration_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_code VARCHAR(30) UNIQUE NOT NULL,
  type registration_type NOT NULL DEFAULT 'individual',
  pic_jamaah_id UUID, -- FK added after jamaahs table
  departure_point_id UUID REFERENCES departure_points(id) ON DELETE SET NULL,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  group_status group_status NOT NULL DEFAULT 'draft',
  user_id UUID, -- Supabase auth user who registered
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence for registration code
CREATE SEQUENCE reg_code_seq START 1;

-- ============================================================
-- jamaahs
-- ============================================================

CREATE TABLE jamaahs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES registration_groups(id) ON DELETE CASCADE,
  registration_order INTEGER NOT NULL DEFAULT 1,
  -- Personal
  full_name VARCHAR(200) NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')) NOT NULL,
  father_name VARCHAR(200),
  nik CHAR(16),
  -- Passport
  passport_number VARCHAR(20),
  passport_issue_place VARCHAR(100),
  passport_issue_date DATE,
  passport_expiry_date DATE,
  passport_status passport_status DEFAULT 'no_passport',
  -- Birth
  birth_place VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  nationality VARCHAR(50) DEFAULT 'Indonesia',
  -- Civil status
  marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'widowed', 'divorced')),
  occupation VARCHAR(100),
  -- Contact
  phone VARCHAR(20),
  -- Address
  address TEXT,
  province VARCHAR(100),
  city VARCHAR(100),
  district VARCHAR(100),
  village VARCHAR(100),
  -- Relationship
  relationship_to_pic VARCHAR(50),
  -- Health & Special Needs
  has_disability BOOLEAN DEFAULT FALSE,
  disability_description TEXT,
  medical_history TEXT,
  clothing_size VARCHAR(10),
  -- Flag
  ktp_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from registration_groups to jamaahs
ALTER TABLE registration_groups
  ADD CONSTRAINT fk_pic_jamaah
  FOREIGN KEY (pic_jamaah_id) REFERENCES jamaahs(id) ON DELETE SET NULL;

-- ============================================================
-- documents
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jamaah_id UUID NOT NULL REFERENCES jamaahs(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  -- Google Drive metadata
  drive_file_id VARCHAR(200),
  drive_folder_id VARCHAR(200),
  file_name VARCHAR(500),
  mime_type VARCHAR(100),
  file_size BIGINT,
  drive_web_view_url TEXT,
  -- Verification
  verification_status document_status DEFAULT 'not_uploaded',
  verification_note TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  -- Upload
  uploaded_at TIMESTAMPTZ,
  uploaded_by UUID,
  -- Versioning
  version INTEGER DEFAULT 1,
  previous_document_id UUID REFERENCES documents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- payments
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES registration_groups(id) ON DELETE CASCADE,
  payer_jamaah_id UUID REFERENCES jamaahs(id) ON DELETE SET NULL,
  payment_type payment_type NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  payment_date DATE,
  -- Proof (Google Drive)
  drive_file_id VARCHAR(200),
  drive_web_view_url TEXT,
  -- Verification
  verification_status payment_status DEFAULT 'pending',
  verification_note TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- panitia_profiles (admin/panitia users)
-- ============================================================

CREATE TABLE panitia_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(200) NOT NULL,
  role VARCHAR(50) DEFAULT 'panitia' CHECK (role IN ('admin', 'panitia')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- audit_logs
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  actor_type VARCHAR(20) CHECK (actor_type IN ('jamaah', 'panitia', 'system')),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_registration_groups_code ON registration_groups(registration_code);
CREATE INDEX idx_registration_groups_status ON registration_groups(group_status);
CREATE INDEX idx_registration_groups_user ON registration_groups(user_id);
CREATE INDEX idx_jamaahs_group ON jamaahs(group_id);
CREATE INDEX idx_jamaahs_nik ON jamaahs(nik);
CREATE INDEX idx_documents_jamaah ON documents(jamaah_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(verification_status);
CREATE INDEX idx_payments_group ON payments(group_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);

-- ============================================================
-- Functions
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registration_groups_updated_at
  BEFORE UPDATE ON registration_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_jamaahs_updated_at
  BEFORE UPDATE ON jamaahs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate registration code
CREATE OR REPLACE FUNCTION generate_registration_code(
  p_type registration_type,
  p_year INTEGER DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
  v_seq BIGINT;
  v_prefix VARCHAR;
  v_year INTEGER;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_seq := nextval('reg_code_seq');
  IF p_type = 'family' THEN
    v_prefix := 'UMR-' || v_year || '-G';
  ELSE
    v_prefix := 'UMR-' || v_year || '-';
  END IF;
  RETURN v_prefix || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
