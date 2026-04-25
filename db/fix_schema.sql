-- AMPLIFICA CRM - COMPLETE DATABASE RECONSTRUCTION
-- Run this in your Supabase SQL Editor

-- 0. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLEANUP & PREPARATION
-- We will alter columns to UUID. This might require dropping and recreating fkeys.

-- 2. CORE TABLES RECONSTRUCTION (UUID STANDARD)

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '123456',
    role TEXT NOT NULL DEFAULT 'DESIGNER', -- 'ADMIN', 'DESIGNER', 'PARTNER', 'EDITOR', 'OWNER'
    avatar TEXT,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PARTNERS
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    agency_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    commission_type TEXT DEFAULT 'fixed',
    commission_value NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    monthly_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    renewal_date TEXT,
    contact_email TEXT,
    phone TEXT,
    assigned_designer_id UUID REFERENCES users(id),
    partner_id UUID REFERENCES partners(id),
    designer_payout NUMERIC(10, 2) DEFAULT 0,
    branding JSONB DEFAULT '{}'::jsonb,
    demand_config JSONB DEFAULT '{"enabled": false, "type": "art", "quantity": 1, "frequency": "weekly"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LEADS
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'prospect',
    estimated_value NUMERIC(10, 2) DEFAULT 0,
    last_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROSPECTING & CAMPAIGNS (NEW TABLES)

-- Prospecting Lists
CREATE TABLE IF NOT EXISTS prospecting_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    source TEXT, -- 'google', 'instagram', 'manual'
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prospecting Leads (Leads specifically inside lists)
CREATE TABLE IF NOT EXISTS prospecting_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES prospecting_lists(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    rating NUMERIC(2,1),
    reviews_count INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'interested', 'not_interested'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    list_id UUID REFERENCES prospecting_lists(id),
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
    template_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message History
CREATE TABLE IF NOT EXISTS message_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID, -- Can be from prospecting_leads OR leads
    client_id UUID REFERENCES clients(id),
    campaign_id UUID REFERENCES campaigns(id),
    direction TEXT NOT NULL, -- 'sent', 'received'
    content TEXT NOT NULL,
    channel TEXT DEFAULT 'whatsapp',
    status TEXT DEFAULT 'delivered',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. OPERATIONAL TABLES

-- Demand Tasks
CREATE TABLE IF NOT EXISTS demand_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'todo',
    observations TEXT,
    post_date TEXT,
    post_time TEXT,
    editor_id UUID REFERENCES users(id),
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES users(id), -- If system, this will be null
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    created_at_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. RLS POLICIES (BASIC SECURE SETUP)

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospecting_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Simple "Authenticated users can do everything" for now to fix access
-- (You should harden this later)
CREATE POLICY "Allow all to authenticated" ON users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON leads FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON prospecting_lists FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON campaigns FOR ALL TO authenticated USING (true);

-- 6. TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_leads_modtime BEFORE UPDATE ON leads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
