"""
Direct seed script for categories - bypasses COUNT checks
This script will seed categories directly, catching duplicate errors
"""

import asyncio
import logging
import sys
from config.pesadb import execute_db

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


async def seed_categories_direct():
    """Seed categories directly without checking if they exist first"""

    logger.info("🌱 Starting direct category seeding...")

    # First, ensure system user exists (required for foreign key constraint)
    logger.info("📝 Ensuring system user exists...")
    try:
        system_user_sql = """INSERT INTO users (id, email, password_hash, name, created_at, preferences)
VALUES ('system', 'system@internal', 'SYSTEM_ACCOUNT_NO_LOGIN', 'System Account', '2026-01-16T00:00:00Z', '{"is_system": true}')"""
        await execute_db(system_user_sql)
        logger.info("✅ System user created")
    except Exception as e:
        error_str = str(e).lower()
        if any(word in error_str for word in ['duplicate', 'exists', 'unique', 'constraint']):
            logger.info("✅ System user already exists")
        else:
            logger.error(f"❌ Error creating system user: {e}")
            logger.error("   Cannot seed categories without system user!")
            return False

    categories = [
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-food', 'system', 'Food & Dining', '🍔', '#FF6B6B', '["food", "restaurant", "dining", "lunch", "dinner", "breakfast", "cafe", "hotel", "nyama", "choma", "kfc", "pizza", "java"]', TRUE)""",
            'name': 'Food & Dining'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-transport', 'system', 'Transport', '🚗', '#4ECDC4', '["taxi", "bus", "matatu", "uber", "bolt", "fuel", "parking", "transport", "travel", "petrol", "diesel", "little", "total", "shell"]', TRUE)""",
            'name': 'Transport'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-shopping', 'system', 'Shopping', '🛍️', '#95E1D3', '["shop", "store", "mall", "clothing", "electronics", "supermarket", "carrefour", "naivas", "quickmart", "tuskys", "chandarana"]', TRUE)""",
            'name': 'Shopping'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-bills', 'system', 'Bills & Utilities', '📱', '#F38181', '["bill", "electricity", "water", "internet", "phone", "utility", "kplc", "nairobi water", "zuku", "safaricom", "airtel", "telkom", "rent", "dstv", "gotv", "startimes"]', TRUE)""",
            'name': 'Bills & Utilities'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-entertainment', 'system', 'Entertainment', '🎬', '#AA96DA', '["movie", "cinema", "game", "entertainment", "music", "showmax", "netflix", "spotify", "club", "concert", "theater"]', TRUE)""",
            'name': 'Entertainment'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-health', 'system', 'Health & Fitness', '⚕️', '#FCBAD3', '["hospital", "pharmacy", "doctor", "medicine", "gym", "health", "clinic", "lab", "dentist", "fitness", "wellness"]', TRUE)""",
            'name': 'Health & Fitness'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-education', 'system', 'Education', '📚', '#A8D8EA', '["school", "books", "tuition", "education", "course", "university", "college", "training", "fees", "stationary"]', TRUE)""",
            'name': 'Education'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-airtime', 'system', 'Airtime & Data', '📞', '#FFFFD2', '["airtime", "data", "bundles", "safaricom", "airtel", "telkom", "faiba", "wifi"]', TRUE)""",
            'name': 'Airtime & Data'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-transfers', 'system', 'Money Transfer', '💸', '#FEC8D8', '["transfer", "send money", "mpesa", "paybill", "till", "buy goods", "agent"]', TRUE)""",
            'name': 'Money Transfer'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-savings', 'system', 'Savings & Investments', '💰', '#957DAD', '["savings", "investment", "deposit", "savings account", "mshwari", "kcb mpesa", "fuliza", "okoa", "equity", "co-op"]', TRUE)""",
            'name': 'Savings & Investments'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-income', 'system', 'Income', '💵', '#90EE90', '["salary", "income", "payment", "received", "deposit", "earnings", "wage", "bonus", "commission"]', TRUE)""",
            'name': 'Income'
        },
        {
            'sql': """INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
VALUES ('cat-other', 'system', 'Other', '📌', '#D4A5A5', '[]', TRUE)""",
            'name': 'Other'
        }
    ]
    
    success_count = 0
    duplicate_count = 0
    error_count = 0
    
    for category in categories:
        try:
            logger.info(f"Inserting category: {category['name']}")
            await execute_db(category['sql'])
            success_count += 1
            logger.info(f"  ✅ Success: {category['name']}")
        except Exception as e:
            error_str = str(e).lower()
            if any(word in error_str for word in ['duplicate', 'exists', 'unique', 'constraint']):
                duplicate_count += 1
                logger.info(f"  ⏭️  Skipped (already exists): {category['name']}")
            else:
                error_count += 1
                logger.error(f"  ❌ Error inserting {category['name']}: {e}")
    
    logger.info("\n" + "="*80)
    logger.info("SEEDING SUMMARY")
    logger.info("="*80)
    logger.info(f"✅ Successfully inserted: {success_count}")
    logger.info(f"⏭️  Skipped (duplicates): {duplicate_count}")
    logger.info(f"❌ Errors: {error_count}")
    logger.info(f"📊 Total processed: {len(categories)}")
    logger.info("="*80)
    
    return success_count > 0 or duplicate_count > 0


if __name__ == "__main__":
    result = asyncio.run(seed_categories_direct())
    if result:
        logger.info("✅ Category seeding completed successfully!")
        sys.exit(0)
    else:
        logger.error("❌ Category seeding failed!")
        sys.exit(1)
