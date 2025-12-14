-- ==========================================
-- Logistics & Notification System Schema Update
-- Feature Branch: feature/logistics-system
-- ==========================================

-- 1. Service Providers Table (입점업체/공급자 관리)
-- This table stores information about external service providers (e.g., Cleaning, Fire Safety) and internal distributors.
CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., "CleanMaster Co.", "Seoul Beverage Dist."
    business_type TEXT NOT NULL, -- e.g., 'distributor', 'cleaning', 'safety'
    cs_channel_url TEXT, -- Kakao Talk Channel Link for direct inquiries
    manager_phone TEXT, -- Emergency contact
    manager_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for service_providers
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read service providers (for listing in UI)
CREATE POLICY "Enable read access for all users" ON public.service_providers FOR SELECT USING (true);


-- 2. Update Products Table (Link Products to Providers)
-- If provider_id is NULL, it implies internal/platform product or default.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.service_providers(id);


-- 3. Notifications Table (알림 센터)
-- Stores persistent notifications for the "Bell Icon" feature.
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'order_status', 'care_alert', 'notice', 'promo'
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT, -- Deep link (e.g., '/order/history', '/cart')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can see own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);


-- 4. Update Users Table (Smart Care & FCM)
-- Add columns for "Smart Reorder" and "Push Notifications"
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_token TEXT; -- Firebase Cloud Messaging Token
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reorder_cycle_days INTEGER DEFAULT 7; -- Default reorder cycle
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"push_enabled": true, "marketing": true}'::jsonb;
