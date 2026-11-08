-- Migration: Link Tickets and Procurement Requests to Academic Session (academic_years)
-- Date: 2026-11-08

-- 1. Add academic_year_id to tickets
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_academic_year ON tickets(academic_year_id);

-- 2. Add academic_year_id to procurement_requests
ALTER TABLE procurement_requests 
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_procurement_requests_academic_year ON procurement_requests(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_school_academic_year ON procurement_requests(school_id, academic_year_id);

-- 3. Backfill existing tickets to match academic year by creation date
UPDATE tickets t
SET academic_year_id = ay.id
FROM academic_years ay
WHERE t.academic_year_id IS NULL
  AND t.created_at::date >= ay.start_date
  AND t.created_at::date <= ay.end_date;

-- Fallback any remaining tickets to the active current session
UPDATE tickets t
SET academic_year_id = (SELECT id FROM academic_years WHERE is_current = true LIMIT 1)
WHERE t.academic_year_id IS NULL;

-- 4. Backfill existing procurement requests to match academic year by creation date
UPDATE procurement_requests pr
SET academic_year_id = ay.id
FROM academic_years ay
WHERE pr.academic_year_id IS NULL
  AND pr.created_at::date >= ay.start_date
  AND pr.created_at::date <= ay.end_date;

-- Fallback any remaining procurement requests to the active current session
UPDATE procurement_requests pr
SET academic_year_id = (SELECT id FROM academic_years WHERE is_current = true LIMIT 1)
WHERE pr.academic_year_id IS NULL;
