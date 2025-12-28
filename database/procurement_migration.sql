-- ============================================================
-- PROCUREMENT/QUOTATION MANAGEMENT SYSTEM
-- For requesting hardware, collecting vendor quotes, comparison
-- ============================================================

-- Procurement Status Enum
DO $$ BEGIN
    CREATE TYPE procurement_status AS ENUM ('draft', 'quotation_requested', 'quotes_received', 'approved', 'ordered', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    gstin VARCHAR(20),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_school ON vendors(school_id);

-- Procurement Requests (main procurement case)
CREATE TABLE IF NOT EXISTS procurement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    purpose TEXT,
    department VARCHAR(100),
    budget_code VARCHAR(50),
    estimated_total DECIMAL(14,2),
    approved_total DECIMAL(14,2),
    status procurement_status DEFAULT 'draft',
    created_by_id UUID NOT NULL REFERENCES users(id),
    approved_by_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procurement_requests_school ON procurement_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_status ON procurement_requests(status);

-- Procurement Items (items to be procured)
CREATE TABLE IF NOT EXISTS procurement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    specifications TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'pcs',
    estimated_unit_price DECIMAL(12,2),
    approved_unit_price DECIMAL(12,2),
    approved_vendor_id UUID REFERENCES vendors(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procurement_items_request ON procurement_items(request_id);

-- Vendor Quotations (quotes from vendors for a procurement request)
CREATE TABLE IF NOT EXISTS vendor_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    quotation_number VARCHAR(50),
    quotation_date DATE,
    valid_until DATE,
    document_url VARCHAR(500),
    total_amount DECIMAL(14,2),
    terms TEXT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_quotations_request ON vendor_quotations(request_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quotations_vendor ON vendor_quotations(vendor_id);

-- Quotation Line Items (prices per item from each vendor)
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES vendor_quotations(id) ON DELETE CASCADE,
    procurement_item_id UUID NOT NULL REFERENCES procurement_items(id) ON DELETE CASCADE,
    unit_price DECIMAL(12,2) NOT NULL,
    quantity INTEGER,
    total_price DECIMAL(12,2),
    remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_item ON quotation_items(procurement_item_id);

-- Verification
SELECT 'Procurement tables created successfully' as status;
SELECT COUNT(*) as vendors_count FROM vendors;
SELECT COUNT(*) as requests_count FROM procurement_requests;
