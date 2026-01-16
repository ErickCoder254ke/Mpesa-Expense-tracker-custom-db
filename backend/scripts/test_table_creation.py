"""
Test script to verify table creation logic

This script will:
1. Check current database state
2. Attempt to create tables
3. Verify all tables exist
4. Report detailed results

Usage:
    python backend/scripts/test_table_creation.py
"""

import asyncio
import sys
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.services.database_initializer import DatabaseInitializer
from backend.config.pesadb import query_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_table_existence():
    """Test which tables currently exist"""
    logger.info("\n" + "=" * 80)
    logger.info("CHECKING EXISTING TABLES")
    logger.info("=" * 80)
    
    required_tables = [
        'users', 'categories', 'transactions', 'budgets',
        'sms_import_logs', 'duplicate_logs', 'status_checks'
    ]
    
    existing = []
    missing = []
    
    for table in required_tables:
        exists = await DatabaseInitializer.table_exists(table)
        if exists:
            logger.info(f"✅ {table:25} EXISTS")
            existing.append(table)
        else:
            logger.error(f"❌ {table:25} MISSING")
            missing.append(table)
    
    logger.info(f"\nSummary: {len(existing)}/{len(required_tables)} tables exist")
    
    return existing, missing


async def test_table_creation():
    """Test the table creation process"""
    logger.info("\n" + "=" * 80)
    logger.info("RUNNING TABLE CREATION TEST")
    logger.info("=" * 80)
    
    result = await DatabaseInitializer.initialize_database(
        seed_categories=True,
        create_default_user=True
    )
    
    logger.info("\n" + "=" * 80)
    logger.info("INITIALIZATION RESULT")
    logger.info("=" * 80)
    logger.info(f"Success: {result['success']}")
    logger.info(f"Message: {result['message']}")
    logger.info(f"Tables Created: {result['tables_created']}")
    logger.info(f"Tables Skipped: {result['tables_skipped']}")
    logger.info(f"Categories Seeded: {result['categories_seeded']}")
    logger.info(f"User Created: {result.get('user_created', False)}")
    logger.info(f"Verified: {result['verified']}")
    
    if result['errors']:
        logger.error(f"\nErrors ({len(result['errors'])}):")
        for idx, error in enumerate(result['errors'], 1):
            logger.error(f"  {idx}. {error}")
    
    return result


async def test_table_queries():
    """Test basic queries on each table"""
    logger.info("\n" + "=" * 80)
    logger.info("TESTING TABLE QUERIES")
    logger.info("=" * 80)
    
    tables = [
        'users', 'categories', 'transactions', 'budgets',
        'sms_import_logs', 'duplicate_logs', 'status_checks'
    ]
    
    query_results = {}
    
    for table in tables:
        try:
            result = await query_db(f"SELECT * FROM {table} LIMIT 1")
            row_count = len(result) if result else 0
            query_results[table] = {
                'success': True,
                'row_count': row_count,
                'has_data': row_count > 0
            }
            status = "✅ QUERYABLE"
            if row_count > 0:
                status += f" ({row_count} rows)"
            logger.info(f"{status:30} {table}")
        except Exception as e:
            query_results[table] = {
                'success': False,
                'error': str(e)
            }
            logger.error(f"❌ QUERY FAILED:              {table}")
            logger.error(f"   Error: {str(e)[:100]}")
    
    return query_results


async def main():
    """Main test function"""
    print("\n" + "=" * 80)
    print("TABLE CREATION TEST SCRIPT")
    print("=" * 80 + "\n")
    
    try:
        # Step 1: Check existing tables
        existing, missing = await test_table_existence()
        
        # Step 2: Run table creation
        creation_result = await test_table_creation()
        
        # Step 3: Re-check tables after creation
        logger.info("\n" + "=" * 80)
        logger.info("RE-CHECKING TABLES AFTER CREATION")
        logger.info("=" * 80)
        existing_after, missing_after = await test_table_existence()
        
        # Step 4: Test queries on all tables
        query_results = await test_table_queries()
        
        # Final Summary
        logger.info("\n" + "=" * 80)
        logger.info("FINAL SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Tables Before:     {len(existing)}/7")
        logger.info(f"Tables After:      {len(existing_after)}/7")
        logger.info(f"Tables Created:    {creation_result['tables_created']}")
        logger.info(f"Tables Missing:    {len(missing_after)}")
        logger.info(f"Queryable Tables:  {sum(1 for r in query_results.values() if r['success'])}/7")
        
        if missing_after:
            logger.error(f"\n⚠️  WARNING: {len(missing_after)} tables still missing!")
            logger.error("Missing tables:")
            for table in missing_after:
                logger.error(f"  - {table}")
        
        if creation_result['errors']:
            logger.error(f"\n⚠️  WARNING: {len(creation_result['errors'])} errors during initialization!")
        
        if not missing_after and not creation_result['errors']:
            logger.info("\n✅ SUCCESS: All tables created and verified!")
            return 0
        else:
            logger.error("\n❌ FAILURE: Some tables failed to create properly")
            return 1
    
    except Exception as e:
        logger.error(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user")
        sys.exit(1)
