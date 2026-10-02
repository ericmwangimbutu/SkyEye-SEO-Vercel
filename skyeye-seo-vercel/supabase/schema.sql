-- Run once in your own Supabase project's SQL Editor.
-- This creates a new dashboard table. It does not import existing Sites data.
CREATE TABLE public.skyeye_workspaces (
  month text PRIMARY KEY CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  content jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.skyeye_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.skyeye_workspaces FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.skyeye_workspaces TO service_role;
-- No anonymous/client access policy. Only the server's service role can access rows.
