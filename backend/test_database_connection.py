#!/usr/bin/env python3
"""
Database Connection Test Script

This script tests the PesaDB connection and table creation
to help diagnose database initialization issues.

Usage:
    python backend/test_database_connection.py
"""

import asyncio
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config.pesadb import query_db, execute_db, config, database_exists, create_database
from services.database_initializer import db_initializer

async def test_connection():
    """Test basic PesaDB connection"""
    print("=" * 60)
    print("  PesaDB Connection Test")
    print("=" * 60)
    print()
    
    # Check configuration
    print("📋 Configuration:")
    print(f"  API URL: {config.api_url}")
    print(f"  Database: {config.database}")
    print(f"  API Key: {'✅ Set' if config.api_key else '❌ Not Set'}")
    print()
    
    if not config.api_key:
        print("❌ ERROR: PESADB_API_KEY environment variable is not set!")
        print("   Please set it in your .env file or environment")
        return False
    
    # Test 1: Database existence
    print("🔍 Test 1: Checking if database exists...")
    try:
        exists = await database_exists(config.database)
        if exists:
            print(f"✅ Database '{config.database}' exists")
        else:
            print(f"⚠️  Database '{config.database}' does not exist")
            print(f"📝 Attempting to create database...")
            await create_database(config.database)
            print(f"✅ Database '{config.database}' created")
    except Exception as e:
        print(f"❌ Error checking/creating database: {str(e)}")
        return False
    print()
    
    # Test 2: Create a simple test table
    print("🔍 Test 2: Creating a test table...")
    try:
        test_table_sql = """
        CREATE TABLE IF NOT EXISTS test_table (
            id STRING PRIMARY KEY,
            name STRING NOT NULL,
            value INT
        )
        """
        await execute_db(test_table_sql)
        print("✅ Test table created successfully")
    except Exception as e:
        print(f"❌ Error creating test table: {str(e)}")
        return False
    print()
    
    # Test 3: Query the test table
    print("🔍 Test 3: Querying test table...")
    try:
        result = await query_db("SELECT COUNT(*) as count FROM test_table")
        count = result[0]['count'] if result else 0
        print(f"✅ Test table query successful (count: {count})")
    except Exception as e:
        print(f"❌ Error querying test table: {str(e)}")
        return False
    print()
    
    # Test 4: Insert test data
    print("🔍 Test 4: Inserting test data...")
    try:
        await execute_db("INSERT INTO test_table (id, name, value) VALUES ('test1', 'Test Item', 42)")
        print("✅ Test data inserted successfully")
    except Exception as e:
        # This might fail if record already exists, which is OK
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            print("⚠️  Test data already exists (this is OK)")
        else:
            print(f"❌ Error inserting test data: {str(e)}")
            return False
    print()
    
    # Test 5: Query inserted data
    print("🔍 Test 5: Querying inserted data...")
    try:
        result = await query_db("SELECT * FROM test_table WHERE id = 'test1'")
        if result:
            print(f"✅ Test data retrieved: {result[0]}")
        else:
            print("⚠️  No test data found")
    except Exception as e:
        print(f"❌ Error querying test data: {str(e)}")
        return False
    print()
    
    # Test 6: Clean up test table
    print("🔍 Test 6: Cleaning up test table...")
    try:
        await execute_db("DROP TABLE test_table")
        print("✅ Test table dropped successfully")
    except Exception as e:
        print(f"⚠️  Error dropping test table: {str(e)} (this is OK)")
    print()
    
    return True


async def test_schema_creation():
    """Test the actual schema creation"""
    print("=" * 60)
    print("  Schema Creation Test")
    print("=" * 60)
    print()
    
    print("🔍 Testing schema initialization...")
    try:
        result = await db_initializer.initialize_database(
            seed_categories=False,  # Don't seed yet, just create tables
            create_default_user=False
        )
        
        print()
        print("📊 Initialization Results:")
        print(f"  Success: {result['success']}")
        print(f"  Database Created: {result['database_created']}")
        print(f"  Tables Created: {result['tables_created']}")
        print(f"  Tables Skipped: {result['tables_skipped']}")
        print(f"  Verified: {result['verified']}")
        print(f"  Message: {result['message']}")
        
        if result['errors']:
            print(f"\n⚠️  Errors ({len(result['errors'])}):")
            for i, error in enumerate(result['errors'][:10], 1):
                print(f"  {i}. {error}")
        
        print()
        
        if result['success']:
            print("✅ Schema initialization successful!")
            return True
        else:
            print("❌ Schema initialization failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error during schema initialization: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main test execution"""
    print("\n" + "=" * 60)
    print("  PesaDB Database Diagnostic Tool")
    print("  M-Pesa Expense Tracker")
    print("=" * 60 + "\n")
    
    try:
        # Run connection tests
        connection_ok = await test_connection()
        
        if not connection_ok:
            print("\n" + "=" * 60)
            print("  ❌ Connection tests failed!")
            print("  Please check your PESADB_API_KEY and API URL")
            print("=" * 60 + "\n")
            sys.exit(1)
        
        # Run schema creation tests
        schema_ok = await test_schema_creation()
        
        if not schema_ok:
            print("\n" + "=" * 60)
            print("  ❌ Schema creation failed!")
            print("  Please check the error messages above")
            print("=" * 60 + "\n")
            sys.exit(1)
        
        print("\n" + "=" * 60)
        print("  ✅ All tests passed!")
        print("  Your database is ready to use.")
        print("=" * 60 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Tests failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
