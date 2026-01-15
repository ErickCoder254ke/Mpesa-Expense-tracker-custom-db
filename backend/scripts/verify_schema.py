#!/usr/bin/env python3
"""
Database Schema Verification Script

This script verifies that the database schema matches the expected structure
and helps identify any schema mismatches.
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from config.pesadb import query_db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Expected schema definitions
EXPECTED_SCHEMA = {
    'users': [
        'id',
        'email',
        'password_hash',
        'name',
        'created_at',
        'preferences'
    ],
    'categories': [
        'id',
        'user_id',
        'name',
        'icon',
        'color',
        'keywords',
        'is_default'
    ],
    'transactions': [
        'id',
        'user_id',
        'amount',
        'type',
        'category_id',
        'description',
        'date',
        'source',
        'mpesa_details',
        'sms_metadata',
        'created_at',
        'transaction_group_id',
        'transaction_role',
        'parent_transaction_id'
    ],
    'budgets': [
        'id',
        'user_id',
        'category_id',
        'amount',
        'period',
        'month',
        'year',
        'created_at'
    ],
    'sms_import_logs': [
        'id',
        'user_id',
        'import_session_id',
        'total_messages',
        'successful_imports',
        'duplicates_found',
        'parsing_errors',
        'transactions_created',
        'errors',
        'created_at'
    ],
    'duplicate_logs': [
        'id',
        'user_id',
        'original_transaction_id',
        'duplicate_transaction_id',
        'message_hash',
        'mpesa_transaction_id',
        'reason',
        'duplicate_reasons',
        'duplicate_confidence',
        'similarity_score',
        'detected_at',
        'action_taken'
    ],
    'status_checks': [
        'id',
        'status',
        'timestamp',
        'details'
    ]
}


async def verify_table_columns(table_name: str, expected_columns: list) -> dict:
    """
    Verify that a table has all expected columns
    
    Returns:
        dict with verification results
    """
    result = {
        'table': table_name,
        'exists': False,
        'all_columns_present': False,
        'missing_columns': [],
        'actual_columns': [],
        'extra_columns': []
    }
    
    try:
        # Query the table to get column names
        rows = await query_db(f"SELECT * FROM {table_name} LIMIT 1")
        
        result['exists'] = True
        
        # Get actual columns from the result
        if rows and len(rows) > 0:
            result['actual_columns'] = list(rows[0].keys())
        else:
            # If no rows, try to infer from empty result
            # This is tricky - we'll need to insert/query or use DESCRIBE if available
            logger.warning(f"Table '{table_name}' exists but is empty - cannot verify columns")
            # For PesaDB, we can still check by attempting a query with expected columns
            # But we'll mark this as a limitation
            result['actual_columns'] = ['Unable to verify - table is empty']
            return result
        
        # Check for missing columns
        result['missing_columns'] = [
            col for col in expected_columns 
            if col not in result['actual_columns']
        ]
        
        # Check for extra columns
        result['extra_columns'] = [
            col for col in result['actual_columns']
            if col not in expected_columns
        ]
        
        result['all_columns_present'] = len(result['missing_columns']) == 0
        
    except Exception as e:
        error_msg = str(e).lower()
        if 'does not exist' in error_msg or 'not found' in error_msg:
            result['exists'] = False
        else:
            # Other error
            logger.error(f"Error verifying table '{table_name}': {str(e)}")
            result['error'] = str(e)
    
    return result


async def verify_schema():
    """Verify all tables have the expected schema"""
    
    print("\n" + "="*70)
    print("  Database Schema Verification")
    print("  M-Pesa Expense Tracker")
    print("="*70 + "\n")
    
    all_tables_ok = True
    results = {}
    
    for table_name, expected_columns in EXPECTED_SCHEMA.items():
        print(f"🔍 Verifying table: {table_name}")
        print("-" * 70)
        
        result = await verify_table_columns(table_name, expected_columns)
        results[table_name] = result
        
        if not result['exists']:
            print(f"❌ Table '{table_name}' does not exist")
            all_tables_ok = False
        elif 'error' in result:
            print(f"⚠️  Error verifying table '{table_name}': {result['error']}")
            all_tables_ok = False
        elif not result['all_columns_present']:
            print(f"⚠️  Table '{table_name}' is missing columns:")
            for col in result['missing_columns']:
                print(f"   - Missing: {col}")
            all_tables_ok = False
        else:
            print(f"✅ Table '{table_name}' schema is correct")
        
        if result.get('extra_columns'):
            print(f"ℹ️  Extra columns found (not in expected schema):")
            for col in result['extra_columns']:
                print(f"   - Extra: {col}")
        
        print()
    
    print("=" * 70)
    
    if all_tables_ok:
        print("\n✅ All tables have the correct schema!")
        print()
        return True
    else:
        print("\n❌ Schema verification failed!")
        print()
        print("💡 To fix schema issues:")
        print("   1. Stop the backend server")
        print("   2. Run: python backend/scripts/init_database.py")
        print("   3. Or call: POST /api/initialize-database")
        print("   4. Restart the backend server")
        print()
        return False


async def verify_users_table_specifically():
    """
    Specifically verify the users table has email and password_hash columns
    This is the critical fix from the schema mismatch
    """
    print("\n" + "="*70)
    print("  Critical Verification: Users Table Email/Password Schema")
    print("="*70 + "\n")
    
    try:
        # Try to query with email column
        result = await query_db("SELECT id, email FROM users LIMIT 1")
        print("✅ Users table has 'email' column")
        has_email = True
    except Exception as e:
        if 'email' in str(e).lower() and 'not' in str(e).lower():
            print("❌ Users table MISSING 'email' column")
            print(f"   Error: {str(e)}")
            has_email = False
        else:
            print(f"⚠️  Could not verify email column: {str(e)}")
            has_email = False
    
    try:
        # Try to query with password_hash column
        result = await query_db("SELECT id, password_hash FROM users LIMIT 1")
        print("✅ Users table has 'password_hash' column")
        has_password = True
    except Exception as e:
        if 'password_hash' in str(e).lower() and 'not' in str(e).lower():
            print("❌ Users table MISSING 'password_hash' column")
            print(f"   Error: {str(e)}")
            has_password = False
        else:
            print(f"⚠️  Could not verify password_hash column: {str(e)}")
            has_password = False
    
    print()
    
    if has_email and has_password:
        print("✅ Users table has correct email/password authentication schema")
        return True
    else:
        print("❌ Users table schema is incorrect for email/password authentication")
        print()
        print("⚠️  This will cause signup/login to fail!")
        print()
        print("💡 To fix:")
        print("   1. Drop the users table (or entire database)")
        print("   2. Restart the backend server (auto-initialization)")
        print("   3. Or run: python backend/scripts/init_database.py")
        return False


async def main():
    """Main verification function"""
    
    try:
        # First, specifically check the critical users table columns
        users_ok = await verify_users_table_specifically()
        
        # Then verify all tables
        all_ok = await verify_schema()
        
        print("\n" + "="*70)
        print("  Verification Summary")
        print("="*70)
        print(f"  Users table email/password schema: {'✅ OK' if users_ok else '❌ FAILED'}")
        print(f"  All tables schema: {'✅ OK' if all_ok else '❌ FAILED'}")
        print("="*70 + "\n")
        
        if users_ok and all_ok:
            print("🎉 Database schema verification passed!")
            print("   Your database is correctly configured.")
            return True
        else:
            print("⚠️  Database schema verification failed!")
            print("   Please fix the schema issues listed above.")
            return False
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Verification cancelled by user.")
        return False
    except Exception as e:
        print(f"\n\n❌ Verification failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
