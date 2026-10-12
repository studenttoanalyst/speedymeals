-- Migration: 20261006120000_add_merchant_fields.sql
-- Description: Add business_type column to public.partner_registrations with mandatory grants and RLS verification per AGENTS.md

-- 1. Add columns safely
ALTER TABLE public.partner_registrations 
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS address text;

-- 2. MANDATORY SCHEMA & TABLE PRIVILEGES (per AGENTS.md mandate)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.partner_registrations TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. DEFAULT PRIVILEGES FOR FUTURE OBJECTS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
