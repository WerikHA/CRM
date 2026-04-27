-- MIGRATION: PERSISTENCE & CONFIGURATIONS
-- Adiciona suporte a configurações centralizadas e documentos de clientes

-- 1. Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS public.system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    config_key TEXT NOT NULL,
    config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id, config_key)
);

-- 2. Tabela de Documentos/Contratos de Clientes
CREATE TABLE IF NOT EXISTS public.client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    file_type TEXT, -- 'google_drive', 'local_upload', 'contract', etc.
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Correção de Inconsistência na tabela Receivables
-- Garantir que a coluna se chama 'quantia' para consistência com o novo padrão solicitado
DO $$
BEGIN
    -- Se a tabela existir e tiver 'valor', renomeia para 'quantia'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receivables' AND column_name = 'valor') THEN
        ALTER TABLE public.receivables RENAME COLUMN valor TO quantia;
    END IF;
    
    -- Se a tabela existir e tiver 'amount', renomeia para 'quantia'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receivables' AND column_name = 'amount') THEN
        ALTER TABLE public.receivables RENAME COLUMN amount TO quantia;
    END IF;

    -- Se a tabela existir mas não tiver 'quantia', adiciona
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receivables' AND column_name = 'quantia') THEN
        ALTER TABLE public.receivables ADD COLUMN quantia NUMERIC(15, 2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Habilitar RLS para as novas tabelas
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All" ON public.system_configs;
CREATE POLICY "Allow All" ON public.system_configs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON public.client_documents;
CREATE POLICY "Allow All" ON public.client_documents FOR ALL USING (true) WITH CHECK (true);
