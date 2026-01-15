#!/usr/bin/env python3
"""
Database Migration Script: PIN Authentication → Email/Password Authentication

This script migrates the users table from the old PIN-based authentication
to the new email/password authentication schema.

Migration Steps:
1. Check current users table schema
2. Drop the old users table (if using old schema)
3. Create new users table with email/password columns
4. Verify the new schema

IMPORTANT: This will DELETE all existing users! Run only if you're sure.
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from config.pesadb import query_db, execute_db
from services.database_initializer import DatabaseInitializer
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def check_current_schema():
    """Check what the current users table schema looks like"""
    print("\n🔍 Checking current users table schema...")
    
    try:
        # Try to query the users table
        result = await query_db("SELECT * FROM users LIMIT 1")
        
        if result and len(result) > 0:
            columns = list(result[0].keys())
            print(f"✅ Users table exists with columns: {columns}")
            
            has_email = 'email' in columns
            has_password_hash = 'password_hash' in columns
            has_phone_number = 'phone_number' in columns
            has_pin_hash = 'pin_hash' in columns
            
            return {
                'exists': True,
                'columns': columns,
                'has_email': has_email,
                'has_password_hash': has_password_hash,
                'has_phone_number': has_phone_number,
                'has_pin_hash': has_pin_hash,
                'is_old_schema': has_phone_number or has_pin_hash,
                'is_new_schema': has_email and has_password_hash
            }
        else:
            print("ℹ️  Users table exists but is empty")
            # Table exists but empty - we can't determine schema
            # Try a query to check columns
            try:
                await query_db("SELECT email FROM users LIMIT 1")
                print("✅ Users table has 'email' column")
                has_email = True
            except:
                has_email = False
            
            return {
                'exists': True,
                'columns': ['unknown - table is empty'],
                'has_email': has_email,
                'needs_migration': not has_email
            }
            
    except Exception as e:
        error_msg = str(e).lower()
        if 'does not exist' in error_msg or 'not found' in error_msg:
            print("ℹ️  Users table does not exist yet")
            return {
                'exists': False,
                'columns': [],
                'needs_migration': False
            }
        elif 'email' in error_msg and 'does not exist' in error_msg:
            print("⚠️  Users table exists but missing 'email' column - OLD SCHEMA DETECTED")
            return {
                'exists': True,
                'columns': ['unknown'],
                'has_email': False,
                'has_password_hash': False,
                'is_old_schema': True,
                'is_new_schema': False,
                'needs_migration': True
            }
        else:
            print(f"❌ Error checking schema: {str(e)}")
            raise


async def drop_users_table():
    """Drop the users table"""
    print("\n⚠️  Dropping users table...")
    
    try:
        await execute_db("DROP TABLE users")
        print("✅ Users table dropped successfully")
        return True
    except Exception as e:
        error_msg = str(e).lower()
        if 'does not exist' in error_msg or 'not found' in error_msg:
            print("ℹ️  Users table did not exist (already dropped or never created)")
            return True
        else:
            print(f"❌ Error dropping users table: {str(e)}")
            raise


async def create_new_users_table():
    """Create users table with new email/password schema"""
    print("\n📝 Creating users table with email/password schema...")
    
    create_statement = """CREATE TABLE users (
    id STRING PRIMARY KEY,
    email STRING,
    password_hash STRING,
    name STRING,
    created_at STRING,
    preferences STRING
)"""
    
    try:
        await execute_db(create_statement)
        print("✅ Users table created with email/password schema")
        return True
    except Exception as e:
        print(f"❌ Error creating users table: {str(e)}")
        raise


async def verify_new_schema():
    """Verify the new schema is correct"""
    print("\n🔍 Verifying new schema...")
    
    try:
        # Try to query with email column
        await query_db("SELECT id, email, password_hash FROM users LIMIT 1")
        print("✅ New schema verified - users table has email and password_hash columns")
        return True
    except Exception as e:
        print(f"❌ Schema verification failed: {str(e)}")
        return False


async def migrate():
    """Main migration function"""
    
    print("\n" + "="*70)
    print("  Database Migration: PIN → Email/Password Authentication")
    print("  M-Pesa Expense Tracker")
    print("="*70 + "\n")
    
    print("⚠️  WARNING: This migration will DELETE all existing users!")
    print("⚠️  You will need to create new user accounts after migration.")
    print()
    
    # Check current schema
    schema_info = await check_current_schema()
    
    if not schema_info['exists']:
        print("\n✅ Users table does not exist yet - no migration needed")
        print("   The table will be created automatically with the correct schema on server startup")
        return True
    
    if schema_info.get('is_new_schema'):
        print("\n✅ Users table already has the new email/password schema")
        print("   No migration needed!")
        return True
    
    if not schema_info.get('is_old_schema') and not schema_info.get('needs_migration'):
        print("\n⚠️  Cannot determine if migration is needed")
        print("   The table schema is unclear - please verify manually")
        return False
    
    print("\n❌ OLD SCHEMA DETECTED - Migration required!")
    print(f"   Current columns: {schema_info.get('columns', 'unknown')}")
    print()
    
    # Ask for confirmation
    response = input("Do you want to proceed with the migration? (yes/no): ").lower()
    if response not in ['yes', 'y']:
        print("\n⚠️  Migration cancelled by user")
        return False
    
    print("\n🚀 Starting migration...")
    
    try:
        # Step 1: Drop old users table
        await drop_users_table()
        
        # Step 2: Create new users table
        await create_new_users_table()
        
        # Step 3: Verify new schema
        verified = await verify_new_schema()
        
        if not verified:
            print("\n❌ Migration completed but verification failed")
            print("   Please check the database manually")
            return False
        
        print("\n" + "="*70)
        print("  ✅ Migration Completed Successfully!")
        print("="*70)
        print()
        print("Next steps:")
        print("  1. Restart your backend server")
        print("  2. The server will auto-initialize with default categories")
        print("  3. Create new user accounts through the signup endpoint")
        print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main execution function"""
    
    try:
        success = await migrate()
        
        if success:
            print("🎉 Database migration completed successfully!")
            return True
        else:
            print("⚠️  Migration was not completed")
            return False
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration cancelled by user")
        return False
    except Exception as e:
        print(f"\n\n❌ Migration failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
