-- Migration: 20261003000000_fix_security_and_rls.sql
-- Description: Revoke unrestricted anon permissions and secure tables with proper RLS

-- 1. Revoke public table grants from anon role across public schema
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Ensure default privileges do not grant new tables to anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;

-- 2. Explicitly grant service_role and authenticated full permissions for backend operations
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 3. For partner_registrations: allow anon INSERT, but NEVER public SELECT
ALTER TABLE public.partner_registrations ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON TABLE public.partner_registrations TO anon;

DROP POLICY IF EXISTS "Allow public registration select" ON public.partner_registrations;
DROP POLICY IF EXISTS "Allow public registration insert" ON public.partner_registrations;
DROP POLICY IF EXISTS "Allow service_role full access" ON public.partner_registrations;

-- Allow anonymous form submissions
CREATE POLICY "Allow public registration insert"
ON public.partner_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow full management by service_role (Next.js server-side backend / admin)
CREATE POLICY "Allow service_role full access"
ON public.partner_registrations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
