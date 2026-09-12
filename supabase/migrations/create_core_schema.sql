-- Migration: 20260912000001_create_core_schema.sql
-- Description: Core schema matching docs/Schema_Updated.png (14 tables with exact columns, constraints, and relationships)

-- Enable UUID extension if not already enabled
create extension if not exists "pgcrypto";

-- 1. admins
create table if not exists public.admins (
    id uuid default gen_random_uuid() primary key,
    email varchar not null unique,
    password_hash varchar not null,
    role varchar not null,
    is_active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. refresh_tokens
create table if not exists public.refresh_tokens (
    id uuid default gen_random_uuid() primary key,
    subject_id uuid not null,
    role varchar not null,
    token_hash varchar not null,
    status varchar not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. users (customers)
create table if not exists public.users (
    id uuid default gen_random_uuid() primary key,
    phone_number varchar not null unique,
    name varchar not null,
    email varchar,
    wallet_balance numeric(12, 2) not null default 0.00,
    country_code varchar not null default '+92',
    is_active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. addresses
create table if not exists public.addresses (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references public.users(id) on delete cascade,
    label varchar,
    latitude numeric(10, 7) not null,
    longitude numeric(10, 7) not null,
    full_address text,
    is_default boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. restaurants (partners)
create table if not exists public.restaurants (
    id uuid default gen_random_uuid() primary key,
    name varchar not null,
    email varchar not null unique,
    password_hash varchar not null,
    phone_number varchar not null unique,
    address text,
    latitude numeric(10, 7),
    longitude numeric(10, 7),
    commission_rate numeric(5, 4) not null default 0.1000,
    logo_url varchar,
    cover_photo_url varchar,
    status varchar not null default 'pending',
    opening_time time,
    closing_time time,
    country_code varchar not null default '+92',
    currency varchar not null default 'PKR',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. menu_items
create table if not exists public.menu_items (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid not null references public.restaurants(id) on delete cascade,
    name varchar not null,
    description text,
    price numeric(10, 2) not null,
    category varchar,
    photo_url varchar,
    variants jsonb,
    is_available boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. riders
create table if not exists public.riders (
    id uuid default gen_random_uuid() primary key,
    phone_number varchar not null unique,
    name varchar not null,
    cnic_number varchar not null unique,
    vehicle_type varchar,
    vehicle_registration varchar,
    cnic_photo_url varchar,
    license_photo_url varchar,
    vehicle_photo_url varchar,
    approval_status varchar not null default 'pending',
    wallet_balance numeric(12, 2) not null default 0.00,
    pending_cash_owed numeric(12, 2) not null default 0.00,
    is_online boolean not null default false,
    current_latitude numeric(10, 7),
    current_longitude numeric(10, 7),
    country_code varchar not null default '+92',
    is_active boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. cash_deposits
create table if not exists public.cash_deposits (
    id uuid default gen_random_uuid() primary key,
    rider_id uuid not null references public.riders(id) on delete cascade,
    amount_submitted numeric(12, 2) not null,
    expected_amount numeric(12, 2) not null,
    discrepancy numeric(12, 2) not null default 0.00,
    submission_method varchar,
    verified_by_admin boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. settlements
create table if not exists public.settlements (
    id uuid default gen_random_uuid() primary key,
    restaurant_id uuid not null references public.restaurants(id) on delete cascade,
    period_start date not null,
    period_end date not null,
    total_sales numeric(12, 2) not null,
    commission_deducted numeric(12, 2) not null,
    net_payable numeric(12, 2) not null,
    status varchar not null default 'pending',
    paid_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. rider_payouts
create table if not exists public.rider_payouts (
    id uuid default gen_random_uuid() primary key,
    rider_id uuid not null references public.riders(id) on delete cascade,
    period_start date not null,
    period_end date not null,
    total_earning numeric(12, 2) not null,
    status varchar not null default 'pending',
    paid_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. orders
create table if not exists public.orders (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references public.users(id),
    restaurant_id uuid not null references public.restaurants(id),
    rider_id uuid references public.riders(id),
    delivery_address_id uuid not null references public.addresses(id),
    status varchar not null default 'placed',
    payment_method varchar not null,
    food_subtotal numeric(12, 2) not null,
    delivery_distance_km numeric(8, 2) not null,
    delivery_fee numeric(10, 2) not null,
    total_amount numeric(12, 2) not null,
    commission_amount numeric(10, 2) not null,
    restaurant_payable numeric(12, 2) not null,
    rider_earning numeric(10, 2) not null,
    special_instructions text,
    country_code varchar not null default '+92',
    currency varchar not null default 'PKR',
    cancellation_reason varchar,
    cancelled_by varchar,
    placed_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. order_items
create table if not exists public.order_items (
    id uuid default gen_random_uuid() primary key,
    order_id uuid not null references public.orders(id) on delete cascade,
    menu_item_id uuid not null references public.menu_items(id),
    quantity integer not null default 1,
    selected_variant varchar,
    price_at_order numeric(10, 2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. ratings
create table if not exists public.ratings (
    id uuid default gen_random_uuid() primary key,
    order_id uuid not null references public.orders(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    restaurant_rating integer,
    rider_rating integer,
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. wallet_transactions
create table if not exists public.wallet_transactions (
    id uuid default gen_random_uuid() primary key,
    rider_id uuid not null references public.riders(id) on delete cascade,
    order_id uuid references public.orders(id) on delete set null,
    type varchar not null,
    amount numeric(12, 2) not null,
    balance_after numeric(12, 2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index if not exists idx_users_phone on public.users (phone_number);
create index if not exists idx_restaurants_phone on public.restaurants (phone_number);
create index if not exists idx_riders_phone on public.riders (phone_number);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_restaurant on public.orders (restaurant_id);
create index if not exists idx_orders_rider on public.orders (rider_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_menu_items_restaurant on public.menu_items (restaurant_id);
