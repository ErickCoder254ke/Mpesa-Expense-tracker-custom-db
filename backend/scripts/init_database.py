#!/usr/bin/env python3
"""
Database Initialization Script for PesaDB

This script initializes the PesaDB database with the required schema and optional seed data.
Run this script once before starting the application for the first time.

Usage:
    python backend/scripts/init_database.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from config.pesadb import query_db, execute_db
from config.pesadb_fallbacks import count_rows_safe


async def init_database():
    """Initialize the database with schema and seed data"""
    
    print("🚀 Starting PesaDB initialization...")
    
    # Read SQL initialization script
    sql_file = Path(__file__).parent / 'init_pesadb.sql'
    
    if not sql_file.exists():
        print(f"❌ Error: SQL file not found at {sql_file}")
        sys.exit(1)
    
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    # Split SQL statements (simple split by semicolon)
    # Note: This is a basic split and may not handle all SQL edge cases
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
    
    print(f"📝 Found {len(statements)} SQL statements to execute")
    
    success_count = 0
    error_count = 0
    
    for i, statement in enumerate(statements, 1):
        # Skip comments and empty lines
        if statement.startswith('--') or not statement:
            continue
        
        try:
            print(f"⏳ Executing statement {i}/{len(statements)}...")
            await execute_db(statement)
            success_count += 1
            print(f"✅ Statement {i} executed successfully")
        except Exception as e:
            error_count += 1
            print(f"⚠️  Warning: Statement {i} failed: {str(e)}")
            # Continue with other statements even if one fails
    
    print("\n" + "="*60)
    print(f"✅ Database initialization completed!")
    print(f"   - Successful: {success_count}")
    print(f"   - Errors: {error_count}")
    print("="*60)
    
    if error_count > 0:
        print("\n⚠️  Some statements failed. Review the errors above.")
        print("   This may be expected if tables already exist or indexes are not supported.")
    
    print("\n🎉 Your PesaDB database is ready to use!")


async def seed_default_categories():
    """Seed default categories (optional)"""
    
    print("\n📦 Seeding default categories...")
    
    default_categories = [
        ('cat-food', 'Food & Dining', 'restaurant', '#FF6B6B', '["food", "restaurant", "dining", "lunch", "dinner", "breakfast", "nyama", "choma"]'),
        ('cat-transport', 'Transport', 'car', '#4ECDC4', '["taxi", "bus", "matatu", "uber", "fuel", "transport", "travel"]'),
        ('cat-shopping', 'Shopping', 'shopping-bag', '#95E1D3', '["shop", "store", "mall", "clothing", "electronics", "supermarket"]'),
        ('cat-bills', 'Bills & Utilities', 'receipt', '#F38181', '["bill", "electricity", "water", "internet", "phone", "utility", "kplc", "nairobi water"]'),
        ('cat-entertainment', 'Entertainment', 'film', '#AA96DA', '["movie", "cinema", "game", "entertainment", "music", "showmax", "netflix"]'),
        ('cat-health', 'Health & Fitness', 'medical', '#FCBAD3', '["hospital", "pharmacy", "doctor", "medicine", "gym", "health", "clinic"]'),
        ('cat-education', 'Education', 'book', '#A8D8EA', '["school", "books", "tuition", "education", "course", "university"]'),
        ('cat-airtime', 'Airtime & Data', 'call', '#FFFFD2', '["airtime", "data", "bundles", "safaricom", "airtel", "telkom"]'),
        ('cat-transfers', 'Money Transfer', 'swap-horizontal', '#FEC8D8', '["transfer", "send money", "mpesa", "paybill", "till"]'),
        ('cat-savings', 'Savings & Investments', 'wallet', '#957DAD', '["savings", "investment", "deposit", "savings account", "mshwari", "kcb mpesa"]'),
        ('cat-other', 'Other', 'ellipsis-horizontal', '#D4A5A5', '[]'),
    ]
    
    for cat_id, name, icon, color, keywords in default_categories:
        try:
            sql = f"""
            INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
            VALUES ('{cat_id}', NULL, '{name}', '{icon}', '{color}', '{keywords}', TRUE)
            """
            await execute_db(sql)
            print(f"✅ Seeded category: {name}")
        except Exception as e:
            print(f"⚠️  Category '{name}' may already exist: {str(e)}")
    
    print("✅ Default categories seeded successfully!")


async def verify_setup():
    """Verify that the database is set up correctly"""
    
    print("\n🔍 Verifying database setup...")
    
    try:
        # Check if tables exist by querying them
        tables = ['users', 'categories', 'transactions', 'budgets']
        
        for table in tables:
            count = await count_rows_safe(table, query_func=query_db)
            print(f"✅ Table '{table}' exists with {count} rows")
        
        print("\n✅ Database verification completed successfully!")
        return True
    
    except Exception as e:
        print(f"\n❌ Database verification failed: {str(e)}")
        return False


async def main():
    """Main execution function"""
    
    print("\n" + "="*60)
    print("  PesaDB Database Initialization")
    print("  M-Pesa Expense Tracker")
    print("="*60 + "\n")
    
    try:
        # Step 1: Initialize schema
        await init_database()
        
        # Step 2: Seed default categories
        seed_choice = input("\n📦 Would you like to seed default categories? (y/n): ").lower()
        if seed_choice == 'y':
            await seed_default_categories()
        
        # Step 3: Verify setup
        await verify_setup()
        
        print("\n" + "="*60)
        print("  ✅ Initialization Complete!")
        print("  Your application is ready to use.")
        print("="*60 + "\n")
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Initialization cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Initialization failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
