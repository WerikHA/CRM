-- Amplifica CRM - Initial Database Schema
-- Optimized for PostgreSQL

-- Users Table (Admin, Designers, Partners)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '123456', -- Added password field
    role TEXT NOT NULL DEFAULT 'DESIGNER', -- 'ADMIN', 'DESIGNER', 'PARTNER', 'EDITOR'
    avatar TEXT,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partners Table (Agencies)
CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    agency_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    commission_type TEXT DEFAULT 'fixed',
    commission_value NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'former'
    monthly_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    renewal_date TEXT,
    contact_email TEXT,
    phone TEXT,
    assigned_designer_id TEXT REFERENCES users(id),
    partner_id TEXT REFERENCES partners(id),
    designer_payout NUMERIC(10, 2) DEFAULT 0,
    branding JSONB,
    demand_config JSONB DEFAULT '{"enabled": false, "type": "art", "quantity": 1, "frequency": "weekly"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Demandas Table (Kanban for recurring tasks)
CREATE TABLE IF NOT EXISTS demand_tasks (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'art', 'video', 'recording'
    quantity INTEGER DEFAULT 1,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'todo', -- 'todo', 'done'
    observations TEXT,
    post_date TEXT,
    post_time TEXT,
    editor_id TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'prospect', -- 'prospect', 'negotiation', 'converted', 'lost'
    estimated_value NUMERIC(10, 2) DEFAULT 0,
    last_contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Art Orders (Design Workflow)
CREATE TABLE IF NOT EXISTS art_orders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client_id TEXT REFERENCES clients(id),
    designer_id TEXT REFERENCES users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue', -- 'queue', 'production', 'review', 'done'
    approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    whatsapp_sent_at TEXT,
    rejection_notes TEXT,
    feedback_requested BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Finance / Receivables
CREATE TABLE IF NOT EXISTS receivables (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id),
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    designer_id TEXT REFERENCES users(id),
    payout_amount NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partner Requests
CREATE TABLE IF NOT EXISTS partner_requests (
    id TEXT PRIMARY KEY,
    partner_id TEXT REFERENCES partners(id),
    partner_name TEXT,
    service_type TEXT,
    client_name TEXT,
    cost NUMERIC(10, 2),
    status TEXT DEFAULT 'pending',
    related_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    partner_id TEXT REFERENCES users(id),
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'replied', 'closed'
    created_at TEXT,
    created_at_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Video Orders
CREATE TABLE IF NOT EXISTS video_orders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client_id TEXT REFERENCES clients(id),
    editor_id TEXT REFERENCES users(id),
    deadline TEXT,
    priority TEXT DEFAULT 'medium',
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data (Bootstrap)
INSERT INTO users (id, name, email, password, role) VALUES 
('u1', 'Werik Admin', 'admin@amplifica.com', 'admin123', 'ADMIN'),
('u_main', 'Werik User', 'werikplaystore@gmail.com', 'admin123', 'ADMIN'),
('u2', 'Lucas Andrade', 'lucas@design.com', 'design123', 'DESIGNER'),
('u3', 'Mariana Costa', 'mariana@design.com', 'design123', 'DESIGNER'),
('u4', 'Roberto Financeiro', 'finance@amplifica.com', 'finance123', 'ADMIN'),
('u5', 'Agência Video Pro', 'parceiro@videopro.com', 'partner123', 'PARTNER'),
('u6', 'Fernanda Lima', 'fernanda@design.com', 'design123', 'DESIGNER'),
('u7', 'Eduardo Santos', 'edu@design.com', 'design123', 'DESIGNER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partners (id, name, agency_name, email, commission_type, commission_value) VALUES
('part1', 'Rodrigo Maker', 'Video Maker Pro', 'rodrigo@maker.com', 'fixed', 500),
('part2', 'Juliana Tráfego', 'Ads Experts', 'juliana@ads.com', 'percentage', 10),
('part3', 'Marcos Dev', 'Code Hub', 'marcos@codehub.com', 'percentage', 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO leads (id, company, contact_name, email, status, estimated_value, last_contact) VALUES
('l1', 'TechFlow Solutions', 'Ana Silva', 'ana@techflow.com', 'negotiation', 5000, '15/04/2026'),
('l2', 'Padaria Central', 'João Santos', 'joao@padaria.com', 'prospect', 1200, '18/04/2026'),
('l3', 'Academia Muscle', 'Carlos Perez', 'carlos@muscle.com', 'converted', 3000, '20/04/2026'),
('l4', 'Clínica Sorriso', 'Beatriz Oliveira', 'beatriz@sorriso.com', 'negotiation', 4500, '22/04/2026'),
('l5', 'Restaurante Sabor', 'Henrique Lima', 'henrique@sabor.com', 'prospect', 2500, '23/04/2026'),
('l6', 'Loja Moda Fit', 'Sílvia Reis', 'silvia@modafit.com', 'lost', 1800, '10/04/2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, status, monthly_value, renewal_date, contact_email, assigned_designer_id, partner_id, designer_payout) VALUES
('c1', 'Global Fitness', 'active', 3500, '10/05/2026', 'mkt@globalfitness.com', 'u2', 'part1', 450),
('c2', 'Eco Vida', 'active', 2800, '01/06/2026', 'contato@ecovida.org', 'u3', 'part2', 380),
('c3', 'Hotel Paradiso', 'active', 4200, '15/05/2026', 'reservas@paradiso.com', 'u6', 'part1', 600),
('c4', 'Boutique Glamour', 'active', 2200, '20/05/2026', 'vendas@glamour.com', 'u7', NULL, 300),
('c5', 'Sacolão do Bairro', 'paused', 1500, '05/06/2026', 'contato@sacolao.com', 'u2', NULL, 200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO receivables (id, client_id, description, amount, due_date, status, designer_id, payout_amount) VALUES
('r1', 'c1', 'Mensalidade Abril', 3500, '25/04/2026', 'pending', 'u2', 450),
('r2', 'c2', 'Campanha Orgânica', 1500, '10/04/2026', 'paid', 'u3', 380),
('r3', 'c1', 'Extra Social Media', 800, '05/05/2026', 'pending', 'u2', 100),
('r4', 'c3', 'Mensalidade Abril', 4200, '20/04/2026', 'paid', 'u6', 600),
('r5', 'c4', 'Lançamento Coleção', 2200, '28/04/2026', 'pending', 'u7', 300)
ON CONFLICT (id) DO NOTHING;

INSERT INTO art_orders (id, title, client_id, designer_id, deadline, priority, progress, status, approval_status) VALUES
('a1', 'Post Instagram - Promoção Maio', 'c1', 'u2', '22/04/2026', 'high', 65, 'production', 'pending'),
('a2', 'Banner Site - Verão', 'c2', 'u3', '25/04/2026', 'medium', 20, 'queue', 'pending'),
('a3', 'Logo Refresh', 'c1', 'u2', '30/04/2026', 'low', 100, 'done', 'approved'),
('a4', 'Vídeo Reels Semanal', 'c3', 'u6', '24/04/2026', 'high', 90, 'review', 'pending'),
('a5', 'Artes Stories Dia das Mães', 'c1', 'u2', '05/05/2026', 'high', 10, 'queue', 'pending'),
('a6', 'Identidade Visual Café', 'c4', 'u7', '15/05/2026', 'medium', 450, 'production', 'pending'),
('a7', 'Cardápio Digital QR', 'c5', 'u2', '10/04/2026', 'low', 100, 'done', 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_requests (id, partner_id, partner_name, service_type, client_name, cost, status, related_order_id) VALUES
('pr1', 'part1', 'Rodrigo Maker', 'Video Editing', 'Global Fitness', 500, 'pending', 'a1'),
('pr2', 'part2', 'Juliana Tráfego', 'Media Buying', 'Eco Vida', 300, 'completed', NULL),
('pr3', 'part3', 'Marcos Dev', 'LP Development', 'Hotel Paradiso', 1200, 'pending', 'a4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO support_tickets (id, partner_id, subject, description, status, created_at) VALUES
('t1', 'u5', 'Erro no Upload de Arquivo', 'Não consigo subir o vídeo de 50MB no sistema.', 'open', '21/04/2026 14:30'),
('t2', 'u5', 'Dúvida sobre Pagamento', 'O valor da comissão de Março veio diferente do esperado.', 'replied', '15/04/2026 09:15'),
('t3', 'u2', 'Sugestão de Feature', 'Seria legal ter um modo escuro no dashboard.', 'closed', '10/04/2026 18:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO video_orders (id, title, client_id, editor_id, deadline, priority, progress, status) VALUES
('v1', 'Edição Workshop Fit', 'c1', 'u5', '28/04/2026', 'high', 30, 'production'),
('v2', 'Motion Graphics Logo', 'c3', 'u5', '02/05/2026', 'medium', 0, 'queue')
ON CONFLICT (id) DO NOTHING;
