-- ============================================================================
-- M-Pesa Expense Tracker - PostgreSQL Database Schema
-- ============================================================================
-- Version: 2.0.0
-- Database: PostgreSQL 14+
-- Description: Complete schema with tables, relationships, indexes, and seed data
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: USERS
-- ============================================================================
-- Stores user accounts with email/password authentication

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    preferences JSONB DEFAULT '{
        "theme": "light",
        "currency": "KES",
        "notifications": true,
        "language": "en"
    }'::jsonb,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT password_hash_length CHECK (LENGTH(password_hash) >= 60)
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Comments
COMMENT ON TABLE users IS 'User accounts with email/password authentication';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (stored in lowercase, unique)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (cost factor: 12)';
COMMENT ON COLUMN users.preferences IS 'User preferences (theme, currency, notifications, etc.)';

-- ============================================================================
-- TABLE: CATEGORIES
-- ============================================================================
-- Expense and income categories with auto-categorization keywords

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT color_format CHECK (color ~* '^#[0-9A-Fa-f]{6}$')
);

-- Indexes for categories table
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_default ON categories(is_default);
CREATE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name);

-- Comments
COMMENT ON TABLE categories IS 'Expense and income categories with auto-categorization keywords';
COMMENT ON COLUMN categories.user_id IS 'NULL for default system categories, user-specific otherwise';
COMMENT ON COLUMN categories.keywords IS 'JSON array of keywords for auto-categorization';
COMMENT ON COLUMN categories.is_default IS 'TRUE for system-provided categories';

-- ============================================================================
-- TABLE: TRANSACTIONS
-- ============================================================================
-- All financial transactions (manual entries and SMS imports)

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    mpesa_details JSONB,
    sms_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transaction_group_id UUID,
    transaction_role VARCHAR(20) NOT NULL DEFAULT 'primary',
    parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    CONSTRAINT amount_positive CHECK (amount >= 0),
    CONSTRAINT type_valid CHECK (type IN ('expense', 'income')),
    CONSTRAINT source_valid CHECK (source IN ('manual', 'sms', 'api')),
    CONSTRAINT role_valid CHECK (transaction_role IN ('primary', 'fee', 'fuliza_deduction', 'access_fee'))
);

-- Indexes for transactions table (critical for performance)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date_desc ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date ON transactions(user_id, category_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_group_id ON transactions(transaction_group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions(parent_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_description_fts ON transactions USING gin(to_tsvector('english', description));

-- Comments
COMMENT ON TABLE transactions IS 'Financial transactions (manual and SMS-imported)';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount (always positive, type determines direction)';
COMMENT ON COLUMN transactions.type IS 'Transaction type: expense or income';
COMMENT ON COLUMN transactions.source IS 'How transaction was created: manual, sms, or api';
COMMENT ON COLUMN transactions.mpesa_details IS 'M-Pesa specific details (recipient, transaction_id, fees, etc.)';
COMMENT ON COLUMN transactions.sms_metadata IS 'SMS parsing metadata (hash, confidence, parsing timestamp)';
COMMENT ON COLUMN transactions.transaction_group_id IS 'Groups related transactions from same SMS';
COMMENT ON COLUMN transactions.transaction_role IS 'Transaction role: primary, fee, fuliza_deduction, or access_fee';
COMMENT ON COLUMN transactions.parent_transaction_id IS 'Links fees/deductions to main transaction';

-- ============================================================================
-- TABLE: BUDGETS
-- ============================================================================
-- Monthly budget allocations per category

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'monthly',
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT amount_positive CHECK (amount > 0),
    CONSTRAINT period_valid CHECK (period IN ('monthly', 'weekly', 'yearly')),
    CONSTRAINT month_valid CHECK (month BETWEEN 1 AND 12),
    CONSTRAINT year_valid CHECK (year >= 2020),
    CONSTRAINT unique_budget_period UNIQUE (user_id, category_id, year, month)
);

-- Indexes for budgets table
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, year, month);

-- Comments
COMMENT ON TABLE budgets IS 'Monthly budget allocations per category';
COMMENT ON COLUMN budgets.period IS 'Budget period: monthly, weekly, or yearly';
COMMENT ON COLUMN budgets.month IS 'Month (1-12)';
COMMENT ON COLUMN budgets.year IS 'Year (e.g., 2025)';

-- ============================================================================
-- TABLE: SMS_IMPORT_LOGS
-- ============================================================================
-- Track SMS import sessions with statistics

CREATE TABLE IF NOT EXISTS sms_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    import_session_id UUID NOT NULL UNIQUE,
    total_messages INTEGER NOT NULL,
    successful_imports INTEGER NOT NULL,
    duplicates_found INTEGER NOT NULL,
    parsing_errors INTEGER NOT NULL,
    transactions_created JSONB NOT NULL DEFAULT '[]'::jsonb,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stats_non_negative CHECK (
        total_messages >= 0 AND
        successful_imports >= 0 AND
        duplicates_found >= 0 AND
        parsing_errors >= 0
    )
);

-- Indexes for sms_import_logs table
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_session_id ON sms_import_logs(import_session_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_import_logs(created_at DESC);

-- Comments
COMMENT ON TABLE sms_import_logs IS 'SMS import session tracking with statistics';
COMMENT ON COLUMN sms_import_logs.import_session_id IS 'Unique session identifier for this import';
COMMENT ON COLUMN sms_import_logs.transactions_created IS 'Array of created transaction UUIDs';
COMMENT ON COLUMN sms_import_logs.errors IS 'Array of error messages from failed parses';

-- ============================================================================
-- TABLE: DUPLICATE_LOGS
-- ============================================================================
-- Track detected duplicate transactions for audit purposes

CREATE TABLE IF NOT EXISTS duplicate_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    duplicate_transaction_id UUID NOT NULL,
    message_hash VARCHAR(64),
    mpesa_transaction_id VARCHAR(50),
    reason TEXT NOT NULL,
    duplicate_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    duplicate_confidence DECIMAL(3,2) NOT NULL,
    similarity_score DECIMAL(3,2) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_taken VARCHAR(20) NOT NULL,
    CONSTRAINT action_valid CHECK (action_taken IN ('rejected', 'merged', 'flagged')),
    CONSTRAINT confidence_range CHECK (duplicate_confidence BETWEEN 0.0 AND 1.0),
    CONSTRAINT similarity_range CHECK (similarity_score BETWEEN 0.0 AND 1.0)
);

-- Indexes for duplicate_logs table
CREATE INDEX IF NOT EXISTS idx_duplicate_logs_user_id ON duplicate_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_logs_original_tx ON duplicate_logs(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_logs_message_hash ON duplicate_logs(message_hash);
CREATE INDEX IF NOT EXISTS idx_duplicate_logs_mpesa_id ON duplicate_logs(mpesa_transaction_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_logs_detected_at ON duplicate_logs(detected_at DESC);

-- Comments
COMMENT ON TABLE duplicate_logs IS 'Duplicate transaction detection audit log';
COMMENT ON COLUMN duplicate_logs.message_hash IS 'SHA256 hash of original SMS message';
COMMENT ON COLUMN duplicate_logs.duplicate_reasons IS 'Array of matching criteria that triggered duplicate detection';
COMMENT ON COLUMN duplicate_logs.duplicate_confidence IS 'Confidence score (0.0-1.0)';
COMMENT ON COLUMN duplicate_logs.action_taken IS 'Action taken: rejected, merged, or flagged';

-- ============================================================================
-- TABLE: STATUS_CHECKS
-- ============================================================================
-- Health checks and system status tracking

CREATE TABLE IF NOT EXISTS status_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details JSONB,
    CONSTRAINT status_valid CHECK (status IN ('healthy', 'degraded', 'down', 'unknown'))
);

-- Indexes for status_checks table
CREATE INDEX IF NOT EXISTS idx_status_checks_timestamp ON status_checks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_status_checks_status ON status_checks(status);

-- Comments
COMMENT ON TABLE status_checks IS 'Health checks and system status tracking';

-- ============================================================================
-- SEED DATA: DEFAULT CATEGORIES
-- ============================================================================
-- Insert 12 default categories with Kenyan-specific keywords

INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES
    ('cat-food-dining', NULL, 'Food & Dining', 'restaurant', '#FF6B6B', 
     '["food", "restaurant", "dining", "lunch", "dinner", "breakfast", "cafe", "hotel", "nyama", "choma", "kfc", "pizza", "java"]'::jsonb, TRUE),
    
    ('cat-transport', NULL, 'Transport', 'car', '#4ECDC4',
     '["taxi", "bus", "matatu", "uber", "bolt", "fuel", "parking", "transport", "travel", "petrol", "diesel", "little", "total", "shell"]'::jsonb, TRUE),
    
    ('cat-shopping', NULL, 'Shopping', 'shopping-bag', '#95E1D3',
     '["shop", "store", "mall", "clothing", "electronics", "supermarket", "carrefour", "naivas", "quickmart", "tuskys", "chandarana"]'::jsonb, TRUE),
    
    ('cat-bills-utilities', NULL, 'Bills & Utilities', 'receipt', '#F38181',
     '["bill", "electricity", "water", "internet", "phone", "utility", "kplc", "nairobi water", "zuku", "safaricom", "airtel", "telkom", "rent", "dstv", "gotv", "startimes"]'::jsonb, TRUE),
    
    ('cat-entertainment', NULL, 'Entertainment', 'film', '#AA96DA',
     '["movie", "cinema", "game", "entertainment", "music", "showmax", "netflix", "spotify", "club", "concert", "theater"]'::jsonb, TRUE),
    
    ('cat-health-fitness', NULL, 'Health & Fitness', 'medical', '#FCBAD3',
     '["hospital", "pharmacy", "doctor", "medicine", "gym", "health", "clinic", "lab", "dentist", "fitness", "wellness"]'::jsonb, TRUE),
    
    ('cat-education', NULL, 'Education', 'book', '#A8D8EA',
     '["school", "books", "tuition", "education", "course", "university", "college", "training", "fees", "stationary"]'::jsonb, TRUE),
    
    ('cat-airtime-data', NULL, 'Airtime & Data', 'call', '#FFFFD2',
     '["airtime", "data", "bundles", "safaricom", "airtel", "telkom", "faiba", "wifi"]'::jsonb, TRUE),
    
    ('cat-money-transfer', NULL, 'Money Transfer', 'swap-horizontal', '#FEC8D8',
     '["transfer", "send money", "mpesa", "paybill", "till", "buy goods", "agent"]'::jsonb, TRUE),
    
    ('cat-savings-investment', NULL, 'Savings & Investments', 'wallet', '#957DAD',
     '["savings", "investment", "deposit", "savings account", "mshwari", "kcb mpesa", "fuliza", "okoa", "equity", "co-op"]'::jsonb, TRUE),
    
    ('cat-income', NULL, 'Income', 'cash', '#90EE90',
     '["salary", "income", "payment", "received", "deposit", "earnings", "wage", "bonus", "commission"]'::jsonb, TRUE),
    
    ('cat-other', NULL, 'Other', 'ellipsis-horizontal', '#D4A5A5',
     '[]'::jsonb, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED DATA: DEFAULT ADMIN USER
-- ============================================================================
-- Password: admin123 (bcrypt hash with cost factor 12)
-- ⚠️ CHANGE THIS PASSWORD AFTER FIRST LOGIN!

INSERT INTO users (id, email, password_hash, name, preferences)
VALUES (
    'admin-default-user',
    'admin@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eBhXEPFXu',
    'Admin User',
    '{
        "theme": "light",
        "currency": "KES",
        "notifications": true,
        "language": "en"
    }'::jsonb
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Monthly category spending summary (for faster analytics)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_category_spending_monthly AS
SELECT 
    user_id,
    category_id,
    DATE_TRUNC('month', date) as month,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
FROM transactions
WHERE type = 'expense'
GROUP BY user_id, category_id, DATE_TRUNC('month', date);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_category_spending_user_month 
ON mv_category_spending_monthly(user_id, month);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update materialized view (call this periodically)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_category_spending_monthly;
END;
$$ LANGUAGE plpgsql;

-- Function to validate email format on insert/update
CREATE OR REPLACE FUNCTION validate_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Convert email to lowercase
    NEW.email := LOWER(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-lowercase emails
CREATE TRIGGER trigger_validate_email
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_email();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================
-- Grant appropriate permissions to application user
-- Uncomment and modify for your application user

-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the schema was created successfully

-- Check all tables exist
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'categories', 'transactions', 'budgets', 
                              'sms_import_logs', 'duplicate_logs', 'status_checks')) = 7,
           'Not all tables were created';
    
    RAISE NOTICE 'Schema verification: All 7 tables exist ✓';
END $$;

-- Check categories were seeded
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM categories WHERE is_default = TRUE) = 12,
           'Default categories were not seeded correctly';
    
    RAISE NOTICE 'Seed data verification: 12 default categories exist ✓';
END $$;

-- Check admin user was created
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM users WHERE email = 'admin@example.com') = 1,
           'Default admin user was not created';
    
    RAISE NOTICE 'Seed data verification: Default admin user exists ✓';
END $$;

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================
-- Version: 2.0.0
-- Tables Created: 7
-- Default Categories: 12
-- Default Users: 1 (admin@example.com / admin123)
-- 
-- Next Steps:
-- 1. Change the default admin password
-- 2. Create application-specific database user with limited permissions
-- 3. Set up regular backups
-- 4. Schedule periodic refresh of materialized views
-- 5. Monitor query performance and add indexes as needed
-- ============================================================================
