
-- LGPD Compliance Migration

-- 1. Update users table for versioned terms acceptance
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0';

-- 2. Update leads table for consent
ALTER TABLE IF EXISTS public.leads 
ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS public.leads 
ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP WITH TIME ZONE;

-- 3. Ensure ON DELETE CASCADE for multi-tenant data
-- Drop existing constraints first to be sure
ALTER TABLE IF EXISTS public.partners DROP CONSTRAINT IF EXISTS partners_owner_id_fkey;
ALTER TABLE IF EXISTS public.partners ADD CONSTRAINT partners_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.clients DROP CONSTRAINT IF EXISTS clients_owner_id_fkey;
ALTER TABLE IF EXISTS public.clients ADD CONSTRAINT clients_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.leads DROP CONSTRAINT IF EXISTS leads_owner_id_fkey;
ALTER TABLE IF EXISTS public.leads ADD CONSTRAINT leads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_owner_id_fkey;
ALTER TABLE IF EXISTS public.support_tickets ADD CONSTRAINT support_tickets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_owner_id_fkey;
ALTER TABLE IF EXISTS public.activity_logs ADD CONSTRAINT activity_logs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Backup service could also have it
ALTER TABLE IF EXISTS public.prospecting_lists DROP CONSTRAINT IF EXISTS prospecting_lists_owner_id_fkey;
ALTER TABLE IF EXISTS public.prospecting_lists ADD CONSTRAINT prospecting_lists_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Data Privacy Audit Logging (Optional but recommended)
-- This table already exists in some scripts, ensuring it has what we need
CREATE TABLE IF NOT EXISTS public.privacy_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'data_export', 'consent_update', 'account_deletion'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
