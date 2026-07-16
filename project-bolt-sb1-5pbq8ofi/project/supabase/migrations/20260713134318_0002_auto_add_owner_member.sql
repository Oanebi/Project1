/*
# Auto-add owner to workspace_members on workspace creation

When a workspace is created, the owner must also be added to workspace_members
with role='owner'. This trigger handles that automatically so the frontend
only needs to insert into workspaces, not both tables.

## Changes
- New trigger function `add_owner_as_member()` that inserts into workspace_members.
- Trigger `trg_add_owner_as_member` fires AFTER INSERT on workspaces.
*/

CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_owner_as_member ON workspaces;
CREATE TRIGGER trg_add_owner_as_member
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();
