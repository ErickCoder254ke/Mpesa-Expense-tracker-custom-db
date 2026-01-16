"""
Diagnostic script to test transactions table creation

This script will test different variations of the transactions table
to identify what's causing the creation to fail.
"""

import asyncio
import sys
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.config.pesadb import query_db, execute_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def table_exists(table_name: str) -> bool:
    """Check if a table exists"""
    try:
        await query_db(f"SELECT * FROM {table_name} LIMIT 1")
        return True
    except Exception as e:
        if 'not found' in str(e).lower() or 'does not exist' in str(e).lower():
            return False
        return False


async def test_minimal_transactions_table():
    """Test creating a minimal transactions table without foreign keys"""
    logger.info("\n" + "="*80)
    logger.info("TEST 1: Minimal transactions table (no foreign keys)")
    logger.info("="*80)
    
    try:
        # Drop table if exists
        try:
            await execute_db("DROP TABLE transactions_test1")
            logger.info("Dropped existing transactions_test1")
        except:
            pass
        
        # Create minimal table
        sql = """CREATE TABLE transactions_test1 (
    id STRING PRIMARY KEY,
    user_id STRING,
    amount FLOAT,
    type STRING,
    description STRING,
    date STRING,
    created_at STRING
)"""
        logger.info("Creating minimal transactions table...")
        logger.debug(f"SQL: {sql}")
        
        await execute_db(sql)
        
        # Verify
        exists = await table_exists('transactions_test1')
        if exists:
            logger.info("✅ SUCCESS: Minimal table created successfully")
            return True
        else:
            logger.error("❌ FAILED: Table reported created but doesn't exist")
            return False
            
    except Exception as e:
        logger.error(f"❌ FAILED: {str(e)}")
        return False


async def test_transactions_with_simple_fk():
    """Test transactions table with simple foreign keys (no self-reference)"""
    logger.info("\n" + "="*80)
    logger.info("TEST 2: Transactions with simple foreign keys (users, categories)")
    logger.info("="*80)
    
    try:
        # Ensure users table exists
        users_exist = await table_exists('users')
        if not users_exist:
            logger.warning("⚠️  Users table doesn't exist - creating it first")
            users_sql = """CREATE TABLE users (
    id STRING PRIMARY KEY,
    email STRING,
    password_hash STRING,
    name STRING,
    created_at STRING,
    preferences STRING
)"""
            await execute_db(users_sql)
        
        # Ensure categories table exists
        categories_exist = await table_exists('categories')
        if not categories_exist:
            logger.warning("⚠️  Categories table doesn't exist - creating it first")
            categories_sql = """CREATE TABLE categories (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    name STRING,
    icon STRING,
    color STRING,
    keywords STRING,
    is_default BOOL
)"""
            await execute_db(categories_sql)
        
        # Drop test table if exists
        try:
            await execute_db("DROP TABLE transactions_test2")
            logger.info("Dropped existing transactions_test2")
        except:
            pass
        
        # Create table with simple foreign keys
        sql = """CREATE TABLE transactions_test2 (
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
    transaction_role STRING
)"""
        logger.info("Creating transactions table with simple foreign keys...")
        logger.debug(f"SQL: {sql}")
        
        await execute_db(sql)
        
        # Verify
        exists = await table_exists('transactions_test2')
        if exists:
            logger.info("✅ SUCCESS: Table with simple foreign keys created successfully")
            return True
        else:
            logger.error("❌ FAILED: Table reported created but doesn't exist")
            return False
            
    except Exception as e:
        logger.error(f"❌ FAILED: {str(e)}")
        return False


async def test_transactions_with_self_reference():
    """Test transactions table with self-referential foreign key"""
    logger.info("\n" + "="*80)
    logger.info("TEST 3: Transactions with self-referential foreign key")
    logger.info("="*80)
    
    try:
        # Ensure parent tables exist
        users_exist = await table_exists('users')
        categories_exist = await table_exists('categories')
        
        if not users_exist or not categories_exist:
            logger.error("❌ Parent tables don't exist - run test 2 first")
            return False
        
        # Drop test table if exists
        try:
            await execute_db("DROP TABLE transactions_test3")
            logger.info("Dropped existing transactions_test3")
        except:
            pass
        
        # Create table with self-referential foreign key
        sql = """CREATE TABLE transactions_test3 (
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
    parent_transaction_id STRING REFERENCES transactions_test3(id)
)"""
        logger.info("Creating transactions table with self-referential foreign key...")
        logger.debug(f"SQL: {sql}")
        
        await execute_db(sql)
        
        # Verify
        exists = await table_exists('transactions_test3')
        if exists:
            logger.info("✅ SUCCESS: Table with self-referential FK created successfully")
            return True
        else:
            logger.error("❌ FAILED: Table reported created but doesn't exist")
            return False
            
    except Exception as e:
        logger.error(f"❌ FAILED: {str(e)}")
        logger.error("💡 This likely means PesaDB doesn't support self-referential foreign keys")
        return False


async def test_actual_transactions_table():
    """Test creating the actual transactions table"""
    logger.info("\n" + "="*80)
    logger.info("TEST 4: Actual transactions table (as in schema)")
    logger.info("="*80)
    
    try:
        # Check if table already exists
        exists = await table_exists('transactions')
        if exists:
            logger.info("ℹ️  Transactions table already exists")
            response = input("Drop and recreate? (yes/no): ")
            if response.lower() != 'yes':
                logger.info("Skipping test")
                return True
            
            await execute_db("DROP TABLE transactions")
            logger.info("Dropped existing transactions table")
        
        # Create actual transactions table
        sql = """CREATE TABLE transactions (
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
    parent_transaction_id STRING REFERENCES transactions(id)
)"""
        logger.info("Creating actual transactions table...")
        logger.debug(f"SQL: {sql}")
        
        await execute_db(sql)
        
        # Verify
        exists = await table_exists('transactions')
        if exists:
            logger.info("✅ SUCCESS: Transactions table created successfully")
            return True
        else:
            logger.error("❌ FAILED: Table reported created but doesn't exist")
            return False
            
    except Exception as e:
        logger.error(f"❌ FAILED: {str(e)}")
        return False


async def main():
    """Run all diagnostic tests"""
    print("\n" + "="*80)
    print("TRANSACTIONS TABLE DIAGNOSTIC TESTS")
    print("="*80 + "\n")
    
    results = {}
    
    # Test 1: Minimal table
    results['minimal'] = await test_minimal_transactions_table()
    
    # Test 2: Simple foreign keys
    results['simple_fk'] = await test_transactions_with_simple_fk()
    
    # Test 3: Self-referential foreign key
    results['self_reference'] = await test_transactions_with_self_reference()
    
    # Test 4: Actual table
    results['actual'] = await test_actual_transactions_table()
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("DIAGNOSTIC SUMMARY")
    logger.info("="*80)
    logger.info(f"Test 1 - Minimal table:              {'✅ PASS' if results['minimal'] else '❌ FAIL'}")
    logger.info(f"Test 2 - Simple foreign keys:        {'✅ PASS' if results['simple_fk'] else '❌ FAIL'}")
    logger.info(f"Test 3 - Self-referential FK:        {'✅ PASS' if results['self_reference'] else '❌ FAIL'}")
    logger.info(f"Test 4 - Actual transactions table:  {'✅ PASS' if results['actual'] else '❌ FAIL'}")
    logger.info("="*80)
    
    # Diagnosis
    logger.info("\n" + "="*80)
    logger.info("DIAGNOSIS")
    logger.info("="*80)
    
    if results['actual']:
        logger.info("✅ The transactions table can be created successfully!")
        logger.info("   The issue may be with the initialization process order.")
    elif not results['self_reference'] and results['simple_fk']:
        logger.error("❌ ISSUE FOUND: Self-referential foreign keys are NOT supported")
        logger.error("   PesaDB cannot create tables with foreign keys referencing themselves")
        logger.error("   parent_transaction_id STRING REFERENCES transactions(id) is causing the failure")
        logger.info("\n💡 SOLUTION: Remove the self-referential foreign key constraint")
        logger.info("   Change: parent_transaction_id STRING REFERENCES transactions(id)")
        logger.info("   To:     parent_transaction_id STRING")
        logger.info("   The app can still maintain referential integrity at the application level")
    elif not results['simple_fk'] and results['minimal']:
        logger.error("❌ ISSUE FOUND: Foreign key constraints are NOT supported")
        logger.error("   PesaDB cannot create tables with REFERENCES clauses")
        logger.info("\n💡 SOLUTION: Remove all foreign key constraints from table definitions")
    elif not results['minimal']:
        logger.error("❌ ISSUE FOUND: Basic table creation is failing")
        logger.error("   This indicates a more fundamental issue with PesaDB connection or permissions")
    else:
        logger.warning("⚠️  Unexpected test results - manual investigation needed")
    
    logger.info("="*80 + "\n")
    
    return 0 if results['actual'] else 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
