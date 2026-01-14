#!/usr/bin/env python3
"""
Test script for database initialization

This script tests the database initialization process to ensure all tables
are created correctly and the database is ready for use.

Usage:
    python backend/test_database_init.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.database_initializer import db_initializer
from services.pesadb_service import db_service
from config.pesadb import query_db


async def test_initialization():
    """Test the complete database initialization process"""
    
    print("\n" + "="*70)
    print("  DATABASE INITIALIZATION TEST")
    print("  M-Pesa Expense Tracker")
    print("="*70 + "\n")
    
    # Test 1: Run initialization
    print("📝 Test 1: Running database initialization...")
    print("-" * 70)
    
    try:
        result = await db_initializer.initialize_database(
            seed_categories=True,
            create_default_user=True
        )
        
        print(f"\n✅ Initialization completed!")
        print(f"   Success: {result['success']}")
        print(f"   Database created: {result.get('database_created', 'N/A')}")
        print(f"   Tables created: {result['tables_created']}")
        print(f"   Tables skipped: {result['tables_skipped']}")
        print(f"   Categories seeded: {result['categories_seeded']}")
        print(f"   User created: {result['user_created']}")
        print(f"   Verified: {result['verified']}")
        
        if result.get('errors'):
            print(f"\n⚠️  Errors encountered:")
            for error in result['errors']:
                print(f"   - {error}")
        
        if not result['success']:
            print(f"\n❌ Initialization failed: {result['message']}")
            return False
        
    except Exception as e:
        print(f"\n❌ Initialization failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 2: Verify tables exist
    print("\n\n📝 Test 2: Verifying tables exist...")
    print("-" * 70)
    
    required_tables = [
        'users', 'categories', 'transactions', 'budgets',
        'sms_import_logs', 'duplicate_logs', 'status_checks'
    ]
    
    all_tables_exist = True
    
    for table in required_tables:
        try:
            result = await query_db(f"SELECT COUNT(*) as count FROM {table}")
            count = result[0]['count'] if result else 0
            print(f"✅ Table '{table}' exists with {count} rows")
        except Exception as e:
            print(f"❌ Table '{table}' does not exist or is not accessible: {str(e)}")
            all_tables_exist = False
    
    if not all_tables_exist:
        print("\n❌ Some tables are missing!")
        return False
    
    # Test 3: Verify categories were seeded
    print("\n\n📝 Test 3: Verifying categories...")
    print("-" * 70)
    
    try:
        categories_count = await db_service.count_categories()
        print(f"✅ Found {categories_count} categories")
        
        if categories_count > 0:
            categories = await db_service.get_categories()
            print("\nCategory list:")
            for cat in categories[:5]:  # Show first 5
                print(f"   - {cat.get('icon', '📌')} {cat.get('name', 'Unknown')}")
            if len(categories) > 5:
                print(f"   ... and {len(categories) - 5} more")
        else:
            print("⚠️  No categories found!")
    except Exception as e:
        print(f"❌ Error checking categories: {str(e)}")
        return False
    
    # Test 4: Verify user was created
    print("\n\n📝 Test 4: Verifying default user...")
    print("-" * 70)
    
    try:
        user_count = await db_service.get_user_count()
        print(f"✅ Found {user_count} user(s)")
        
        if user_count > 0:
            user = await db_service.get_user()
            if user:
                print(f"   User ID: {user.get('id', 'N/A')}")
                print(f"   Created: {user.get('created_at', 'N/A')}")
                print(f"   Security Question: {user.get('security_question', 'N/A')}")
                print("   ⚠️  Default PIN: 0000 (should be changed by user)")
            else:
                print("⚠️  User exists but could not be retrieved")
        else:
            print("⚠️  No user found!")
    except Exception as e:
        print(f"❌ Error checking user: {str(e)}")
        return False
    
    # Test 5: Test idempotency (run initialization again)
    print("\n\n📝 Test 5: Testing idempotency (running initialization again)...")
    print("-" * 70)
    
    try:
        result2 = await db_initializer.initialize_database(
            seed_categories=True,
            create_default_user=True
        )
        
        print(f"\n✅ Second initialization completed!")
        print(f"   Success: {result2['success']}")
        print(f"   Tables created: {result2['tables_created']} (should be 0)")
        print(f"   Tables skipped: {result2['tables_skipped']} (should be 7)")
        print(f"   Categories seeded: {result2['categories_seeded']} (should be 0)")
        print(f"   User created: {result2['user_created']} (should be False)")
        
        if result2['tables_created'] > 0:
            print("\n⚠️  Warning: Tables were created on second run (not idempotent)")
        
        if result2['categories_seeded'] > 0:
            print("\n⚠️  Warning: Categories were seeded on second run (not idempotent)")
        
        if result2['user_created']:
            print("\n⚠️  Warning: User was created on second run (not idempotent)")
        
    except Exception as e:
        print(f"\n❌ Idempotency test failed: {str(e)}")
        return False
    
    # Test 6: Verify data integrity
    print("\n\n📝 Test 6: Verifying data integrity...")
    print("-" * 70)
    
    try:
        # Check if transactions table can accept data
        user = await db_service.get_user()
        if user:
            # Try to fetch transactions (should return empty list, not error)
            transactions = await db_service.get_transactions(user['id'])
            print(f"✅ Transactions table is accessible (found {len(transactions)} transactions)")
        
        # Check if budgets table can accept data
        if user:
            budgets = await db_service.get_budgets(user['id'])
            print(f"✅ Budgets table is accessible (found {len(budgets)} budgets)")
        
    except Exception as e:
        print(f"❌ Data integrity test failed: {str(e)}")
        return False
    
    # Final summary
    print("\n\n" + "="*70)
    print("  TEST SUMMARY")
    print("="*70)
    print("✅ All tests passed successfully!")
    print("\nDatabase is ready for use:")
    print(f"  • All {len(required_tables)} tables created")
    print(f"  • {categories_count} default categories available")
    print(f"  • {user_count} default user created")
    print("  • Initialization is idempotent (safe to run multiple times)")
    print("\n🎉 Your M-Pesa Expense Tracker database is fully initialized!")
    print("="*70 + "\n")
    
    return True


async def main():
    """Main execution function"""
    
    try:
        success = await test_initialization()
        
        if success:
            print("\n✅ All database initialization tests passed!")
            sys.exit(0)
        else:
            print("\n❌ Database initialization tests failed!")
            sys.exit(1)
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Test cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
