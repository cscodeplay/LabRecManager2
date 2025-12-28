-- ============================================================
-- LAPTOP ISSUANCE SYSTEM
-- Track laptop issues and returns to staff members
-- ============================================================

-- Create issuance status enum
DO $$ BEGIN
    CREATE TYPE issuance_status AS ENUM ('issued', 'returned', 'overdue', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create laptop_issuances table
CREATE TABLE IF NOT EXISTS laptop_issuances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laptop_id UUID NOT NULL REFERENCES lab_items(id) ON DELETE CASCADE,
    issued_to_id UUID NOT NULL REFERENCES users(id),
    issued_by_id UUID NOT NULL REFERENCES users(id),
    voucher_number VARCHAR(30) UNIQUE NOT NULL,
    purpose TEXT,
    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expected_return_date DATE,
    returned_at TIMESTAMP,
    received_by_id UUID REFERENCES users(id),
    condition_on_issue VARCHAR(50) DEFAULT 'good',
    condition_on_return VARCHAR(50),
    remarks TEXT,
    return_remarks TEXT,
    status issuance_status DEFAULT 'issued',
    school_id UUID NOT NULL REFERENCES schools(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_laptop_issuances_laptop ON laptop_issuances(laptop_id);
CREATE INDEX IF NOT EXISTS idx_laptop_issuances_issued_to ON laptop_issuances(issued_to_id);
CREATE INDEX IF NOT EXISTS idx_laptop_issuances_status ON laptop_issuances(status);
CREATE INDEX IF NOT EXISTS idx_laptop_issuances_school ON laptop_issuances(school_id);

-- Function to generate voucher number
CREATE OR REPLACE FUNCTION generate_voucher_number()
RETURNS TEXT AS $$
DECLARE
    count INT;
BEGIN
    SELECT COUNT(*) + 1 INTO count FROM laptop_issuances;
    RETURN 'LV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Verify table created
SELECT 'laptop_issuances table created' as status;
