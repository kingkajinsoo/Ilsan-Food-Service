-- Migration: Add user_addresses table and update users table for profile management

-- 1. Add fields to users table for tracking business info updates
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS business_number text,
ADD COLUMN IF NOT EXISTS business_name_updated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS business_number_updated boolean DEFAULT false;

-- 2. Create user_addresses table for managing multiple delivery addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  address text NOT NULL,
  detail_address text,
  is_main boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_main ON public.user_addresses(user_id, is_main);

-- 4. Enable RLS (Row Level Security) for user_addresses
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for user_addresses
CREATE POLICY "Users can view their own addresses"
  ON public.user_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
  ON public.user_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
  ON public.user_addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
  ON public.user_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Add fields to users table for terms and privacy agreement tracking
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS terms_agreed_at timestamptz,
ADD COLUMN IF NOT EXISTS privacy_agreed_at timestamptz;

-- 7. Comment for documentation
COMMENT ON TABLE public.user_addresses IS 'Stores multiple delivery addresses for each user with main address designation';
COMMENT ON COLUMN public.user_addresses.is_main IS 'Indicates if this is the main/default delivery address for the user';
COMMENT ON COLUMN public.users.business_name_updated IS 'Tracks if business name has been updated once (only 1 update allowed)';
COMMENT ON COLUMN public.users.business_number_updated IS 'Tracks if business number has been updated once (only 1 update allowed)';
COMMENT ON COLUMN public.users.terms_agreed_at IS 'Timestamp when user agreed to terms of service';
COMMENT ON COLUMN public.users.privacy_agreed_at IS 'Timestamp when user agreed to privacy policy';
