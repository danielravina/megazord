export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  vat_number: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  vat_number: string;
  address: string;
  notes: string;
}
