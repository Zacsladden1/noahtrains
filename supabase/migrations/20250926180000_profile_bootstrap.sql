-- Automatically provision per-user rows when a profile is created

-- Function runs as table owner to bypass RLS
CREATE OR REPLACE FUNCTION public.bootstrap_profile_rows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach uuid;
BEGIN
  -- Create default nutrition targets if missing
  INSERT INTO nutrition_targets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- If the new profile is a client, create a clients row and auto-assign the sole coach if present
  IF COALESCE(NEW.role, 'client') = 'client' THEN
    SELECT p.id INTO v_coach FROM profiles p WHERE p.role = 'coach' ORDER BY p.created_at ASC LIMIT 1;

    INSERT INTO clients (client_id, coach_id, status, start_date)
    VALUES (NEW.id, v_coach, 'active', CURRENT_DATE)
    ON CONFLICT (client_id, coach_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger fires after profile insert
DROP TRIGGER IF EXISTS trg_bootstrap_profile_rows ON profiles;
CREATE TRIGGER trg_bootstrap_profile_rows
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.bootstrap_profile_rows();


