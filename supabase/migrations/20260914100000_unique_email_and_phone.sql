-- Migration: 20260914100000_unique_email_and_phone.sql
-- Description: Enforce unique email and phone numbers for partner_registrations with anti-bot security

-- 1. Deduplicate any existing rows if duplicates exist (retain newest entry)
DELETE FROM public.partner_registrations a
USING public.partner_registrations b
WHERE a.id < b.id 
  AND lower(trim(a.email)) = lower(trim(b.email));

DELETE FROM public.partner_registrations a
USING public.partner_registrations b
WHERE a.id < b.id 
  AND a.country_code = b.country_code
  AND regexp_replace(a.phone, '\s+', '', 'g') = regexp_replace(b.phone, '\s+', '', 'g');

-- 2. Create Unique Index on lower-cased email address
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_registrations_email 
ON public.partner_registrations (lower(trim(email)));

-- 3. Create Unique Index on normalized phone numbers per country code
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_registrations_phone 
ON public.partner_registrations (country_code, (regexp_replace(phone, '\s+', '', 'g')));

-- -------------------------------------------------------------------------------------------------
-- 4. MANDATORY PERMISSIONS & GRANTS (AGENTS.md Mandate)
-- -------------------------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.partner_registrations TO anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
