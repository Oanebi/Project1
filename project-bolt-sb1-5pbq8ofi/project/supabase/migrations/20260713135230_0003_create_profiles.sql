/*
# Create profiles table for member email lookup

The staff screen needs to display member emails, but `auth.users` is not
readable by the anon-key client. This creates a `profiles` table that mirrors
user emails, populated by a trigger on auth.users insert/update.

## New Tables
- `profiles`
  - `id` (uuid, PK, references auth.users)
  - `email` (text)
  - `created_at` (timestamptz)

## Security
- RLS enabled. Users can read their own profile. Also, workspace members
  can read profiles of other members in the same workspace (needed for
  the staff list).
- A trigger populates profiles whenever a new auth user is created.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_profile" ON profiles;
CREATE POLICY "read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "read_profiles_of_workspace_members" ON profiles;
CREATE POLICY "read_profiles_of_workspace_members"
ON profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT user_id FROM workspace_members
    WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  )
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
