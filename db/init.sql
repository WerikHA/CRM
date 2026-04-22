-- AgencyFlow CRM - Initial Database Schema
-- Optimized for PostgreSQL

-- Users Table (Admin, Designers, Partners)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'DESIGNER', -- 'ADMIN', 'DESIGNER', 'PARTNER'
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partners Table (Agencies)
CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    agency_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    commission_type TEXT DEFAULT 'fixed',
    commission_value NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'former'
    monthly_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    renewal_date TEXT,
    contact_email TEXT,
    phone TEXT,
    assigned_designer_id TEXT REFERENCES users(id),
    partner_id TEXT REFERENCES partners(id),
    designer_payout NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'prospect', -- 'prospect', 'negotiation', 'converted', 'lost'
    estimated_value NUMERIC(10, 2) DEFAULT 0,
    last_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Art Orders (Design Workflow)
CREATE TABLE IF NOT EXISTS art_orders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client_id TEXT REFERENCES clients(id),
    designer_id TEXT REFERENCES users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue', -- 'queue', 'production', 'review', 'done'
    approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    whatsapp_sent_at TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Finance / Receivables
CREATE TABLE IF NOT EXISTS receivables (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id),
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    designer_id TEXT REFERENCES users(id),
    payout_amount NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partner Requests
CREATE TABLE IF NOT EXISTS partner_requests (
    id TEXT PRIMARY KEY,
    partner_id TEXT REFERENCES partners(id),
    service_type TEXT,
    client_name TEXT,
    cost NUMERIC(10, 2),
    status TEXT DEFAULT 'pending',
    related_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data (Bootstrap)
INSERT INTO users (id, name, email, role) VALUES 
('u1', 'Werik Admin', 'admin@agency.com', 'ADMIN'),
('u2', 'Lucas Andrade', 'lucas@design.com', 'DESIGNER'),
('u3', 'Mariana Costa', 'mariana@design.com', 'DESIGNER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, name, agency_name, email, commission_type, commission_value) VALUES
('part1', 'Rodrigo Maker', 'Video Maker Pro', 'rodrigo@maker.com', 'fixed', 500)
ON CONFLICT (id) DO NOTHING;
