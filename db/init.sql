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
('u3', 'Mariana Costa', 'mariana@design.com', 'DESIGNER'),
('u4', 'Roberto Financeiro', 'finance@agency.com', 'ADMIN'),
('u5', 'Agência Video Pro', 'parceiro@videopro.com', 'PARTNER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, name, agency_name, email, commission_type, commission_value) VALUES
('part1', 'Rodrigo Maker', 'Video Maker Pro', 'rodrigo@maker.com', 'fixed', 500),
('part2', 'Juliana Tráfego', 'Ads Experts', 'juliana@ads.com', 'percentage', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO leads (id, company, contact_name, email, status, estimated_value, last_contact) VALUES
('l1', 'TechFlow Solutions', 'Ana Silva', 'ana@techflow.com', 'negotiation', 5000, '15/04/2026'),
('l2', 'Padaria Central', 'João Santos', 'joao@padaria.com', 'prospect', 1200, '18/04/2026'),
('l3', 'Academia Muscle', 'Carlos Perez', 'carlos@muscle.com', 'converted', 3000, '20/04/2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, status, monthly_value, renewal_date, contact_email, assigned_designer_id, partner_id, designer_payout) VALUES
('c1', 'Global Fitness', 'active', 3500, '10/05/2026', 'mkt@globalfitness.com', 'u2', 'part1', 450),
('c2', 'Eco Vida', 'active', 2800, '01/06/2026', 'contato@ecovida.org', 'u3', 'part2', 380)
ON CONFLICT (id) DO NOTHING;

INSERT INTO receivables (id, client_id, description, amount, due_date, status, designer_id, payout_amount) VALUES
('r1', 'c1', 'Mensalidade Abril', 3500, '25/04/2026', 'pending', 'u2', 450),
('r2', 'c2', 'Campanha Orgânica', 1500, '10/04/2026', 'paid', 'u3', 380),
('r3', 'c1', 'Extra Social Media', 800, '05/05/2026', 'pending', 'u2', 100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO art_orders (id, title, client_id, designer_id, deadline, priority, progress, status, approval_status) VALUES
('a1', 'Post Instagram - Promoção Maio', 'c1', 'u2', '22/04/2026', 'high', 65, 'production', 'pending'),
('a2', 'Banner Site - Verão', 'c2', 'u3', '25/04/2026', 'medium', 20, 'queue', 'pending'),
('a3', 'Logo Refresh', 'c1', 'u2', '30/04/2026', 'low', 100, 'done', 'approved')
ON CONFLICT (id) DO NOTHING;
