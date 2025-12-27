-- ============================================================
-- TICKET ISSUE TYPES MIGRATION
-- Adds structured issue types for each ticket category
-- ============================================================

-- Add issue_type_id column to tickets table (if table exists)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS issue_type_id UUID;

-- Create ticket_issue_types table
CREATE TABLE IF NOT EXISTS ticket_issue_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category ticket_category NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_ticket_issue_types_category ON ticket_issue_types(category);

-- Add foreign key to tickets table
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_issue_type 
    FOREIGN KEY (issue_type_id) REFERENCES ticket_issue_types(id);

-- ============================================================
-- SEED DATA: Hardware Issues
-- ============================================================
INSERT INTO ticket_issue_types (category, name, description, display_order) VALUES
('hardware_issue', 'Monitor not working', 'Monitor is not displaying anything or has display issues', 1),
('hardware_issue', 'Keyboard issue', 'Keys not working, stuck, or keyboard not responding', 2),
('hardware_issue', 'Mouse not responding', 'Mouse not moving, clicking issues, or disconnected', 3),
('hardware_issue', 'PC not booting', 'Computer does not start or gets stuck at boot', 4),
('hardware_issue', 'No display output', 'PC turns on but no display on monitor', 5),
('hardware_issue', 'Overheating', 'CPU/GPU overheating, system shutting down due to heat', 6),
('hardware_issue', 'Strange noise from CPU', 'Unusual sounds from CPU, fan, or hard drive', 7),
('hardware_issue', 'Power button not working', 'Power button does not respond', 8),
('hardware_issue', 'USB ports not functioning', 'USB devices not detected or not working', 9),
('hardware_issue', 'Network cable disconnected', 'LAN cable issue or network connectivity problem', 10),
('hardware_issue', 'Printer not working', 'Printer not printing, paper jam, or connection issue', 11),
('hardware_issue', 'Projector issue', 'Projector not displaying or connection problem', 12),
('hardware_issue', 'Headphone/Speaker issue', 'Audio device not working', 13),
('hardware_issue', 'Other hardware issue', 'Other hardware-related problems', 99);

-- ============================================================
-- SEED DATA: Software Issues
-- ============================================================
INSERT INTO ticket_issue_types (category, name, description, display_order) VALUES
('software_issue', 'OS not loading', 'Operating system fails to start or crashes', 1),
('software_issue', 'Blue screen error (BSOD)', 'Windows blue screen or crash', 2),
('software_issue', 'Software installation needed', 'Need to install specific software', 3),
('software_issue', 'Software not opening', 'Application fails to launch or crashes', 4),
('software_issue', 'Virus/malware detected', 'System infected with virus or malware', 5),
('software_issue', 'Network/internet not working', 'Cannot connect to internet or network', 6),
('software_issue', 'Printer driver issue', 'Printer driver needs installation or update', 7),
('software_issue', 'Password reset needed', 'Need to reset system or application password', 8),
('software_issue', 'System running slow', 'Computer is very slow or unresponsive', 9),
('software_issue', 'Software update needed', 'Application needs to be updated', 10),
('software_issue', 'License/activation issue', 'Software license expired or activation needed', 11),
('software_issue', 'File recovery needed', 'Need to recover deleted or corrupted files', 12),
('software_issue', 'Browser issue', 'Browser not working or plugin problems', 13),
('software_issue', 'Other software issue', 'Other software-related problems', 99);

-- ============================================================
-- SEED DATA: Maintenance Requests
-- ============================================================
INSERT INTO ticket_issue_types (category, name, description, display_order) VALUES
('maintenance_request', 'Cleaning required', 'PC or equipment needs physical cleaning', 1),
('maintenance_request', 'Cable management', 'Cables need to be organized or replaced', 2),
('maintenance_request', 'Hardware upgrade request', 'Request for RAM, storage, or other upgrades', 3),
('maintenance_request', 'Software update needed', 'System-wide software updates required', 4),
('maintenance_request', 'AC/ventilation issue', 'Air conditioning or ventilation problem in lab', 5),
('maintenance_request', 'Furniture repair', 'Desk, chair, or other furniture needs repair', 6),
('maintenance_request', 'Electrical issue', 'Power outlet, extension cord, or electrical problem', 7),
('maintenance_request', 'Network infrastructure', 'Network switch, router, or cabling issue', 8),
('maintenance_request', 'Other maintenance', 'Other maintenance requests', 99);

-- ============================================================
-- SEED DATA: General Complaints
-- ============================================================
INSERT INTO ticket_issue_types (category, name, description, display_order) VALUES
('general_complaint', 'Lab cleanliness', 'Lab is dirty or not properly maintained', 1),
('general_complaint', 'Seating arrangement', 'Issue with seating or workspace', 2),
('general_complaint', 'Temperature/lighting', 'Too hot, cold, or lighting issues', 3),
('general_complaint', 'Noise/disturbance', 'Noise or disturbance affecting work', 4),
('general_complaint', 'Access issue', 'Cannot access lab or restricted area', 5),
('general_complaint', 'Scheduling conflict', 'Lab booking or schedule conflict', 6),
('general_complaint', 'Other complaint', 'Other general complaints', 99);

-- ============================================================
-- SEED DATA: Other Category
-- ============================================================
INSERT INTO ticket_issue_types (category, name, description, display_order) VALUES
('other', 'General query', 'General question or inquiry', 1),
('other', 'Suggestion', 'Suggestion for improvement', 2),
('other', 'Feedback', 'Feedback about lab or services', 3),
('other', 'Other', 'Other issues not listed', 99);

-- Verify seed data
SELECT category, COUNT(*) as issue_count FROM ticket_issue_types GROUP BY category ORDER BY category;
