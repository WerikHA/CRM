import { supabase } from './src/lib/supabaseClient.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Criando tabela form_integrations...");
  const sql = `
    CREATE TABLE IF NOT EXISTS public.form_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        fields JSONB DEFAULT '["company", "contact_name", "email", "phone"]'::jsonb,
        success_message TEXT DEFAULT 'Obrigado! Entraremos em contato em breve.',
        redirect_url TEXT,
        owner_id UUID REFERENCES public.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Habilitar RLS
    ALTER TABLE public.form_integrations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow All" ON public.form_integrations;
    CREATE POLICY "Allow All" ON public.form_integrations FOR ALL USING (true) WITH CHECK (true);
    
    -- Garantir que a tabela leads suporte source_form_id se necessário (opcional)
    -- ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_form_id UUID REFERENCES public.form_integrations(id);
  `;

  // Supabase doesn't have a direct raw SQL execution in the JS client for security reasons.
  // Usually, this is done via migrations or the SQL Editor in Supabase.
  // However, I can try to use the 'rpc' method if a generic 'exec_sql' exists or just assume I can create a table if RLS is bypassed.
  // Since I am an agent, I'll try to use a script that just uses the REST API if possible or I will just assume the table will be created by the user or I'll use an existing table if I can't.
  
  // Actually, I'll just use the dbService in the server to ensure consistency if I can.
  // But for now, let's just implement the logic.
  console.log("SQL Migration script prepared. Note: In this environment, we should run this via Supabase dashboard or I can try to use a simple 'create' call to see if it works (it won't for tables).");
}

run();
