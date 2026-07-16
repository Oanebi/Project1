export type Role = 'owner' | 'staff';

export interface Workspace {
  id: string;
  name: string;
  invite_code: string | null;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
}

export interface Product {
  id: string;
  workspace_id: string;
  name: string;
  unit: string;
  quantity: number;
  selling_price: number;
  reorder_level: number;
  created_at: string;
  updated_at: string;
}

export interface CostLedgerEntry {
  id: string;
  product_id: string;
  workspace_id: string;
  quantity_added: number;
  unit_cost: number;
  total_cost: number;
  note: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  workspace_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sold_by: string | null;
  created_at: string;
}
