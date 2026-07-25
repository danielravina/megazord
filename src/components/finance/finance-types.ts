export interface Income {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  is_paid: boolean;
  created_at: string;
}

export interface TaxSettings {
  user_id: string;
  vat_rate: number;
  vat_frequency: string;
  vat_billing_day: number;
  income_tax_advance: number;
  income_tax_billing_day: number;
  bituah_leumi: number;
  bituah_leumi_billing_day: number;
  credit_points: number;
}

export interface Saving {
  id: string;
  user_id: string;
  fund_type: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface TaxCalculation {
  vat: number;
  incomeTax: number;
  bituahLeumi: number;
  creditValue: number;
  totalTax: number;
  netIncome: number;
}
