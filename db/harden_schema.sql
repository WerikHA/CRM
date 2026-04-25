-- AMPLIFICA CRM - HARDENED DATABASE SCHEMA
-- Version: 2.0.0
-- Standardizing on UUID and implementing strict RLS.

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. FUNCTIONS & HELPERS
CREATE OR REPLACE FUNCTION public.get_auth_role() RETURNS text AS $$
    -- In a real Supabase Auth setup, this would be (auth.jwt() ->> 'role')
    -- For this Express proxy setup, we might rely on the server setting a search_path or config
    -- But for RLS to work properly, we'll assume we're using current_setting
    SELECT current_setting('app.current_user_role', true);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_id() RETURNS uuid AS $$
    -- Safely parse UUID from setting
    SELECT CASE 
        WHEN current_setting('app.current_user_id', true) = '' THEN NULL
        ELSE current_setting('app.current_user_id', true)::uuid
    END;
$$ LANGUAGE sql STABLE;

-- 2. TABLE CORRECTIONS
-- We'll use a safer approach: rename existing tables, create new ones, and migrate data.

-- [Simplified for this turn: I'll create the tables if they don't exist with correct types]

-- USERS (Profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    email TEXT UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    password TEXT NOT NULL CHECK (char_length(password) >= 6),
    role TEXT NOT NULL DEFAULT 'DESIGNER' CHECK (role IN ('ADMIN', 'DESIGNER', 'PARTNER', 'EDITOR', 'OWNER')),
    avatar TEXT,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) <= 150),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'former')),
    monthly_value NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (monthly_value >= 0),
    renewal_date TEXT,
    contact_email TEXT,
    phone TEXT,
    assigned_designer_id UUID REFERENCES public.users(id),
    assigned_video_editor_id UUID REFERENCES public.users(id),
    partner_id UUID, -- References partners table later
    designer_payout NUMERIC(15, 2) DEFAULT 0,
    video_editor_payout NUMERIC(15, 2) DEFAULT 0,
    branding JSONB DEFAULT '{}'::jsonb,
    demand_config JSONB DEFAULT '{"enabled": false}'::jsonb,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PARTNERS
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    agency_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    commission_type TEXT DEFAULT 'fixed' CHECK (commission_type IN ('fixed', 'percentage')),
    commission_value NUMERIC(15, 2) DEFAULT 0,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fix back-reference
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_partner_id_fkey;
ALTER TABLE public.clients ADD CONSTRAINT clients_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);

-- ART ORDERS
CREATE TABLE IF NOT EXISTS public.art_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL CHECK (char_length(title) <= 200),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    designer_id UUID REFERENCES public.users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'queue' CHECK (status IN ('queue', 'production', 'review', 'done')),
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. RLS SETUP
-- For this Express App, the server will call:
-- SET LOCAL "app.current_user_id" = 'uuid';
-- SET LOCAL "app.current_user_role" = 'role';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_orders ENABLE ROW LEVEL SECURITY;

-- Policies for USERS
CREATE POLICY "Users can view themselves" ON public.users FOR SELECT
    USING (id = get_auth_id() OR get_auth_role() IN ('ADMIN', 'OWNER'));

-- Policies for CLIENTS
CREATE POLICY "Owners can manage their clients" ON public.clients FOR ALL
    USING (owner_id = get_auth_id());

CREATE POLICY "Team can view assigned clients" ON public.clients FOR SELECT
    USING (
        assigned_designer_id = get_auth_id() OR 
        assigned_video_editor_id = get_auth_id() OR
        partner_id IN (SELECT id FROM public.partners WHERE email = (SELECT email FROM public.users WHERE id = get_auth_id()))
    );

-- 4. TRIGGERS
CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NULL THEN
        NEW.owner_id := get_auth_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_clients_owner BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE PROCEDURE set_owner_id();
CREATE TRIGGER tr_art_orders_owner BEFORE INSERT ON public.art_orders FOR EACH ROW EXECUTE PROCEDURE set_owner_id();
