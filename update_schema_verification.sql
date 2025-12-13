-- Add verification_status to users table (via auth.users metadata or public.users table if exists)
-- Assuming we are using a public 'users' table mirrored from auth or just linking to it.
-- Based on previous context, there is a 'users' table.

alter table public.users
add column if not exists verification_status text default 'unverified'; 
-- Values: 'unverified', 'verified_existing', 'verified_new', 'blocked'

-- Add comment for clarity
comment on column public.users.verification_status is 'Status: unverified, verified_existing, verified_new, blocked';
