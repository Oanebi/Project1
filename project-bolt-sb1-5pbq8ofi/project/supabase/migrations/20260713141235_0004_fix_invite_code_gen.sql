/*
# Fix: Replace gen_random_bytes with pgcrypto-free invite code generation

pgcrypto is not installed in this project. The original trigger and RPC used
`gen_random_bytes()` which requires pgcrypto. This migration replaces those
with a pure PL/pgSQL approach using `gen_random_uuid()` (built-in) to derive
random alphanumeric characters.
*/

-- Helper: generate a random 6-char uppercase alphanumeric code
CREATE OR REPLACE FUNCTION generate_random_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
  r int;
BEGIN
  FOR i IN 1..6 LOOP
    r := abs(hashtext(gen_random_uuid()::text)) % length(chars) + 1;
    result := result || substr(chars, r, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Replace the trigger function
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  IF NEW.invite_code IS NULL THEN
    LOOP
      v_code := generate_random_code();
      SELECT EXISTS (SELECT 1 FROM workspaces WHERE invite_code = v_code) INTO v_exists;
      IF NOT v_exists THEN
        EXIT;
      END IF;
    END LOOP;
    NEW.invite_code := v_code;
  END IF;
  RETURN NEW;
END;
$$;

-- Replace the regenerate function
CREATE OR REPLACE FUNCTION regenerate_invite_code(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_code text;
  v_exists boolean;
BEGIN
  IF NOT is_workspace_owner(p_workspace_id) THEN
    RAISE EXCEPTION 'Only the workspace owner can regenerate the invite code';
  END IF;

  LOOP
    v_new_code := generate_random_code();
    SELECT EXISTS (SELECT 1 FROM workspaces WHERE invite_code = v_new_code) INTO v_exists;
    IF NOT v_exists THEN
      EXIT;
    END IF;
  END LOOP;

  UPDATE workspaces SET invite_code = v_new_code WHERE id = p_workspace_id;

  RETURN v_new_code;
END;
$$;
