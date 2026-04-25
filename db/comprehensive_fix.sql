-- COMPREHENSIVE SCHEMA VALIDATION & FIX
-- This script ensures all tables referenced in the CRM exist with correct types and basic RLS.

-- 1. UTILS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE DEFINITIONS (Durable & Idempotent)

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'DESIGNER',
    avatar TEXT,
    owner_id UUID,
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
    commission_type TEXT DEFAULT 'fixed',
    commission_value NUMERIC(15, 2) DEFAULT 0,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    monthly_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    renewal_date TEXT,
    contact_email TEXT,
    phone TEXT,
    assigned_designer_id UUID REFERENCES public.users(id),
    assigned_video_editor_id UUID REFERENCES public.users(id),
    partner_id UUID REFERENCES public.partners(id),
    designer_payout NUMERIC(15, 2) DEFAULT 0,
    video_editor_payout NUMERIC(15, 2) DEFAULT 0,
    branding JSONB DEFAULT '{}'::jsonb,
    demand_config JSONB DEFAULT '{"enabled": false}'::jsonb,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LEADS
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'new',
    source TEXT,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RECEIVABLES (Financial)
CREATE TABLE IF NOT EXISTS public.receivables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    description TEXT,
    value NUMERIC(15, 2) NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ART ORDERS
CREATE TABLE IF NOT EXISTS public.art_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    designer_id UUID REFERENCES public.users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue',
    approval_status TEXT DEFAULT 'pending',
    feedback_requested BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- VIDEO ORDERS
CREATE TABLE IF NOT EXISTS public.video_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    editor_id UUID REFERENCES public.users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue',
    approval_status TEXT DEFAULT 'pending',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DEMAND TASKS (Recurrent)
CREATE TABLE IF NOT EXISTS public.demand_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'art',
    title TEXT,
    observations TEXT,
    quantity INTEGER DEFAULT 1,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'todo',
    editor_id UUID REFERENCES public.users(id),
    post_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    owner_id UUID REFERENCES public.users(id)
);

-- PARTNER REQUESTS
CREATE TABLE IF NOT EXISTS public.partner_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.partners(id),
    client_id UUID REFERENCES public.clients(id),
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id),
    subject TEXT,
    description TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    title TEXT,
    message TEXT,
    read BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PROSPECTING SYSTEM
CREATE TABLE IF NOT EXISTS public.prospecting_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    source TEXT,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.prospecting_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES public.prospecting_lists(id) ON DELETE CASCADE,
    company TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    instagram TEXT,
    website TEXT,
    status TEXT DEFAULT 'new',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'stopped',
    list_id UUID REFERENCES public.prospecting_lists(id),
    message_template TEXT,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.message_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES public.prospecting_leads(id),
    campaign_id UUID REFERENCES public.campaigns(id),
    status TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    owner_id UUID REFERENCES public.users(id)
);

-- 3. RLS ENABLEMENT
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_history ENABLE ROW LEVEL SECURITY;

-- 4. BASIC POLICIES (Assuming owner_id isolation)
-- We use broad policies here since the Server handles the Auth logic, 
-- but these provide a safety net if keys are ever exposed.

-- Note: We drop existing before creating to avoid errors in multiple runs
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Owner Isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Owner Isolation" ON public.%I FOR ALL USING (owner_id = (SELECT id FROM users WHERE id = auth.uid()) OR auth.jwt() ->> ''role'' = ''service_role'')', t);
    END LOOP;
END $$;
