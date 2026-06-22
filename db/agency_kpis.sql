
-- Agency KPIs Migration
CREATE TABLE IF NOT EXISTS public.agency_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    period_date DATE DEFAULT CURRENT_DATE,
    total_active_monthly_value DECIMAL(12, 2) DEFAULT 0,
    total_leads_count INTEGER DEFAULT 0,
    total_active_clients_count INTEGER DEFAULT 0,
    avg_art_completion_percent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_agency_kpis_owner_date ON public.agency_kpis(owner_id, period_date);
