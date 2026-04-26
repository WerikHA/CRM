-- Chat Migration
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_type TEXT NOT NULL, -- 'team', 'task', 'feedback'
    reference_id UUID, -- order_id, task_id, etc.
    sender_id UUID REFERENCES public.users(id),
    sender_name TEXT,
    content TEXT,
    audio_url TEXT, -- Base64 or URL
    owner_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.chat_messages;
CREATE POLICY "Allow All" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema
NOTIFY pgrst, 'reload schema';
