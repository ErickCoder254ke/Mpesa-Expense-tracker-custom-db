/**
 * Centralized transaction types for the M-Pesa Expense Tracker
 * Used across all frontend components to ensure consistency
 */

export interface MPesaDetails {
  recipient?: string;
  reference?: string;
  transaction_id?: string;
  phone_number?: string;
  balance_after?: number;
  message_type?: string;
  transaction_fee?: number;
  access_fee?: number;
  fuliza_limit?: number;
  fuliza_outstanding?: number;
  due_date?: string;
}

export interface SMSMetadata {
  original_message_hash?: string;
  parsing_confidence?: number;
  parsed_at?: string;
  requires_review?: boolean;
  suggested_category?: string;
  total_fees?: number;
  fee_breakdown?: Record<string, number>;
}

export interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  type: 'expense' | 'income';
  category_id: string;
  description: string;
  date: string;
  created_at: string;
  source?: 'manual' | 'sms' | 'api';
  mpesa_details?: MPesaDetails;
  sms_metadata?: SMSMetadata;
  // Transaction grouping for multi-transaction SMS messages
  transaction_group_id?: string;
  transaction_role?: 'primary' | 'fee' | 'fuliza_deduction' | 'access_fee';
  parent_transaction_id?: string;
}

export interface TransactionCreate {
  amount: number;
  type: 'expense' | 'income';
  category_id: string;
  description: string;
  date: string;
  source?: 'manual' | 'sms' | 'api';
  mpesa_details?: MPesaDetails;
  sms_metadata?: SMSMetadata;
  // Transaction grouping for multi-transaction SMS messages
  transaction_group_id?: string;
  transaction_role?: 'primary' | 'fee' | 'fuliza_deduction' | 'access_fee';
  parent_transaction_id?: string;
}

export interface TransactionUpdate {
  amount?: number;
  type?: 'expense' | 'income';
  category_id?: string;
  description?: string;
  date?: string;
  mpesa_details?: MPesaDetails;
  sms_metadata?: SMSMetadata;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  user_id?: string;
}

export interface ParsedSMSData {
  amount: number;
  type: 'expense' | 'income';
  description: string;
  suggested_category: string;
  transaction_date?: string; // ISO date string extracted from SMS when available
  mpesa_details: MPesaDetails;
  parsing_confidence: number;
  original_message_hash: string;
  requires_review: boolean;
}

export interface ParsedMessage {
  original_message: string;
  parsed_data: ParsedSMSData;
  confidence: number;
  suggested_category: string;
  requires_review: boolean;
}

export interface ImportResult {
  successful_imports: number;
  duplicates_found: number;
  parsing_errors: number;
  total_processed: number;
  import_session_id: string;
}

export interface SMSImportResult {
  total_messages: number;
  successful_imports: number;
  duplicates_found: number;
  parsing_errors: number;
  transactions_created: string[];
  errors: string[];
}

export interface DashboardData {
  period: {
    start_date: string;
    end_date: string;
  };
  totals: {
    income: number;
    expenses: number;
    balance: number;
    fees: {
      total_fees: number;
      transaction_fees: number;
      access_fees: number;
      fee_transactions_count: number;
    };
  };
  categories: Record<string, Category & { amount: number; count: number }>;
  recent_transactions: Transaction[];
}

export interface FeeBreakdown {
  totalFees: number;
  breakdown: Record<string, number>;
}

export interface FulizaDetails {
  isLoan: boolean;
  isRepayment: boolean;
  outstanding?: number;
  limit?: number;
  dueDate?: string;
}
