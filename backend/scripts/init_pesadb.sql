-- M-Pesa Expense Tracker - Database Initialization Script
-- PesaDB SQL Schema (v2.0.0)
-- Last Updated: 2026-01-16
--
-- IMPORTANT: PesaDB Constraints
-- - No IF NOT EXISTS support
-- - No DEFAULT keyword
-- - No NOT NULL keyword
-- - Use BOOL instead of BOOLEAN
-- - Use STRING instead of VARCHAR/TEXT
-- - Use FLOAT instead of DECIMAL

-- ========================================
-- Table 1: Users
-- ========================================
CREATE TABLE users (
    id STRING PRIMARY KEY,
    email STRING,
    password_hash STRING,
    name STRING,
    created_at STRING,
    preferences STRING
);

-- ========================================
-- Table 2: Categories
-- ========================================
CREATE TABLE categories (
    id STRING PRIMARY KEY,
    user_id STRING,
    name STRING,
    icon STRING,
    color STRING,
    keywords STRING,
    is_default BOOL
);

-- ========================================
-- Table 3: Transactions
-- ========================================
CREATE TABLE transactions (
    id STRING PRIMARY KEY,
    user_id STRING,
    amount FLOAT,
    type STRING,
    category_id STRING,
    description STRING,
    date STRING,
    source STRING,
    mpesa_details STRING,
    sms_metadata STRING,
    created_at STRING,
    transaction_group_id STRING,
    transaction_role STRING,
    parent_transaction_id STRING
);

-- ========================================
-- Table 4: Budgets
-- ========================================
CREATE TABLE budgets (
    id STRING PRIMARY KEY,
    user_id STRING,
    category_id STRING,
    amount FLOAT,
    period STRING,
    month INT,
    year INT,
    created_at STRING
);

-- ========================================
-- Table 5: SMS Import Logs
-- ========================================
CREATE TABLE sms_import_logs (
    id STRING PRIMARY KEY,
    user_id STRING,
    import_session_id STRING,
    total_messages INT,
    successful_imports INT,
    duplicates_found INT,
    parsing_errors INT,
    transactions_created STRING,
    errors STRING,
    created_at STRING
);

-- ========================================
-- Table 6: Duplicate Logs
-- ========================================
CREATE TABLE duplicate_logs (
    id STRING PRIMARY KEY,
    user_id STRING,
    original_transaction_id STRING,
    duplicate_transaction_id STRING,
    message_hash STRING,
    mpesa_transaction_id STRING,
    reason STRING,
    duplicate_reasons STRING,
    duplicate_confidence FLOAT,
    similarity_score FLOAT,
    detected_at STRING,
    action_taken STRING
);

-- ========================================
-- Table 7: Status Checks
-- ========================================
CREATE TABLE status_checks (
    id STRING PRIMARY KEY,
    status STRING,
    timestamp STRING,
    details STRING
);

-- ========================================
-- Seed Data: Default Categories
-- ========================================

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-food', 'system', 'Food & Dining', '🍔', '#FF6B6B', '["food", "restaurant", "dining", "lunch", "dinner", "breakfast", "nyama", "choma"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-transport', 'system', 'Transport', '🚗', '#4ECDC4', '["taxi", "bus", "matatu", "uber", "fuel", "transport", "travel"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-shopping', 'system', 'Shopping', '🛍️', '#95E1D3', '["shop", "store", "mall", "clothing", "electronics", "supermarket"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-bills', 'system', 'Bills & Utilities', '📱', '#F38181', '["bill", "electricity", "water", "internet", "phone", "utility", "kplc", "nairobi water"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-entertainment', 'system', 'Entertainment', '🎬', '#AA96DA', '["movie", "cinema", "game", "entertainment", "music", "showmax", "netflix"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-health', 'system', 'Health & Fitness', '⚕️', '#FCBAD3', '["hospital", "pharmacy", "doctor", "medicine", "gym", "health", "clinic"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-education', 'system', 'Education', '📚', '#A8D8EA', '["school", "books", "tuition", "education", "course", "university"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-airtime', 'system', 'Airtime & Data', '📞', '#FFFFD2', '["airtime", "data", "bundles", "safaricom", "airtel", "telkom"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-transfers', 'system', 'Money Transfer', '💸', '#FEC8D8', '["transfer", "send money", "mpesa", "paybill", "till"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-savings', 'system', 'Savings & Investments', '💰', '#957DAD', '["savings", "investment", "deposit", "savings account", "mshwari", "kcb mpesa"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-income', 'system', 'Income', '💵', '#90EE90', '["salary", "income", "payment", "received"]', TRUE);

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-other', 'system', 'Other', '📌', '#D4A5A5', '[]', TRUE);

-- ========================================
-- End of Initialization Script
-- ========================================
