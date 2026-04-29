-- COMPREHENSIVE SCHEMA VALIDATION & FIX
-- Esta versão é "idempotente": ela cria o que falta e ADICIONA colunas se a tabela já existir.

-- 1. UTILS (UUID Nativo do Postgres/Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função auxiliar para adicionar colunas com segurança
CREATE OR REPLACE FUNCTION add_column_if_not_exists(t_name text, c_name text, c_type text) 
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = c_name) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', t_name, c_name, c_type);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. TABELAS FUNDAMENTAIS

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'DESIGNER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
SELECT add_column_if_not_exists('users', 'avatar', 'TEXT');
SELECT add_column_if_not_exists('users', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('users', 'ui_preferences', 'JSONB DEFAULT ''{}''::jsonb');

-- PARTNERS
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
SELECT add_column_if_not_exists('partners', 'agency_name', 'TEXT');
SELECT add_column_if_not_exists('partners', 'phone', 'TEXT');
SELECT add_column_if_not_exists('partners', 'whatsapp', 'TEXT');
SELECT add_column_if_not_exists('partners', 'commission_type', 'TEXT DEFAULT ''fixed''');
SELECT add_column_if_not_exists('partners', 'commission_value', 'NUMERIC(15, 2) DEFAULT 0');

-- CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
SELECT add_column_if_not_exists('clients', 'status', 'TEXT DEFAULT ''active''');
SELECT add_column_if_not_exists('clients', 'monthly_value', 'NUMERIC(15, 2) DEFAULT 0');
SELECT add_column_if_not_exists('clients', 'renewal_date', 'TEXT');
SELECT add_column_if_not_exists('clients', 'contact_email', 'TEXT');
SELECT add_column_if_not_exists('clients', 'phone', 'TEXT');
SELECT add_column_if_not_exists('clients', 'assigned_designer_id', 'UUID REFERENCES public.users(id)');
SELECT add_column_if_not_exists('clients', 'assigned_video_editor_id', 'UUID REFERENCES public.users(id)');
SELECT add_column_if_not_exists('clients', 'partner_id', 'UUID REFERENCES public.partners(id)');
SELECT add_column_if_not_exists('clients', 'designer_payout', 'NUMERIC(15, 2) DEFAULT 0');
SELECT add_column_if_not_exists('clients', 'video_editor_payout', 'NUMERIC(15, 2) DEFAULT 0');
SELECT add_column_if_not_exists('clients', 'branding', 'JSONB DEFAULT ''{}''::jsonb');
SELECT add_column_if_not_exists('clients', 'demand_config', 'JSONB DEFAULT ''{"enabled": false}''::jsonb');

-- 3. TABELAS DE OPERAÇÃO
CREATE TABLE IF NOT EXISTS public.leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company TEXT, contact_name TEXT, email TEXT, phone TEXT, status TEXT DEFAULT 'new', source TEXT, owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('leads', 'owner_id', 'UUID');

CREATE TABLE IF NOT EXISTS public.receivables (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE, value NUMERIC(15, 2) NOT NULL, due_date DATE, status TEXT DEFAULT 'pending', owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('receivables', 'owner_id', 'UUID');

CREATE TABLE IF NOT EXISTS public.art_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, designer_id UUID REFERENCES public.users(id), status TEXT DEFAULT 'queue', owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('art_orders', 'owner_id', 'UUID');

CREATE TABLE IF NOT EXISTS public.video_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, editor_id UUID REFERENCES public.users(id), status TEXT DEFAULT 'queue', owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('video_orders', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('video_orders', 'demand_id', 'UUID');
SELECT add_column_if_not_exists('video_orders', 'observations', 'TEXT');
SELECT add_column_if_not_exists('video_orders', 'post_date', 'TEXT');
SELECT add_column_if_not_exists('video_orders', 'materials_link', 'TEXT');
SELECT add_column_if_not_exists('video_orders', 'deadline', 'TEXT');
SELECT add_column_if_not_exists('video_orders', 'priority', 'TEXT DEFAULT ''medium''');
SELECT add_column_if_not_exists('video_orders', 'progress', 'INTEGER DEFAULT 0');

CREATE TABLE IF NOT EXISTS public.demand_tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, type TEXT DEFAULT 'art', title TEXT, status TEXT DEFAULT 'todo', owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('demand_tasks', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('demand_tasks', 'observations', 'TEXT');
SELECT add_column_if_not_exists('demand_tasks', 'materials_link', 'TEXT');
SELECT add_column_if_not_exists('demand_tasks', 'post_date', 'TEXT');
SELECT add_column_if_not_exists('demand_tasks', 'post_time', 'TEXT');
SELECT add_column_if_not_exists('demand_tasks', 'quantity', 'INTEGER DEFAULT 1');
SELECT add_column_if_not_exists('demand_tasks', 'editor_id', 'UUID REFERENCES public.users(id)');
SELECT add_column_if_not_exists('demand_tasks', 'period_start', 'TEXT');
SELECT add_column_if_not_exists('demand_tasks', 'period_end', 'TEXT');
SELECT add_column_if_not_exists('demand_tasks', 'attachments', 'JSONB DEFAULT ''[]''::jsonb');

CREATE TABLE IF NOT EXISTS public.notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES public.users(id), title TEXT, message TEXT, read BOOLEAN DEFAULT false, owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('notifications', 'owner_id', 'UUID');

CREATE TABLE IF NOT EXISTS public.partner_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), partner_id UUID REFERENCES public.partners(id), client_id UUID REFERENCES public.clients(id), title TEXT, status TEXT DEFAULT 'pending', owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('partner_requests', 'owner_id', 'UUID');

CREATE TABLE IF NOT EXISTS public.support_tickets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID REFERENCES public.clients(id), subject TEXT, priority TEXT DEFAULT 'normal', status TEXT DEFAULT 'open', owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('support_tickets', 'partner_id', 'UUID REFERENCES public.partners(id)');
SELECT add_column_if_not_exists('support_tickets', 'response', 'TEXT');
SELECT add_column_if_not_exists('support_tickets', 'owner_id', 'UUID');
SELECT add_column_if_not_exists('partner_requests', 'description', 'TEXT');
SELECT add_column_if_not_exists('support_tickets', 'description', 'TEXT');

-- 4. PROSPECTING SYSTEM
CREATE TABLE IF NOT EXISTS public.prospecting_lists (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, source TEXT, owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('prospecting_lists', 'owner_id', 'UUID');

CREATE TABLE IF NOT EXISTS public.prospecting_leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), list_id UUID REFERENCES public.prospecting_lists(id) ON DELETE CASCADE, company TEXT, name TEXT, email TEXT, phone TEXT, status TEXT DEFAULT 'new', owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('prospecting_leads', 'owner_id', 'UUID');

CREATE TABLE IF NOT EXISTS public.campaigns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, status TEXT DEFAULT 'stopped', list_id UUID REFERENCES public.prospecting_lists(id), message_template TEXT, owner_id UUID REFERENCES public.users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
SELECT add_column_if_not_exists('campaigns', 'owner_id', 'UUID');

CREATE TABLE IF NOT EXISTS public.message_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES public.prospecting_leads(id), campaign_id UUID REFERENCES public.campaigns(id), status TEXT, sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, owner_id UUID REFERENCES public.users(id));
SELECT add_column_if_not_exists('message_history', 'owner_id', 'UUID');

-- 5. RLS (Segurança)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Desabilita RLS primeiro para garantir acesso se o script travar
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
        
        -- Habilita RLS e cria política de acesso total (Safety Net)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow All" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow All" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;
