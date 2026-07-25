export interface Project {
  id: string;
  user_id: string;
  customer_name: string;
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
  customer_name: string;
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
