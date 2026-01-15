"""
Database Schema Verification and Repair Script

This script verifies that all required tables exist with the correct schema
and provides options to repair or recreate tables if needed.

Usage:
    python backend/scripts/verify_database_schema.py [--repair] [--force-recreate]

Options:
    --repair: Attempt to repair missing tables
    --force-recreate: Drop and recreate all tables (DESTRUCTIVE!)
    --verbose: Show detailed output
"""

import asyncio
import sys
import os
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Tuple

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.config.pesadb import query_db, execute_db
from backend.services.database_initializer import DatabaseInitializer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SchemaVerifier:
    """Verifies and repairs database schema"""
    
    # Expected schema for each table
    EXPECTED_SCHEMAS = {
        'users': ['id', 'email', 'password_hash', 'name', 'created_at', 'preferences'],
        'categories': ['id', 'user_id', 'name', 'icon', 'color', 'keywords', 'is_default'],
        'transactions': [
            'id', 'user_id', 'amount', 'type', 'category_id', 'description',
            'date', 'source', 'mpesa_details', 'sms_metadata', 'created_at',
            'transaction_group_id', 'transaction_role', 'parent_transaction_id'
        ],
        'budgets': ['id', 'user_id', 'category_id', 'amount', 'period', 'month', 'year', 'created_at'],
        'sms_import_logs': [
            'id', 'user_id', 'import_session_id', 'total_messages',
            'successful_imports', 'duplicates_found', 'parsing_errors',
            'transactions_created', 'errors', 'created_at'
        ],
        'duplicate_logs': [
            'id', 'user_id', 'original_transaction_id', 'duplicate_transaction_id',
            'message_hash', 'mpesa_transaction_id', 'reason', 'duplicate_reasons',
            'duplicate_confidence', 'similarity_score', 'detected_at', 'action_taken'
        ],
        'status_checks': ['id', 'status', 'timestamp', 'details']
    }
    
    @staticmethod
    async def verify_table_exists(table_name: str) -> bool:
        """Check if a table exists"""
        try:
            await query_db(f"SELECT * FROM {table_name} LIMIT 1")
            return True
        except Exception as e:
            error_msg = str(e).lower()
            if any(phrase in error_msg for phrase in [
                'does not exist', 'no such table', 'table not found', 'tablenotfound'
            ]):
                return False
            logger.warning(f"Error checking table {table_name}: {e}")
            return False
    
    @staticmethod
    async def verify_table_schema(table_name: str, expected_columns: List[str]) -> Tuple[bool, List[str], List[str]]:
        """
        Verify table has the expected columns
        
        Returns:
            (is_valid, missing_columns, extra_columns)
        """
        try:
            result = await query_db(f"SELECT * FROM {table_name} LIMIT 1")
            
            if not result:
                # Table is empty, try to infer schema from empty result
                # PesaDB should still return column names
                logger.info(f"Table {table_name} is empty, cannot fully verify schema")
                return True, [], []
            
            # Get columns from first row
            actual_columns = list(result[0].keys()) if result else []
            
            missing = [col for col in expected_columns if col not in actual_columns]
            extra = [col for col in actual_columns if col not in expected_columns]
            
            is_valid = len(missing) == 0
            
            return is_valid, missing, extra
            
        except Exception as e:
            logger.error(f"Error verifying schema for {table_name}: {e}")
            return False, expected_columns, []
    
    @staticmethod
    async def get_table_row_count(table_name: str) -> int:
        """Get approximate row count for a table"""
        try:
            # Use simple SELECT * and count in memory
            result = await query_db(f"SELECT * FROM {table_name}")
            return len(result) if result else 0
        except:
            return 0
    
    @staticmethod
    async def verify_all_tables(verbose: bool = False) -> Dict[str, Dict]:
        """
        Verify all tables exist and have correct schema
        
        Returns:
            Dict mapping table_name to verification result
        """
        results = {}
        
        for table_name, expected_columns in SchemaVerifier.EXPECTED_SCHEMAS.items():
            logger.info(f"Verifying table: {table_name}")
            
            exists = await SchemaVerifier.verify_table_exists(table_name)
            
            if not exists:
                results[table_name] = {
                    'exists': False,
                    'valid_schema': False,
                    'missing_columns': expected_columns,
                    'extra_columns': [],
                    'row_count': 0,
                    'status': '❌ MISSING'
                }
                logger.error(f"❌ Table {table_name} does not exist")
                continue
            
            # Check schema
            is_valid, missing, extra = await SchemaVerifier.verify_table_schema(table_name, expected_columns)
            row_count = await SchemaVerifier.get_table_row_count(table_name)
            
            if is_valid:
                status = f"✅ OK ({row_count} rows)"
                logger.info(f"✅ Table {table_name} is valid ({row_count} rows)")
            else:
                status = f"⚠️  SCHEMA MISMATCH ({row_count} rows)"
                logger.warning(f"⚠️  Table {table_name} has schema issues")
                if missing:
                    logger.warning(f"   Missing columns: {', '.join(missing)}")
                if extra:
                    logger.info(f"   Extra columns: {', '.join(extra)}")
            
            results[table_name] = {
                'exists': True,
                'valid_schema': is_valid,
                'missing_columns': missing,
                'extra_columns': extra,
                'row_count': row_count,
                'status': status
            }
        
        return results
    
    @staticmethod
    async def repair_database(force_recreate: bool = False) -> bool:
        """
        Repair database by creating missing tables
        
        Args:
            force_recreate: If True, drop and recreate ALL tables (DESTRUCTIVE!)
        
        Returns:
            True if repair was successful
        """
        try:
            if force_recreate:
                logger.warning("⚠️  FORCE RECREATE MODE - ALL DATA WILL BE LOST!")
                logger.warning("⚠️  This will DROP all tables and recreate them!")
                
                response = input("Are you sure you want to continue? Type 'YES' to confirm: ")
                if response != "YES":
                    logger.info("Repair cancelled")
                    return False
                
                # Drop all tables
                for table_name in SchemaVerifier.EXPECTED_SCHEMAS.keys():
                    try:
                        logger.info(f"Dropping table: {table_name}")
                        await execute_db(f"DROP TABLE {table_name}")
                    except Exception as e:
                        logger.warning(f"Could not drop {table_name}: {e}")
            
            # Ensure database exists
            await DatabaseInitializer.ensure_database_exists()
            
            # Initialize database using the standard initializer
            logger.info("Running database initialization...")
            result = await DatabaseInitializer.initialize()
            
            if result['success']:
                logger.info("✅ Database repair completed successfully")
                return True
            else:
                logger.error(f"❌ Database repair failed: {result.get('error', 'Unknown error')}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error during database repair: {e}")
            return False


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Verify and repair database schema')
    parser.add_argument('--repair', action='store_true', help='Repair missing tables')
    parser.add_argument('--force-recreate', action='store_true', help='Drop and recreate all tables (DESTRUCTIVE!)')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    print("\n" + "="*80)
    print("DATABASE SCHEMA VERIFICATION")
    print("="*80 + "\n")
    
    # Verify all tables
    print("🔍 Verifying database schema...\n")
    results = await SchemaVerifier.verify_all_tables(verbose=args.verbose)
    
    # Print summary
    print("\n" + "="*80)
    print("VERIFICATION SUMMARY")
    print("="*80 + "\n")
    
    all_valid = True
    for table_name, result in results.items():
        print(f"{result['status']:40} {table_name}")
        if not result['valid_schema'] or not result['exists']:
            all_valid = False
    
    print("\n" + "="*80 + "\n")
    
    if all_valid:
        print("✅ All tables are present and have correct schema!")
        return 0
    else:
        print("❌ Some tables are missing or have schema issues")
        
        if args.repair or args.force_recreate:
            print("\n🔧 Attempting to repair database...\n")
            success = await SchemaVerifier.repair_database(force_recreate=args.force_recreate)
            
            if success:
                print("\n✅ Database repair completed successfully!")
                
                # Re-verify
                print("\n🔍 Re-verifying database schema...\n")
                results = await SchemaVerifier.verify_all_tables(verbose=args.verbose)
                
                all_valid_after = all(r['valid_schema'] and r['exists'] for r in results.values())
                
                if all_valid_after:
                    print("✅ All tables are now valid!")
                    return 0
                else:
                    print("⚠️  Some issues remain after repair")
                    return 1
            else:
                print("\n❌ Database repair failed")
                return 1
        else:
            print("\nRun with --repair to fix missing tables")
            print("Run with --force-recreate to drop and recreate all tables (DESTRUCTIVE!)")
            return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nVerification cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
