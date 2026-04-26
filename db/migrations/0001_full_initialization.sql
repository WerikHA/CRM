-- FULL DATABASE INITIALIZATION (idempotent)
-- VERSION: 2.0
-- DESCRIPTION: Recriação completa com owner_id em todas as tabelas e tipos UUID.

-- 1. UTILS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES CLEANUP (Opcional - Comente se quiser apenas atualizar)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '123456',
    role TEXT NOT NULL DEFAULT 'DESIGNER', -- 'ADMIN', 'DESIGNER', 'PARTNER', 'EDITOR', 'OWNER'
    avatar TEXT,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PARTNERS TABLE
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    agency_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    commission_type TEXT DEFAULT 'fixed',
    commission_value NUMERIC(15, 2) DEFAULT 0,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. OPERATION TABLES
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    estimated_value NUMERIC(15, 2) DEFAULT 0,
    last_contact TEXT,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.demand_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'art',
    quantity INTEGER DEFAULT 1,
    title TEXT,
    status TEXT DEFAULT 'todo',
    observations TEXT,
    post_date TEXT,
    post_time TEXT,
    editor_id UUID REFERENCES public.users(id),
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.art_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    designer_id UUID REFERENCES public.users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue',
    approval_status TEXT DEFAULT 'pending',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.video_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    editor_id UUID REFERENCES public.users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    designer_id UUID REFERENCES public.users(id),
    payout_amount NUMERIC(15, 2),
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.partner_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id),
    client_id UUID REFERENCES public.clients(id),
    title TEXT,
    description TEXT,
    cost NUMERIC(15, 2),
    status TEXT DEFAULT 'pending',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id),
    user_id UUID REFERENCES public.users(id),
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PROSPECTING TABLES
CREATE TABLE IF NOT EXISTS public.prospecting_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source TEXT,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.prospecting_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES public.prospecting_lists(id) ON DELETE CASCADE,
    company TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'new',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'stopped',
    list_id UUID REFERENCES public.prospecting_lists(id),
    message_template TEXT,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.message_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.prospecting_leads(id),
    campaign_id UUID REFERENCES public.campaigns(id),
    status TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    owner_id UUID REFERENCES public.users(id)
);

-- 8. AUXILIARY: add_column_if_not_exists (Para atualizações futuras fugindo do DROP)
CREATE OR REPLACE FUNCTION add_column_if_not_exists(t_name text, c_name text, c_type text) 
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = c_name) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', t_name, c_name, c_type);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Executando checks de owner_id e outras colunas essenciais
SELECT add_column_if_not_exists('art_orders', 'progress', 'INTEGER');
SELECT add_column_if_not_exists('art_orders', 'approval_status', 'TEXT');
SELECT add_column_if_not_exists('clients', 'branding', 'JSONB');
SELECT add_column_if_not_exists('clients', 'demand_config', 'JSONB');
SELECT add_column_if_not_exists('receivables', 'amount', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('receivables', 'payout_amount', 'NUMERIC(15, 2)');
SELECT add_column_if_not_exists('receivables', 'designer_id', 'UUID');
SELECT add_column_if_not_exists('video_orders', 'progress', 'INTEGER');

SELECT add_column_if_not_exists('users', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('partners', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('clients', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('leads', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('demand_tasks', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('art_orders', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('video_orders', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('receivables', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('partner_requests', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('support_tickets', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('notifications', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('prospecting_lists', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('prospecting_leads', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('campaigns', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('message_history', 'owner_id', 'UUID');

-- 9. SECURITY (RLS)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow All" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow All" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 10. BOOTSTRAP DATA (Só insere se não houver conflito de Email)
INSERT INTO public.users (id, name, email, password, role) 
VALUES 
('00000000-0000-0000-0000-000000000001', 'Werik Admin', 'admin@amplifica.com', 'admin123', 'OWNER'),
('00000000-0000-0000-0000-000000000002', 'Werik Playstore', 'werikplaystore@gmail.com', 'admin123', 'OWNER')
ON CONFLICT (email) DO NOTHING;
