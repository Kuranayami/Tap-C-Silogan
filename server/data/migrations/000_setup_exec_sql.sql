-- Run this ONCE in Supabase SQL Editor to enable auto-migrations.
-- After this, future server deploys will auto-apply migration SQL.
CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query_text;
END;
$$;
