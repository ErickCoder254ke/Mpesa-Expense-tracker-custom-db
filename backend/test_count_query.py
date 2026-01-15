"""
Test script to debug COUNT(*) query issues with PesaDB
"""

import asyncio
import logging
import sys
from config.pesadb import query_db, config

# Set up detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


async def test_count_queries():
    """Test various COUNT queries to identify the issue"""
    
    print("\n" + "="*80)
    print("TESTING COUNT QUERIES WITH PESADB")
    print("="*80 + "\n")
    
    # Validate configuration
    try:
        config.validate()
        logger.info(f"✅ PesaDB Config validated")
        logger.info(f"   API URL: {config.api_url}")
        logger.info(f"   Database: {config.database}")
    except Exception as e:
        logger.error(f"❌ Config validation failed: {e}")
        return
    
    # Test 1: Simple COUNT(*) on categories
    print("\n📝 Test 1: SELECT COUNT(*) as count FROM categories")
    print("-" * 80)
    try:
        sql = "SELECT COUNT(*) as count FROM categories"
        logger.info(f"Executing: {sql}")
        result = await query_db(sql)
        logger.info(f"✅ SUCCESS: {result}")
        print(f"Result: {result}")
    except Exception as e:
        logger.error(f"❌ FAILED: {e}")
        print(f"Error: {e}")
    
    # Test 2: COUNT(*) without alias
    print("\n📝 Test 2: SELECT COUNT(*) FROM categories")
    print("-" * 80)
    try:
        sql = "SELECT COUNT(*) FROM categories"
        logger.info(f"Executing: {sql}")
        result = await query_db(sql)
        logger.info(f"✅ SUCCESS: {result}")
        print(f"Result: {result}")
    except Exception as e:
        logger.error(f"❌ FAILED: {e}")
        print(f"Error: {e}")
    
    # Test 3: Simple SELECT * from categories
    print("\n📝 Test 3: SELECT * FROM categories LIMIT 1")
    print("-" * 80)
    try:
        sql = "SELECT * FROM categories LIMIT 1"
        logger.info(f"Executing: {sql}")
        result = await query_db(sql)
        logger.info(f"✅ SUCCESS")
        print(f"Result count: {len(result)} rows")
        if result:
            print(f"First row: {result[0]}")
    except Exception as e:
        logger.error(f"❌ FAILED: {e}")
        print(f"Error: {e}")
    
    # Test 4: COUNT(*) on users table
    print("\n📝 Test 4: SELECT COUNT(*) as count FROM users")
    print("-" * 80)
    try:
        sql = "SELECT COUNT(*) as count FROM users"
        logger.info(f"Executing: {sql}")
        result = await query_db(sql)
        logger.info(f"✅ SUCCESS: {result}")
        print(f"Result: {result}")
    except Exception as e:
        logger.error(f"❌ FAILED: {e}")
        print(f"Error: {e}")
    
    # Test 5: COUNT with WHERE clause
    print("\n📝 Test 5: SELECT COUNT(*) as count FROM categories WHERE is_default = TRUE")
    print("-" * 80)
    try:
        sql = "SELECT COUNT(*) as count FROM categories WHERE is_default = TRUE"
        logger.info(f"Executing: {sql}")
        result = await query_db(sql)
        logger.info(f"✅ SUCCESS: {result}")
        print(f"Result: {result}")
    except Exception as e:
        logger.error(f"❌ FAILED: {e}")
        print(f"Error: {e}")
    
    # Test 6: Show tables to see what exists
    print("\n📝 Test 6: SHOW TABLES")
    print("-" * 80)
    try:
        sql = "SHOW TABLES"
        logger.info(f"Executing: {sql}")
        result = await query_db(sql)
        logger.info(f"✅ SUCCESS")
        print(f"Result: {result}")
    except Exception as e:
        logger.error(f"❌ FAILED: {e}")
        print(f"Error: {e}")
    
    print("\n" + "="*80)
    print("TESTS COMPLETED")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_count_queries())
