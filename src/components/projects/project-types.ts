export interface Project {
  id: string;
  user_id: string;
  customer_id: string | null;
  customer_name?: string | null;
  location: string | null;
  quote_price: number | null;
  expenses: number;
  color: string;
  start_date: string | null;
  start_time: string | null;
  duration: string | null;
  closing_price: number | null;
  search_words: string | null;
  created_at: string;
}

export interface ProjectFormData {
  customer_id: string;
  location: string;
  quote_price: number | null;
  expenses: number | null;
  color: string;
  start_date: string;
  start_time: string;
  duration: string;
  closing_price: number | null;
  search_words: string;
}

// Raw row shape from `select("*, customers(name)")`
// PostgREST returns the FK embed as a singular object; supabase-js types may infer an array
export interface ProjectRow {
  customers?: unknown;
  [key: string]: unknown;
}

// Resolve the embedded customer name regardless of object/array shape
export function embeddedName(customers: unknown): string | null {
  if (Array.isArray(customers)) {
    const first = customers[0] as { name?: string | null } | undefined;
    return first?.name || null;
  }
  if (customers && typeof customers === "object") {
    return (customers as { name?: string | null }).name || null;
  }
  return null;
}

// Attach the resolved customer name to a project row
export function normalizeProject(row: ProjectRow): Project {
  return {
    ...(row as unknown as Project),
    customer_name: embeddedName(row.customers),
  };
}
