
-- Social Media Scheduler Tables

-- 1. social_accounts: Stores connection info for FB/IG per client
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL, -- The agency/owner ID for multi-tenant
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'facebook', 'instagram'
    platform_account_id TEXT NOT NULL, -- Page ID or IG Business ID
    platform_account_name TEXT,
    access_token TEXT NOT NULL, -- Encrypted token
    refresh_token TEXT,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(client_id, platform_account_id)
);

-- 2. social_posts: The main post content
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    external_link TEXT,
    hashtags TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'published', 'failed'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. post_media: Images and Videos for posts
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL, -- 'image', 'video'
    format TEXT NOT NULL DEFAULT 'feed', -- 'feed', 'stories', 'reels'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. post_schedules: When and where each post should be published
CREATE TABLE IF NOT EXISTS post_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'published', 'failed'
    published_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    api_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. social_post_logs: Audit logs
CREATE TABLE IF NOT EXISTS social_post_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES post_schedules(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for the worker to find pending posts efficiently
CREATE INDEX IF NOT EXISTS idx_post_schedules_pending ON post_schedules(status, scheduled_at) WHERE status = 'scheduled';
