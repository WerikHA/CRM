-- NOTIFICATIONS TABLE AND TRIGGERS

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'lead', 'ticket', 'approval', 'system'
    link TEXT, -- Optional link to redirect
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to notify admins
CREATE OR REPLACE FUNCTION notify_admins(title TEXT, message TEXT, type TEXT, link TEXT)
RETURNS VOID AS $$
DECLARE
    admin_record RECORD;
BEGIN
    FOR admin_record IN SELECT id FROM users WHERE role = 'ADMIN' LOOP
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (admin_record.id, title, message, type, link);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger for New Leads
CREATE OR REPLACE FUNCTION on_new_lead()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM notify_admins(
        'Novo Lead Recebido',
        'Um novo lead de ' || NEW.company || ' foi cadastrado.',
        'lead',
        'leads'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_new_lead ON leads;
CREATE TRIGGER trigger_new_lead
AFTER INSERT ON leads
FOR EACH ROW EXECUTE PROCEDURE on_new_lead();

-- Trigger for New Support Tickets
CREATE OR REPLACE FUNCTION on_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM notify_admins(
        'Novo Ticket de Suporte',
        'Assunto: ' || NEW.subject,
        'ticket',
        'tickets'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_new_ticket ON support_tickets;
CREATE TRIGGER trigger_new_ticket
AFTER INSERT ON support_tickets
FOR EACH ROW EXECUTE PROCEDURE on_new_ticket();

-- Trigger for Orders Awaiting Approval
CREATE OR REPLACE FUNCTION on_order_awaiting_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.approval_status = 'pending' AND OLD.approval_status != 'pending') OR (NEW.status = 'awaiting_approval' AND OLD.status != 'awaiting_approval') THEN
        PERFORM notify_admins(
            'Pedido Aguardando Aprovação',
            'O pedido "' || NEW.title || '" está pronto para revisão.',
            'approval',
            'design'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_approval ON art_orders;
CREATE TRIGGER trigger_order_approval
AFTER UPDATE ON art_orders
FOR EACH ROW EXECUTE PROCEDURE on_order_awaiting_approval();

-- Ensure RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own notifications" ON notifications;
CREATE POLICY "Users can see their own notifications" ON notifications
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
