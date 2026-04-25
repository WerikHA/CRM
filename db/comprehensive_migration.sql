-- AMPLIFICA CRM - COMPREHENSIVE DATABASE RECONSTRUCTION
-- USE THIS TO FIX ALL UUID/TEXT TYPE MISMATCHES

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLEANUP (WARNING: This will drop existing tables to ensure clean schema)
DROP TABLE IF EXISTS message_history CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS prospecting_leads CASCADE;
DROP TABLE IF EXISTS prospecting_lists CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS partner_requests CASCADE;
DROP TABLE IF EXISTS receivables CASCADE;
DROP TABLE IF EXISTS video_orders CASCADE;
DROP TABLE IF EXISTS art_orders CASCADE;
DROP TABLE IF EXISTS demand_tasks CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. TABLES

-- USERS
CREATE TABLE users (
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

-- PARTNERS (Agencies)
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    agency_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    commission_type TEXT DEFAULT 'fixed',
    commission_value NUMERIC(10, 2) DEFAULT 0,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CLIENTS
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    monthly_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    renewal_date TEXT,
    contact_email TEXT,
    phone TEXT,
    assigned_designer_id UUID REFERENCES users(id),
    assigned_video_editor_id UUID REFERENCES users(id),
    partner_id UUID REFERENCES partners(id),
    designer_payout NUMERIC(10, 2) DEFAULT 0,
    video_editor_payout NUMERIC(10, 2) DEFAULT 0,
    pix_key TEXT,
    branding JSONB DEFAULT '{}'::jsonb,
    demand_config JSONB DEFAULT '{"enabled": false, "type": "art", "quantity": 1, "frequency": "weekly"}'::jsonb,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LEADS
CREATE TABLE leads (
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
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DEMAND TASKS
CREATE TABLE demand_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    quantity INTEGER DEFAULT 1,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'todo',
    observations TEXT,
    post_date TEXT,
    post_time TEXT,
    editor_id UUID REFERENCES users(id),
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ART ORDERS
CREATE TABLE art_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    client_id UUID REFERENCES clients(id),
    designer_id UUID REFERENCES users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue',
    approval_status TEXT DEFAULT 'pending',
    whatsapp_sent_at TEXT,
    rejection_notes TEXT,
    feedback_requested BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VIDEO ORDERS
CREATE TABLE video_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    client_id UUID REFERENCES clients(id),
    editor_id UUID REFERENCES users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RECEIVABLES (FINANCE)
CREATE TABLE receivables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    designer_id UUID REFERENCES users(id),
    payout_amount NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PARTNER REQUESTS
CREATE TABLE partner_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES partners(id),
    partner_name TEXT,
    service_type TEXT,
    client_name TEXT,
    cost NUMERIC(10, 2),
    status TEXT DEFAULT 'pending',
    related_order_id UUID, -- Generic UUID link
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SUPPORT TICKETS
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES users(id),
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    created_at_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROSPECTING
CREATE TABLE prospecting_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    source TEXT,
    category TEXT,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prospecting_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES prospecting_lists(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    rating NUMERIC(2,1),
    reviews_count INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    list_id UUID REFERENCES prospecting_lists(id),
    status TEXT DEFAULT 'draft',
    template_message TEXT,
    channel TEXT DEFAULT 'whatsapp',
    delay_between_messages INTEGER DEFAULT 30,
    daily_limit INTEGER DEFAULT 50,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE message_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID,
    client_id UUID REFERENCES clients(id),
    campaign_id UUID REFERENCES campaigns(id),
    direction TEXT NOT NULL,
    content TEXT NOT NULL,
    channel TEXT DEFAULT 'whatsapp',
    status TEXT DEFAULT 'delivered',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TRIGGERS & FUNCTIONS

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('CREATE TRIGGER update_%I_modtime BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- 4. INITIAL DATA (BOOTSTRAP)
-- WARNING: We use hardcoded UUIDs for bootstrap to ensure they link correctly
-- You can replace these with your own if needed

INSERT INTO users (id, name, email, password, role) VALUES 
('00000000-0000-4000-a000-000000000001', 'Werik Admin', 'admin@amplifica.com', 'admin123', 'ADMIN'),
('00000000-0000-4000-a000-000000000002', 'Werik User', 'werikplaystore@gmail.com', 'admin123', 'ADMIN')
ON CONFLICT (id) DO NOTHING;

UPDATE users SET owner_id = id WHERE role = 'ADMIN';

-- 5. RLS POLICIES (BASIC SECURE SETUP)

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all to authenticated" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow all to authenticated" ON %I FOR ALL TO authenticated USING (true)', t);
    END LOOP;
END;
$$;
