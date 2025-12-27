-- ============================================================
-- TICKETING SYSTEM MIGRATION
-- Creates tickets table, ticket_comments table, and related enums
-- ============================================================

-- Create ticket enums
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_category AS ENUM ('hardware_issue', 'software_issue', 'maintenance_request', 'general_complaint', 'other');

-- Create tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category ticket_category DEFAULT 'other',
    priority ticket_priority DEFAULT 'medium',
    status ticket_status DEFAULT 'open',
    item_id UUID REFERENCES lab_items(id) ON DELETE SET NULL,
    lab_id UUID REFERENCES labs(id) ON DELETE SET NULL,
    created_by_id UUID NOT NULL REFERENCES users(id),
    assigned_to_id UUID REFERENCES users(id),
    resolved_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolution_notes TEXT
);

-- Create ticket comments table
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_by ON tickets(created_by_id);
CREATE INDEX idx_tickets_lab ON tickets(lab_id);
CREATE INDEX idx_tickets_item ON tickets(item_id);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to_id);
CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);

-- Create function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    ticket_count INT;
BEGIN
    SELECT COUNT(*) + 1 INTO ticket_count FROM tickets;
    new_number := 'TKT-' || LPAD(ticket_count::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Verify tables created
SELECT 'tickets' as table_name, COUNT(*) as count FROM tickets
UNION ALL
SELECT 'ticket_comments' as table_name, COUNT(*) as count FROM ticket_comments;
