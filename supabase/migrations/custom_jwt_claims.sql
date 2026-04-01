-- =====================================================
-- Supabase Custom Access Token Hook
-- This function injects the user's `role` from the
-- public.users table into the JWT claims so middleware
-- can check roles without a DB call.
-- =====================================================

-- 1. Create the function (SECURITY DEFINER required for auth admin to read public.users)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Get the user's role from the users table
  SELECT role INTO user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  -- Default to 'patient' if no row found
  IF user_role IS NULL THEN
    user_role := 'patient';
  END IF;

  -- Extract existing claims
  claims := event->'claims';

  -- Inject our custom claim
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));

  -- Update the event with modified claims
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- 2. Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- 3. Grant SELECT on users table to auth admin (required for the hook to query roles)
GRANT SELECT ON TABLE public.users TO supabase_auth_admin;

-- 4. Revoke from others for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =====================================================
-- After running this SQL in the Supabase SQL Editor:
-- 1. Go to Auth → Hooks in Supabase Dashboard
-- 2. Enable "Customize Access Token" hook
-- 3. Select "custom_access_token_hook" function
-- =====================================================
