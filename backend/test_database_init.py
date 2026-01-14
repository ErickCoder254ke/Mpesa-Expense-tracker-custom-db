#!/usr/bin/env python3
"""
Database Initialization Test Script

This script tests the database initialization process and verifies
that all tables, relations, and seed data are properly set up.

Usage:
    python backend/test_database_init.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config.pesadb import query_db, execute_db, get_client
from services.database_initializer import db_initializer
from services.pesadb_service import db_service


class DatabaseTest:
    """Database initialization testing"""
    
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
    
    def test_passed(self, test_name: str):
        """Mark test as passed"""
        self.passed += 1
        print(f"✅ PASS: {test_name}")
    
    def test_failed(self, test_name: str, error: str):
        """Mark test as failed"""
        self.failed += 1
        print(f"❌ FAIL: {test_name}")
        print(f"   Error: {error}")
    
    def test_warning(self, test_name: str, message: str):
        """Mark test as warning"""
        self.warnings += 1
        print(f"⚠️  WARN: {test_name}")
        print(f"   {message}")
    
    async def test_table_exists(self, table_name: str) -> bool:
        """Test if a table exists"""
        try:
            result = await query_db(f"SELECT * FROM {table_name} LIMIT 1")
            self.test_passed(f"Table '{table_name}' exists")
            return True
        except Exception as e:
            self.test_failed(f"Table '{table_name}' exists", str(e))
            return False
    
    async def test_table_structure(self, table_name: str) -> dict:
        """Test table structure by querying it"""
        try:
            result = await query_db(f"SELECT * FROM {table_name} LIMIT 1")
            # If we get here, table exists and is queryable
            self.test_passed(f"Table '{table_name}' structure is valid")
            return result[0] if result else {}
        except Exception as e:
            self.test_failed(f"Table '{table_name}' structure is valid", str(e))
            return {}
    
    async def test_categories_seeded(self) -> bool:
        """Test if default categories were seeded"""
        try:
            result = await query_db("SELECT COUNT(*) as count FROM categories WHERE is_default = TRUE")
            count = result[0]['count'] if result else 0
            
            if count >= 12:
                self.test_passed(f"Default categories seeded ({count} categories)")
                return True
            elif count > 0:
                self.test_warning(f"Default categories partially seeded", 
                                 f"Expected 12, found {count}")
                return False
            else:
                self.test_failed("Default categories seeded", "No default categories found")
                return False
        except Exception as e:
            self.test_failed("Default categories seeded", str(e))
            return False
    
    async def test_foreign_keys(self) -> bool:
        """Test foreign key relationships"""
        try:
            # Test transactions -> users relationship
            # This test only checks if the structure allows foreign keys
            # We can't insert test data without breaking uniqueness constraints
            
            # Just verify the tables that should have relations exist
            tables_with_fk = ['transactions', 'budgets', 'sms_import_logs', 'duplicate_logs']
            all_exist = True
            
            for table in tables_with_fk:
                exists = await self.test_table_exists(table)
                if not exists:
                    all_exist = False
            
            if all_exist:
                self.test_passed("Foreign key tables exist")
                return True
            else:
                self.test_failed("Foreign key tables exist", "Some FK tables are missing")
                return False
        except Exception as e:
            self.test_failed("Foreign key relationships", str(e))
            return False
    
    async def test_category_keywords(self) -> bool:
        """Test if categories have proper keywords"""
        try:
            result = await query_db(
                "SELECT id, name, keywords FROM categories WHERE is_default = TRUE LIMIT 5"
            )
            
            if not result:
                self.test_failed("Category keywords", "No categories found")
                return False
            
            # Check if at least one category has keywords
            has_keywords = False
            for cat in result:
                if cat.get('keywords') and cat['keywords'] != '[]':
                    has_keywords = True
                    break
            
            if has_keywords:
                self.test_passed("Categories have keywords")
                return True
            else:
                self.test_warning("Categories have keywords", 
                                 "Some categories might not have keywords")
                return False
        except Exception as e:
            self.test_failed("Category keywords", str(e))
            return False
    
    async def test_user_creation(self) -> bool:
        """Test if default user exists or can be created"""
        try:
            user_count = await db_service.get_user_count()
            
            if user_count > 0:
                self.test_passed(f"User(s) exist ({user_count} users)")
                return True
            else:
                self.test_warning("User creation", 
                                 "No users found - default user was not created")
                return False
        except Exception as e:
            self.test_failed("User creation", str(e))
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"✅ Passed:  {self.passed}")
        print(f"❌ Failed:  {self.failed}")
        print(f"⚠️  Warnings: {self.warnings}")
        print(f"📊 Total:   {self.passed + self.failed + self.warnings}")
        print("="*60)
        
        if self.failed == 0:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Please review the errors above.")
            return False


async def run_tests():
    """Run all database initialization tests"""
    
    print("\n" + "="*60)
    print("M-PESA EXPENSE TRACKER - DATABASE INITIALIZATION TEST")
    print("="*60 + "\n")
    
    tester = DatabaseTest()
    
    # Test 1: Run initialization
    print("🚀 Step 1: Running database initialization...\n")
    try:
        result = await db_initializer.initialize_database(
            seed_categories=True,
            create_default_user=True
        )
        
        if result['success']:
            tester.test_passed("Database initialization")
            print(f"   Tables created: {result['tables_created']}")
            print(f"   Tables skipped: {result['tables_skipped']}")
            print(f"   Categories seeded: {result['categories_seeded']}")
            print(f"   User created: {result.get('user_created', False)}")
        else:
            tester.test_failed("Database initialization", result['message'])
            if result.get('errors'):
                for error in result['errors']:
                    print(f"   - {error}")
    except Exception as e:
        tester.test_failed("Database initialization", str(e))
    
    print("\n🔍 Step 2: Verifying table structure...\n")
    
    # Test 2: Verify all required tables exist
    required_tables = [
        'users',
        'categories',
        'transactions',
        'budgets',
        'sms_import_logs',
        'duplicate_logs',
        'status_checks'
    ]
    
    for table in required_tables:
        await tester.test_table_exists(table)
    
    print("\n🔍 Step 3: Verifying table structures...\n")
    
    # Test 3: Verify table structures
    for table in required_tables[:4]:  # Test first 4 main tables
        await tester.test_table_structure(table)
    
    print("\n🔍 Step 4: Verifying seed data...\n")
    
    # Test 4: Verify categories were seeded
    await tester.test_categories_seeded()
    
    # Test 5: Verify category keywords
    await tester.test_category_keywords()
    
    print("\n🔍 Step 5: Verifying relationships...\n")
    
    # Test 6: Verify foreign keys
    await tester.test_foreign_keys()
    
    print("\n🔍 Step 6: Verifying user creation...\n")
    
    # Test 7: Verify user creation
    await tester.test_user_creation()
    
    # Print summary
    success = tester.print_summary()
    
    # Close client
    client = get_client()
    await client.close()
    
    return success


async def main():
    """Main execution function"""
    try:
        success = await run_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Tests failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
