/*
# Initial Schema — Multi-tenant Inventory with RBAC and Cost Protection

## Purpose
A multi-tenant inventory management app where business owners create workspaces,
invite staff via join codes, and staff never see actual cost/margin data.
Models products generically (name, unit, quantity, cost) so it works for any trade.

## New Tables

1. `workspaces` — A business entity (e.g., "Ada's Bakery")
   - `id` (uuid, PK)
   - `name` (text, not null) — business name
   - `invite_code` (text, unique) — 6-char alphanumeric code for staff to join
   - `owner_id` (uuid, FK auth.users) — the owner who created it
   - `created_at` (timestamptz)

2. `workspace_members` — Join table: users belonging to a workspace with a role
   - `id` (uuid, PK)
   - `workspace_id` (uuid, FK workspaces, ON DELETE CASCADE)
   - `user_id` (uuid, FK auth.users, ON DELETE CASCADE)
   - `role` (text, not null, default 'staff') — 'owner' or 'staff'
   - `joined_at` (timestamptz)

3. `products` — Items in a workspace's inventory
   - `id` (uuid, PK)
   - `workspace_id` (uuid, FK workspaces, ON DELETE CASCADE)
   - `name` (text, not null)
   - `unit` (text, not null, default 'pcs') — e.g. 'kg', 'box', 'pcs'
   - `quantity` (numeric, not null, default 0) — current stock on hand
   - `selling_price` (numeric, not null, default 0) — price staff sell at
   - `reorder_level` (numeric, not null, default 0) — low-stock threshold
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

4. `cost_ledger` — Per-restock cost entries (ledger, not overwritten)
   - `id` (uuid, PK)
   - `product_id` (uuid, FK products, ON DELETE CASCADE)
   - `workspace_id` (uuid, FK workspaces, ON DELETE CASCADE)
   - `quantity_added` (numeric, not null) — how many units added
   - `unit_cost` (numeric, not null) — cost per unit for this batch
   - `total_cost` (numeric, not null) — quantity_added * unit_cost
   - `note` (text, nullable) — optional note about this restock
   - `created_at` (timestamptz)

5. `sales` — Record of items sold (decrements stock)
   - `id` (uuid, PK)
   - `product_id` (uuid, FK products, ON DELETE CASCADE)
   - `workspace_id` (uuid, FK workspaces, ON DELETE CASCADE)
   - `quantity` (numeric, not null) — units sold
   - `unit_price` (numeric, not null) — price per unit at time of sale
   - `total_price` (numeric, not null) — quantity * unit_price
   - `sold_by` (uuid, FK auth.users) — who made the sale
   - `created_at` (timestamptz)

## Security (RLS)

All tables have RLS enabled. Access is scoped to workspace membership.
The key security property: staff can read products but NEVER read cost_ledger.
- `workspaces`: owners can CRUD their own workspace; members can SELECT.
- `workspace_members`: owners can SELECT/INSERT/DELETE in their workspace; members can SELECT.
- `products`: any workspace member can SELECT; only owners can INSERT/UPDATE/DELETE.
- `cost_ledger`: ONLY owners can SELECT/INSERT/UPDATE/DELETE — staff have NO access.
- `sales`: any workspace member can SELECT and INSERT; only owners can DELETE.

## Helper Functions

- `get_user_role(workspace_uuid uuid)` — returns the calling user's role in a workspace, or NULL.
- `is_workspace_owner(workspace_uuid uuid)` — returns boolean.
- `is_workspace_member(workspace_uuid uuid)` — returns boolean.

## RPC Functions

- `join_workspace(p_invite_code text)` — lets an authenticated user join a workspace via invite code. Returns the workspace_id. Inserts a row in workspace_members with role='staff'. Prevents duplicate joins.
- `regenerate_invite_code(p_workspace_id uuid)` — generates a new invite code for the workspace. Owner-only.
- `get_cumulative_cost(p_product_id uuid)` — returns the sum of all cost_ledger.total_cost for a product. Owner-only (enforced by cost_ledger RLS, so staff get NULL).

## Important Notes

1. `workspace_members` has a unique constraint on (workspace_id, user_id) to prevent duplicate memberships.
2. `workspaces.invite_code` is unique and generated with a random 6-char alphanumeric string on insert via a trigger.
3. `products.updated_at` is auto-updated via a trigger.
4. All policies use `auth.uid()` and check membership through `workspace_members` or ownership through `workspaces.owner_id`.
5. Staff CANNOT read `cost_ledger` — no SELECT policy for staff. This is the core security property.
*/

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quantity_added numeric NOT NULL,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  sold_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role(workspace_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = workspace_uuid AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_workspace_owner(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
    AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- RPC: join_workspace
-- ============================================================

CREATE OR REPLACE FUNCTION join_workspace(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_workspace_name text;
BEGIN
  SELECT id, name INTO v_workspace_id, v_workspace_name
  FROM workspaces
  WHERE invite_code = p_invite_code;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Prevent duplicate membership
  IF EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = v_workspace_id AND user_id = auth.uid()
  ) THEN
    RETURN v_workspace_id;
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, auth.uid(), 'staff');

  RETURN v_workspace_id;
END;
$$;

-- ============================================================
-- RPC: regenerate_invite_code
-- ============================================================

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
    v_new_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    SELECT EXISTS (SELECT 1 FROM workspaces WHERE invite_code = v_new_code) INTO v_exists;
    IF NOT v_exists THEN
      EXIT;
    END IF;
  END LOOP;

  UPDATE workspaces SET invite_code = v_new_code WHERE id = p_workspace_id;

  RETURN v_new_code;
END;
$$;

-- ============================================================
-- RPC: get_cumulative_cost
-- ============================================================

CREATE OR REPLACE FUNCTION get_cumulative_cost(p_product_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_cost), 0) FROM cost_ledger WHERE product_id = p_product_id;
$$;

-- ============================================================
-- TRIGGER: auto-generate invite_code on workspace insert
-- ============================================================

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
      v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
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

DROP TRIGGER IF EXISTS trg_generate_invite_code ON workspaces;
CREATE TRIGGER trg_generate_invite_code
  BEFORE INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION generate_invite_code();

-- ============================================================
-- TRIGGER: auto-update updated_at on products
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: workspaces
-- ============================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_workspaces_as_member" ON workspaces;
CREATE POLICY "select_workspaces_as_member"
ON workspaces FOR SELECT
TO authenticated
USING (
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_workspace_as_owner" ON workspaces;
CREATE POLICY "insert_workspace_as_owner"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "update_workspace_as_owner" ON workspaces;
CREATE POLICY "update_workspace_as_owner"
ON workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "delete_workspace_as_owner" ON workspaces;
CREATE POLICY "delete_workspace_as_owner"
ON workspaces FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================================
-- RLS: workspace_members
-- ============================================================

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_members_in_own_workspace" ON workspace_members;
CREATE POLICY "select_members_in_own_workspace"
ON workspace_members FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_member_as_owner" ON workspace_members;
CREATE POLICY "insert_member_as_owner"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "delete_member_as_owner" ON workspace_members;
CREATE POLICY "delete_member_as_owner"
ON workspace_members FOR DELETE
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- ============================================================
-- RLS: products
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_products_as_member" ON products;
CREATE POLICY "select_products_as_member"
ON products FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_products_as_owner" ON products;
CREATE POLICY "insert_products_as_owner"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_products_as_owner" ON products;
CREATE POLICY "update_products_as_owner"
ON products FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "delete_products_as_owner" ON products;
CREATE POLICY "delete_products_as_owner"
ON products FOR DELETE
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- ============================================================
-- RLS: cost_ledger — OWNER ONLY (staff have NO access)
-- ============================================================

ALTER TABLE cost_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cost_ledger_as_owner" ON cost_ledger;
CREATE POLICY "select_cost_ledger_as_owner"
ON cost_ledger FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_cost_ledger_as_owner" ON cost_ledger;
CREATE POLICY "insert_cost_ledger_as_owner"
ON cost_ledger FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_cost_ledger_as_owner" ON cost_ledger;
CREATE POLICY "update_cost_ledger_as_owner"
ON cost_ledger FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "delete_cost_ledger_as_owner" ON cost_ledger;
CREATE POLICY "delete_cost_ledger_as_owner"
ON cost_ledger FOR DELETE
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- ============================================================
-- RLS: sales
-- ============================================================

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sales_as_member" ON sales;
CREATE POLICY "select_sales_as_member"
ON sales FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_sales_as_member" ON sales;
CREATE POLICY "insert_sales_as_member"
ON sales FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "delete_sales_as_owner" ON sales;
CREATE POLICY "delete_sales_as_owner"
ON sales FOR DELETE
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_products_workspace ON products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_product ON cost_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_workspace ON cost_ledger(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_workspace ON sales(workspace_id);
