export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  vat_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  vat_number: string;
  address: string;
  notes: string;
}
