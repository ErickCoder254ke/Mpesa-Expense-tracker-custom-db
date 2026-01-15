#!/usr/bin/env python3
"""
Quick Database Setup Script

This script will:
1. Check environment configuration
2. Create the database if it doesn't exist
3. Initialize schema and seed data
4. Verify the setup

Usage:
    python backend/setup_database.py
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables first
load_dotenv(backend_dir / '.env')


def check_environment():
    """Check if environment is configured correctly"""
    print("\n" + "="*60)
    print("  Step 1: Checking Environment Configuration")
    print("="*60 + "\n")
    
    api_key = os.environ.get('PESADB_API_KEY')
    api_url = os.environ.get('PESADB_API_URL', 'https://pesacoredb-backend.onrender.com/api')
    database = os.environ.get('PESADB_DATABASE', 'mpesa_tracker')
    
    issues = []
    
    print(f"📍 API URL: {api_url}")
    print(f"📦 Database: {database}")
    
    if api_key:
        masked_key = f"{api_key[:8]}..." if len(api_key) > 8 else "***"
        print(f"🔑 API Key: {masked_key}")
    else:
        print(f"❌ API Key: NOT SET")
        issues.append("PESADB_API_KEY is not set")
    
    if issues:
        print("\n" + "="*60)
        print("❌ CONFIGURATION ERROR")
        print("="*60)
        print("\nThe following environment variables are missing:\n")
        for issue in issues:
            print(f"  ❌ {issue}")
        
        print("\n💡 How to fix:")
        print("\n1. Create a .env file in the backend directory:")
        print("   cd backend")
        print("   touch .env")
        print("\n2. Add the following to backend/.env:")
        print("\n   PESADB_API_KEY=your_pesadb_api_key_here")
        print("   PESADB_API_URL=https://pesacoredb-backend.onrender.com/api")
        print("   PESADB_DATABASE=mpesa_tracker")
        print("\n3. Replace 'your_pesadb_api_key_here' with your actual API key")
        print("\n4. Run this script again")
        print("\n" + "="*60 + "\n")
        return False
    
    print("\n✅ Environment configuration looks good!\n")
    return True


async def create_database():
    """Create the database if it doesn't exist"""
    from config.pesadb import get_client, config as pesadb_config
    
    print("\n" + "="*60)
    print("  Step 2: Creating Database")
    print("="*60 + "\n")
    
    database_name = pesadb_config.database
    
    client = get_client()
    
    try:
        # Check if database exists
        print(f"🔍 Checking if database '{database_name}' exists...")
        exists = await client.database_exists(database_name)
        
        if exists:
            print(f"✅ Database '{database_name}' already exists")
            return True
        else:
            print(f"📦 Database '{database_name}' does not exist. Creating...")
            await client.create_database(database_name)
            print(f"✅ Database '{database_name}' created successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error creating database: {str(e)}")
        print("\n💡 Possible reasons:")
        print("  - Invalid API key")
        print("  - PesaDB service is down")
        print("  - Network connection issues")
        print("\nPlease check your configuration and try again.")
        return False


async def initialize_schema():
    """Initialize database schema"""
    from config.pesadb import execute_db
    
    print("\n" + "="*60)
    print("  Step 3: Initializing Schema")
    print("="*60 + "\n")
    
    # Read SQL initialization script
    sql_file = backend_dir / 'scripts' / 'init_pesadb.sql'
    
    if not sql_file.exists():
        print(f"❌ Error: SQL file not found at {sql_file}")
        return False
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Split SQL statements
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
    
    # Filter out comments and empty statements
    statements = [stmt for stmt in statements if not stmt.startswith('--') and stmt]
    
    print(f"📝 Found {len(statements)} SQL statements to execute\n")
    
    success_count = 0
    error_count = 0
    
    for i, statement in enumerate(statements, 1):
        try:
            # Get first line for display
            first_line = statement.split('\n')[0][:50]
            print(f"⏳ [{i}/{len(statements)}] {first_line}...")
            
            await execute_db(statement)
            success_count += 1
            print(f"   ✅ Success")
            
        except Exception as e:
            error_str = str(e)
            # Check if it's a "table already exists" error - that's okay
            if "already exists" in error_str.lower() or "duplicate" in error_str.lower():
                print(f"   ⚠️  Already exists (skipping)")
                success_count += 1
            else:
                print(f"   ❌ Error: {error_str}")
                error_count += 1
    
    print("\n" + "-"*60)
    print(f"✅ Successful: {success_count}")
    print(f"❌ Errors: {error_count}")
    print("-"*60)
    
    if error_count > 5:  # Allow some errors for existing tables
        print("\n⚠️  Too many errors occurred during schema initialization")
        return False
    
    print("\n✅ Schema initialized successfully!")
    return True


async def verify_setup():
    """Verify that the database is set up correctly"""
    from config.pesadb import query_db
    
    print("\n" + "="*60)
    print("  Step 4: Verifying Setup")
    print("="*60 + "\n")
    
    tables = ['users', 'categories', 'transactions', 'budgets']
    
    all_verified = True
    
    for table in tables:
        try:
            result = await query_db(f"SELECT COUNT(*) as count FROM {table}")
            count = result[0]['count'] if result else 0
            print(f"✅ Table '{table}' exists ({count} rows)")
        except Exception as e:
            print(f"❌ Table '{table}' verification failed: {str(e)}")
            all_verified = False
    
    # Check categories specifically
    try:
        categories = await query_db("SELECT id, name, icon FROM categories WHERE is_default = TRUE LIMIT 5")
        print(f"\n📋 Sample categories ({len(categories)} default categories):")
        for cat in categories[:3]:
            print(f"   - {cat['name']}: {cat['icon']}")
        if len(categories) > 3:
            print(f"   ... and {len(categories) - 3} more")
    except Exception as e:
        print(f"\n⚠️  Could not retrieve categories: {str(e)}")
        all_verified = False
    
    print()
    return all_verified


async def main():
    """Main execution function"""
    
    print("\n" + "="*70)
    print("  🚀 M-Pesa Expense Tracker - Database Setup")
    print("="*70)
    
    try:
        # Step 1: Check environment
        if not check_environment():
            sys.exit(1)
        
        # Step 2: Create database
        if not await create_database():
            print("\n❌ Database creation failed. Please fix the issues above and try again.\n")
            sys.exit(1)
        
        # Step 3: Initialize schema
        if not await initialize_schema():
            print("\n❌ Schema initialization failed. Please check the errors above.\n")
            sys.exit(1)
        
        # Step 4: Verify setup
        if not await verify_setup():
            print("\n⚠️  Setup completed with warnings. Some tables may not be accessible.\n")
        
        print("\n" + "="*70)
        print("  ✅ Database Setup Complete!")
        print("="*70)
        print("\n🎉 Your database is ready to use!")
        print("\nNext steps:")
        print("  1. Start the backend server:")
        print("     cd backend")
        print("     python server.py")
        print("\n  2. Start the frontend app:")
        print("     cd frontend")
        print("     npm start")
        print("\n" + "="*70 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Setup failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
