-- MIGRATION: Fix Receivables Schema
-- Descrição: Remove a coluna legada 'value' e garante que 'amount' seja a coluna principal.

DO $$ 
BEGIN 
    -- 1. Se a coluna 'value' existir e 'amount' não existia antes, poderíamos renomear.
    -- Mas como já adicionamos 'amount' em migrations anteriores, vamos apenas transferir os dados e dropar.

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receivables' AND column_name = 'value') THEN
        
        -- Garante que temos a coluna 'amount'
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receivables' AND column_name = 'amount') THEN
            ALTER TABLE public.receivables ADD COLUMN amount NUMERIC(15, 2);
        END IF;

        -- Migra dados de 'value' para 'amount' onde 'amount' estiver nulo
        UPDATE public.receivables SET amount = value WHERE amount IS NULL;

        -- Remove a constraint NOT NULL de 'value' para evitar erros imediatos se algo ainda tentar escrever nela
        ALTER TABLE public.receivables ALTER COLUMN value DROP NOT NULL;

        -- Remove a coluna 'value'
        ALTER TABLE public.receivables DROP COLUMN value;
    END IF;

    -- 2. Garante que 'amount' seja NOT NULL (agora que 'value' foi removida)
    -- Primeiro, garante que não há nulos
    UPDATE public.receivables SET amount = 0 WHERE amount IS NULL;
    ALTER TABLE public.receivables ALTER COLUMN amount SET NOT NULL;

END $$;

-- Recarrega o cache da API
NOTIFY pgrst, 'reload schema';
