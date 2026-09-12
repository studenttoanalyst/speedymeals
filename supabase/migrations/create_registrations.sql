-- Migration: 20260912000000_create_registrations.sql
-- Description: Create partner_registrations table for SpeedyMeals landing page (Rider, Restaurant, and Customer Waitlist)

create table if not exists public.partner_registrations (
    id uuid default gen_random_uuid() primary key,
    reference_code text unique not null,
    persona_type text not null check (persona_type in ('rider', 'restaurant', 'customer')),
    full_name text not null,
    email text not null,
    phone text not null,
    country_code text not null default '+92',
    city text not null,

    -- Persona-specific fields
    vehicle_type text,                     -- Rider: Motorcycle, Electric Scooter, Bicycle, Sedan Car
    business_name text,                    -- Restaurant: Brand Name
    cuisine_type text,                     -- Restaurant: Cuisine Category
    device_platform text,                  -- Customer: iOS, Android, Both
    service_interest text,                 -- Customer: Zero-Markup, Courier, Essentials, All

    agreed boolean default true,
    status text default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for searching / filtering
create index if not exists idx_partner_registrations_persona on public.partner_registrations (persona_type);
create index if not exists idx_partner_registrations_email on public.partner_registrations (email);
create index if not exists idx_partner_registrations_created_at on public.partner_registrations (created_at desc);

-- -------------------------------------------------------------------------------------------------
-- 1. MANDATORY PERMISSIONS & GRANTS (Fixes "permission denied for table partner_registrations")
-- -------------------------------------------------------------------------------------------------
-- Ensure anon and authenticated roles have access to the public schema
grant usage on schema public to anon, authenticated, service_role;

-- Grant table privileges so anon/authenticated can perform INSERT and SELECT (needed for .insert().select())
grant all on table public.partner_registrations to anon, authenticated, service_role;

-- Grant sequence privileges if any identity / serial columns are used
grant all on all sequences in schema public to anon, authenticated, service_role;

-- -------------------------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------------------------
alter table public.partner_registrations enable row level security;

-- Policy 1: Allow public anonymous and authenticated users to submit registrations
drop policy if exists "Allow public submissions" on public.partner_registrations;
drop policy if exists "Allow public registration insert" on public.partner_registrations;
create policy "Allow public registration insert" 
on public.partner_registrations 
for insert 
to anon, authenticated 
with check (true);

-- Policy 2: Allow anonymous and authenticated users to read (needed for .select('reference_code') after insert)
drop policy if exists "Allow public registration select" on public.partner_registrations;
create policy "Allow public registration select" 
on public.partner_registrations 
for select 
to anon, authenticated 
using (true);

-- Policy 3: Allow service_role complete access (backend server tasks, admin syncs, webhooks)
drop policy if exists "Allow service_role full access" on public.partner_registrations;
create policy "Allow service_role full access" 
on public.partner_registrations 
for all 
to service_role 
using (true) 
with check (true);
