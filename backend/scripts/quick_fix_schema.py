#!/usr/bin/env python3
"""
Quick Fix Script for Schema Issues

This script quickly fixes the email column error by:
1. Checking the schema
2. Automatically fixing it if needed
3. Verifying the fix

Run this if you see: "column 'email' does not exist in table 'users'"
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from services.database_initializer import DatabaseInitializer
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def quick_fix():
    """Quick fix for schema issues"""
    
    print("\n" + "="*70)
    print("  Quick Fix: Database Schema")
    print("  M-Pesa Expense Tracker")
    print("="*70 + "\n")
    
    try:
        # Check schema
        logger.info("🔍 Checking users table schema...")
        schema_check = await DatabaseInitializer.check_users_table_schema()
        
        if not schema_check['exists']:
            logger.info("✅ Users table doesn't exist yet - will be created automatically")
            logger.info("   Just restart your backend server")
            return True
        
        if schema_check['has_correct_schema']:
            logger.info("✅ Users table already has the correct schema")
            logger.info("   No fix needed! Your database is fine.")
            return True
        
        # Schema needs migration
        logger.warning("⚠️  Detected old schema - needs migration")
        logger.warning(f"   Has email column: {schema_check['has_email']}")
        logger.warning(f"   Has password_hash column: {schema_check['has_password_hash']}")
        
        # Migrate
        logger.info("\n🔄 Starting automatic migration...")
        success = await DatabaseInitializer.migrate_users_table()
        
        if success:
            logger.info("\n✅ Schema fixed successfully!")
            logger.info("   You can now use signup/login with email and password")
            logger.info("\n📝 Next steps:")
            logger.info("   1. Restart your backend server if it's running")
            logger.info("   2. Create a new user account via signup")
            logger.info("   3. Login with your email and password")
            return True
        else:
            logger.error("\n❌ Migration failed")
            logger.error("   Please check the logs above for details")
            logger.error("\n💡 Alternative: Run the full migration script:")
            logger.error("   python backend/scripts/migrate_to_email_auth.py")
            return False
        
    except Exception as e:
        logger.error(f"\n❌ Quick fix failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main execution"""
    
    print("🚀 Running quick fix for schema issues...")
    print()
    
    success = await quick_fix()
    
    if success:
        print("\n🎉 All done! Your database schema is correct.")
    else:
        print("\n⚠️  Quick fix did not complete successfully")
        print("   Please see the errors above for details")
    
    return success


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
