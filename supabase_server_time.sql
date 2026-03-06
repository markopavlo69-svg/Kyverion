-- Run this once in the Supabase dashboard → SQL Editor
-- Provides a server-side timestamp so all devices agree on "now",
-- eliminating clock skew between dual-boot or multi-device setups.

CREATE OR REPLACE FUNCTION get_server_time()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;
$$;
