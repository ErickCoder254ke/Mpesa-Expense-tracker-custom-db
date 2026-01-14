-- PesaDB Database Initialization Script
-- This script creates all tables required for the M-Pesa Expense Tracker application

-- Drop existing tables if they exist (for clean re-initialization)
DROP TABLE IF EXISTS duplicate_logs;
DROP TABLE IF EXISTS sms_import_logs;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS status_checks;

-- Users Table
CREATE TABLE users (
    id STRING PRIMARY KEY,
    pin_hash STRING NOT NULL,
    security_question STRING,
    security_answer_hash STRING,
    created_at STRING NOT NULL,
    preferences STRING DEFAULT '{}'
);

-- Categories Table
CREATE TABLE categories (
    id STRING PRIMARY KEY,
    user_id STRING,
    name STRING NOT NULL,
    icon STRING NOT NULL,
    color STRING NOT NULL,
    keywords STRING DEFAULT '[]',
    is_default BOOL DEFAULT TRUE
);

-- Transactions Table
CREATE TABLE transactions (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    amount REAL NOT NULL,
    type STRING NOT NULL CHECK (type IN ('expense', 'income')),
    category_id STRING NOT NULL,
    description STRING NOT NULL,
    date STRING NOT NULL,
    source STRING DEFAULT 'manual' CHECK (source IN ('manual', 'sms', 'api')),
    mpesa_details STRING,
    sms_metadata STRING,
    created_at STRING NOT NULL,
    transaction_group_id STRING,
    transaction_role STRING DEFAULT 'primary',
    parent_transaction_id STRING
);

-- Budgets Table
CREATE TABLE budgets (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    category_id STRING NOT NULL,
    amount REAL NOT NULL,
    period STRING DEFAULT 'monthly' CHECK (period IN ('monthly', 'weekly', 'yearly')),
    month INT NOT NULL,
    year INT NOT NULL,
    created_at STRING NOT NULL
);

-- SMS Import Logs Table
CREATE TABLE sms_import_logs (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    import_session_id STRING NOT NULL,
    total_messages INT DEFAULT 0,
    successful_imports INT DEFAULT 0,
    duplicates_found INT DEFAULT 0,
    parsing_errors INT DEFAULT 0,
    transactions_created STRING DEFAULT '[]',
    errors STRING DEFAULT '[]',
    created_at STRING NOT NULL
);

-- Duplicate Logs Table
CREATE TABLE duplicate_logs (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    original_transaction_id STRING,
    duplicate_transaction_id STRING,
    message_hash STRING,
    mpesa_transaction_id STRING,
    reason STRING,
    similarity_score REAL,
    detected_at STRING NOT NULL
);

-- Status Checks Table (for health monitoring)
CREATE TABLE status_checks (
    id STRING PRIMARY KEY,
    status STRING NOT NULL,
    timestamp STRING NOT NULL,
    details STRING
);

-- Create indexes for better query performance
-- Note: Index syntax may vary based on PesaDB implementation
-- Adjust as needed based on PesaDB's actual index support

-- User lookups are rare (single user app), but index for safety
-- CREATE INDEX idx_users_id ON users(id);

-- Category lookups by user
-- CREATE INDEX idx_categories_user_id ON categories(user_id);
-- CREATE INDEX idx_categories_name ON categories(name);

-- Transaction indexes (most critical for performance)
-- CREATE INDEX idx_transactions_user_id ON transactions(user_id);
-- CREATE INDEX idx_transactions_category_id ON transactions(category_id);
-- CREATE INDEX idx_transactions_date ON transactions(date);
-- CREATE INDEX idx_transactions_type ON transactions(type);
-- CREATE INDEX idx_transactions_created_at ON transactions(created_at);
-- CREATE INDEX idx_transactions_message_hash ON transactions((sms_metadata->>'original_message_hash'));

-- Budget indexes
-- CREATE INDEX idx_budgets_user_id ON budgets(user_id);
-- CREATE INDEX idx_budgets_category_id ON budgets(category_id);
-- CREATE INDEX idx_budgets_month_year ON budgets(month, year);

-- SMS import logs
-- CREATE INDEX idx_sms_import_logs_user_id ON sms_import_logs(user_id);
-- CREATE INDEX idx_sms_import_logs_session_id ON sms_import_logs(import_session_id);

-- Duplicate logs
-- CREATE INDEX idx_duplicate_logs_user_id ON duplicate_logs(user_id);
-- CREATE INDEX idx_duplicate_logs_message_hash ON duplicate_logs(message_hash);
-- CREATE INDEX idx_duplicate_logs_mpesa_transaction_id ON duplicate_logs(mpesa_transaction_id);

-- Insert default categories (same as in the original MongoDB setup)
-- These will be created during setup-pin flow, but we can pre-seed them here

-- Default categories for a demo/initial user
-- Uncomment if you want to pre-populate categories:

-- INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default) VALUES
-- ('cat-food', NULL, 'Food & Dining', '🍔', '#FF6B6B', '["food", "restaurant", "dining", "lunch", "dinner", "breakfast"]', TRUE),
-- ('cat-transport', NULL, 'Transport', '🚗', '#4ECDC4', '["taxi", "bus", "matatu", "uber", "fuel", "transport"]', TRUE),
-- ('cat-shopping', NULL, 'Shopping', '🛍️', '#95E1D3', '["shop", "store", "mall", "clothing", "electronics"]', TRUE),
-- ('cat-bills', NULL, 'Bills & Utilities', '📱', '#F38181', '["bill", "electricity", "water", "internet", "phone", "utility"]', TRUE),
-- ('cat-entertainment', NULL, 'Entertainment', '🎬', '#AA96DA', '["movie", "cinema", "game", "entertainment", "music"]', TRUE),
-- ('cat-health', NULL, 'Health & Fitness', '⚕️', '#FCBAD3', '["hospital", "pharmacy", "doctor", "medicine", "gym", "health"]', TRUE),
-- ('cat-education', NULL, 'Education', '📚', '#A8D8EA', '["school", "books", "tuition", "education", "course"]', TRUE),
-- ('cat-airtime', NULL, 'Airtime & Data', '📞', '#FFFFD2', '["airtime", "data", "bundles", "safaricom", "airtel"]', TRUE),
-- ('cat-transfers', NULL, 'Money Transfer', '💸', '#FEC8D8', '["transfer", "send money", "mpesa", "paybill", "till"]', TRUE),
-- ('cat-savings', NULL, 'Savings & Investments', '💰', '#957DAD', '["savings", "investment", "deposit", "savings account"]', TRUE),
-- ('cat-other', NULL, 'Other', '📌', '#D4A5A5', '[]', TRUE);
