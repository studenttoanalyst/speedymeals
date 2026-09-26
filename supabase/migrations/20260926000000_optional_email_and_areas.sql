-- Migration: 20260926000000_optional_email_and_areas.sql
-- Description: Make email optional in partner_registrations, add area and address columns

-- 1. Make email and city columns nullable
ALTER TABLE public.partner_registrations ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.partner_registrations ALTER COLUMN city DROP NOT NULL;

-- 2. Add area (compulsory on application layer) and address (optional) columns
ALTER TABLE public.partner_registrations ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE public.partner_registrations ADD COLUMN IF NOT EXISTS address text;

-- 3. Replace unique email index with partial index that ignores NULL and empty strings
DROP INDEX IF EXISTS public.uq_partner_registrations_email;
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_registrations_email 
ON public.partner_registrations (lower(trim(email))) 
WHERE email IS NOT NULL AND trim(email) != '';

-- 4. Add index on city and area for filtering/dispatch zones
CREATE INDEX IF NOT EXISTS idx_partner_registrations_city_area ON public.partner_registrations (city, area);

-- -------------------------------------------------------------------------------------------------
-- 5. MANDATORY PERMISSIONS & GRANTS (AGENTS.md Mandate)
-- -------------------------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.partner_registrations TO anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
