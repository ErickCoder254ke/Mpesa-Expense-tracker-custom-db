-- ============================================================================
-- SEED DATA SQL COMMANDS FOR MANUAL EXECUTION
-- M-Pesa Expense Tracker - Default Categories
-- ============================================================================
-- Run these commands directly in your PesaDB SQL editor
-- These commands will seed the 12 default categories
-- ============================================================================

-- Food & Dining
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-food', 'system', 'Food & Dining', '🍔', '#FF6B6B', '["food", "restaurant", "dining", "lunch", "dinner", "breakfast", "cafe", "hotel", "nyama", "choma", "kfc", "pizza", "java"]', TRUE);

-- Transport
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-transport', 'system', 'Transport', '🚗', '#4ECDC4', '["taxi", "bus", "matatu", "uber", "bolt", "fuel", "parking", "transport", "travel", "petrol", "diesel", "little", "total", "shell"]', TRUE);

-- Shopping
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-shopping', 'system', 'Shopping', '🛍️', '#95E1D3', '["shop", "store", "mall", "clothing", "electronics", "supermarket", "carrefour", "naivas", "quickmart", "tuskys", "chandarana"]', TRUE);

-- Bills & Utilities
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-bills', 'system', 'Bills & Utilities', '📱', '#F38181', '["bill", "electricity", "water", "internet", "phone", "utility", "kplc", "nairobi water", "zuku", "safaricom", "airtel", "telkom", "rent", "dstv", "gotv", "startimes"]', TRUE);

-- Entertainment
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-entertainment', 'system', 'Entertainment', '🎬', '#AA96DA', '["movie", "cinema", "game", "entertainment", "music", "showmax", "netflix", "spotify", "club", "concert", "theater"]', TRUE);

-- Health & Fitness
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-health', 'system', 'Health & Fitness', '⚕️', '#FCBAD3', '["hospital", "pharmacy", "doctor", "medicine", "gym", "health", "clinic", "lab", "dentist", "fitness", "wellness"]', TRUE);

-- Education
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-education', 'system', 'Education', '📚', '#A8D8EA', '["school", "books", "tuition", "education", "course", "university", "college", "training", "fees", "stationary"]', TRUE);

-- Airtime & Data
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-airtime', 'system', 'Airtime & Data', '📞', '#FFFFD2', '["airtime", "data", "bundles", "safaricom", "airtel", "telkom", "faiba", "wifi"]', TRUE);

-- Money Transfer
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-transfers', 'system', 'Money Transfer', '💸', '#FEC8D8', '["transfer", "send money", "mpesa", "paybill", "till", "buy goods", "agent"]', TRUE);

-- Savings & Investments
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-savings', 'system', 'Savings & Investments', '💰', '#957DAD', '["savings", "investment", "deposit", "savings account", "mshwari", "kcb mpesa", "fuliza", "okoa", "equity", "co-op"]', TRUE);

-- Income/Salary
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-income', 'system', 'Income', '💵', '#90EE90', '["salary", "income", "payment", "received", "deposit", "earnings", "wage", "bonus", "commission"]', TRUE);

-- Other
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-other', 'system', 'Other', '📌', '#D4A5A5', '[]', TRUE);

-- ============================================================================
-- VERIFICATION QUERY
-- Run this after inserting to verify all categories were created:
-- ============================================================================

-- SELECT COUNT(*) as total_categories FROM categories WHERE is_default = TRUE;

-- Expected result: 12 categories

-- ============================================================================
-- VIEW ALL CATEGORIES
-- ============================================================================

-- SELECT id, name, icon, color FROM categories ORDER BY name;
