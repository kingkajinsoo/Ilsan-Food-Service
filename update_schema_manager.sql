-- Add payment fields to orders
alter table public.orders
add column if not exists payment_method text default 'credit',
add column if not exists payment_status text default 'unpaid',
add column if not exists paid_at timestamp with time zone;

-- Add delivery_method to apron_requests
alter table public.apron_requests
add column if not exists delivery_method text;

-- Comment for checking
comment on column public.orders.payment_method is 'credit or card';
comment on column public.orders.payment_status is 'unpaid or paid';
comment on column public.apron_requests.delivery_method is 'driver or staff';
