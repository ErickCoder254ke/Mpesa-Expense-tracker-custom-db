-- M-Pesa Expense Tracker Database Schema for PesaDB
-- This script creates all required tables and relationships

-- ==============================================
-- USERS TABLE
-- ==============================================
-- Stores user authentication and preferences
CREATE TABLE IF NOT EXISTS users (
    id STRING PRIMARY KEY,
    pin_hash STRING NOT NULL,
    security_question STRING,
    security_answer_hash STRING,
    created_at STRING NOT NULL,
    preferences STRING DEFAULT '{}'
);

-- ==============================================
-- CATEGORIES TABLE
-- ==============================================
-- Stores transaction categories with icons and keywords for auto-categorization
CREATE TABLE IF NOT EXISTS categories (
    id STRING PRIMARY KEY,
    user_id STRING,
    name STRING NOT NULL,
    icon STRING NOT NULL,
    color STRING NOT NULL,
    keywords STRING DEFAULT '[]',
    is_default BOOL DEFAULT TRUE
);

-- ==============================================
-- TRANSACTIONS TABLE
-- ==============================================
-- Stores all financial transactions (expenses and income)
CREATE TABLE IF NOT EXISTS transactions (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    amount REAL NOT NULL,
    type STRING NOT NULL,
    category_id STRING NOT NULL,
    description STRING NOT NULL,
    date STRING NOT NULL,
    source STRING DEFAULT 'manual',
    mpesa_details STRING,
    sms_metadata STRING,
    created_at STRING NOT NULL,
    transaction_group_id STRING,
    transaction_role STRING DEFAULT 'primary',
    parent_transaction_id STRING
);

-- ==============================================
-- BUDGETS TABLE
-- ==============================================
-- Stores budget limits for categories per month/year
CREATE TABLE IF NOT EXISTS budgets (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    category_id STRING NOT NULL,
    amount REAL NOT NULL,
    period STRING DEFAULT 'monthly',
    month INT NOT NULL,
    year INT NOT NULL,
    created_at STRING NOT NULL
);

-- ==============================================
-- SMS IMPORT LOGS TABLE
-- ==============================================
-- Tracks SMS import sessions and their results
CREATE TABLE IF NOT EXISTS sms_import_logs (
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

-- ==============================================
-- DUPLICATE LOGS TABLE
-- ==============================================
-- Tracks detected duplicate transactions for debugging and audit
CREATE TABLE IF NOT EXISTS duplicate_logs (
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

-- ==============================================
-- STATUS CHECKS TABLE
-- ==============================================
-- Health check and status monitoring
CREATE TABLE IF NOT EXISTS status_checks (
    id STRING PRIMARY KEY,
    status STRING NOT NULL,
    timestamp STRING NOT NULL,
    details STRING
);

-- ==============================================
-- DEFAULT CATEGORIES SEED DATA
-- ==============================================
-- Insert default categories (will be skipped if already exist)
-- Note: These INSERT statements will be handled by the seeding function
-- to avoid duplicate key errors
