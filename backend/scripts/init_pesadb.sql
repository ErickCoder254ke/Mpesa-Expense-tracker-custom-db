-- M-Pesa Expense Tracker - Database Initialization Script
-- PesaDB SQL Schema (v2.1.0)
-- Last Updated: 2026-01-16
--
-- IMPORTANT: PesaDB Constraints
-- - No IF NOT EXISTS support
-- - No DEFAULT keyword
-- - No NOT NULL keyword
-- - Use BOOL instead of BOOLEAN
-- - Use STRING instead of VARCHAR/TEXT
-- - Use FLOAT instead of DECIMAL
-- - FOREIGN KEY constraints are supported using REFERENCES

-- ========================================
-- Table 1: Users
-- ========================================
-- Base table with no dependencies
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
-- References: users (optional for user-created categories)
CREATE TABLE categories (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    name STRING,
    icon STRING,
    color STRING,
    keywords STRING,
    is_default BOOL
);

-- ========================================
-- Table 3: Transactions
-- ========================================
-- References: users, categories
-- Note: parent_transaction_id does NOT have FK constraint (PesaDB limitation with self-referential FKs)
CREATE TABLE transactions (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    amount FLOAT,
    type STRING,
    category_id STRING REFERENCES categories(id),
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
-- References: users, categories
CREATE TABLE budgets (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    category_id STRING REFERENCES categories(id),
    amount FLOAT,
    period STRING,
    month INT,
    year INT,
    created_at STRING
);

-- ========================================
-- Table 5: SMS Import Logs
-- ========================================
-- References: users
CREATE TABLE sms_import_logs (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
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
-- References: users, transactions
CREATE TABLE duplicate_logs (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    original_transaction_id STRING REFERENCES transactions(id),
    duplicate_transaction_id STRING REFERENCES transactions(id),
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
-- No foreign key dependencies
CREATE TABLE status_checks (
    id STRING PRIMARY KEY,
    status STRING,
    timestamp STRING,
    details STRING
);

-- ========================================
-- Seed Data: System User
-- ========================================
-- Create a 'system' user for default categories
-- This user is required for foreign key constraints on system categories

INSERT INTO users (id, email, password_hash, name, created_at, preferences)
VALUES ('system', 'system@internal', 'SYSTEM_ACCOUNT_NO_LOGIN', 'System Account', '2026-01-16T00:00:00Z', '{"is_system": true}');

-- ========================================
-- Seed Data: Default Categories
-- ========================================
-- System categories with user_id = 'system'
-- These should be inserted AFTER the system user exists

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
-- Database Relationships Summary
-- ========================================
-- 
-- USERS (Base table, no dependencies)
--   ↑
--   ├── CATEGORIES.user_id (optional - 'system' for default categories)
--   ├── TRANSACTIONS.user_id
--   ├── BUDGETS.user_id
--   ├── SMS_IMPORT_LOGS.user_id
--   └── DUPLICATE_LOGS.user_id
--
-- CATEGORIES
--   ↑
--   ├── TRANSACTIONS.category_id
--   └── BUDGETS.category_id
--
-- TRANSACTIONS
--   ↑
--   ├── TRANSACTIONS.parent_transaction_id (NO FK CONSTRAINT - app-level integrity)
--   ├── DUPLICATE_LOGS.original_transaction_id
--   └── DUPLICATE_LOGS.duplicate_transaction_id
--
-- Note: PesaDB does not support self-referential foreign keys, so
-- parent_transaction_id is a plain STRING field. The application
-- maintains referential integrity at the code level.
--
-- Referential Integrity Notes:
-- 1. Deleting a user should cascade delete their transactions, budgets, logs
-- 2. Deleting a category should prevent deletion if transactions exist (or reassign to 'cat-other')
-- 3. Parent transactions should be deleted before child fee transactions
-- 4. System categories (user_id='system') should not be deletable
--
-- ========================================
-- End of Initialization Script
-- ========================================
