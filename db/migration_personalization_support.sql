-- SCRIPT DE MIGRAÇÃO: Personalização e Suporte
-- Execute este script no Editor SQL para corrigir colunas ausentes

-- 1. Preferências de Interface dos Usuários
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ui_preferences') THEN
        ALTER TABLE public.users ADD COLUMN ui_preferences JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Sistema de Tickets de Suporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    subject TEXT,
    description TEXT,
    response TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Garantir colunas extras em support_tickets (caso a tabela já existisse simplificada)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'partner_id') THEN
        ALTER TABLE public.support_tickets ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'description') THEN
        ALTER TABLE public.support_tickets ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'response') THEN
        ALTER TABLE public.support_tickets ADD COLUMN response TEXT;
    END IF;
END $$;

-- 4. Recarregar Cache do Esquema (Para ambientes com PostgREST)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
