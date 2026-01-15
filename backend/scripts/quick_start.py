"""
Quick Start Script for M-Pesa Expense Tracker Backend

This script provides a streamlined way to:
1. Verify environment configuration
2. Check database connectivity
3. Verify and initialize database schema
4. Start the server

Usage:
    python backend/scripts/quick_start.py [options]

Options:
    --skip-verification: Skip database verification step
    --repair: Repair database if issues are found
    --no-server: Don't start the server (just verify setup)
"""

import asyncio
import sys
import os
import argparse
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def check_environment():
    """Check if required environment variables are set"""
    print("\n" + "="*80)
    print("STEP 1: ENVIRONMENT VERIFICATION")
    print("="*80 + "\n")
    
    required_vars = {
        'PESADB_API_KEY': 'PesaDB API Key (required for database access)',
        'JWT_SECRET_KEY': 'JWT Secret Key (required for authentication)',
    }
    
    optional_vars = {
        'PESADB_API_URL': ('PesaDB API URL', 'https://pesacoredb-backend.onrender.com/api'),
        'PESADB_DATABASE': ('Database name', 'mpesa_tracker'),
        'JWT_ALGORITHM': ('JWT Algorithm', 'HS256'),
        'JWT_EXPIRATION_MINUTES': ('JWT Token expiration (minutes)', '1440'),
    }
    
    all_ok = True
    
    # Check required variables
    print("Required Environment Variables:")
    for var, description in required_vars.items():
        value = os.environ.get(var)
        if value:
            masked_value = value[:8] + "..." if len(value) > 8 else "***"
            print(f"  ✅ {var}: {masked_value}")
        else:
            print(f"  ❌ {var}: NOT SET")
            print(f"     {description}")
            all_ok = False
    
    print("\nOptional Environment Variables (using defaults if not set):")
    for var, (description, default) in optional_vars.items():
        value = os.environ.get(var)
        if value:
            print(f"  ✅ {var}: {value}")
        else:
            print(f"  ⚪ {var}: using default '{default}'")
    
    if not all_ok:
        print("\n❌ Some required environment variables are missing!")
        print("\nPlease create a .env file in the backend/ directory with:")
        print("\nPESADB_API_KEY=your_api_key_here")
        print("JWT_SECRET_KEY=your_secret_key_here")
        print("\nSee env.txt for a complete example.")
        return False
    
    print("\n✅ Environment configuration is valid")
    return True


async def test_database_connectivity():
    """Test if we can connect to PesaDB"""
    print("\n" + "="*80)
    print("STEP 2: DATABASE CONNECTIVITY TEST")
    print("="*80 + "\n")
    
    try:
        from backend.config.pesadb import query_db, config
        
        print(f"Testing connection to: {config.api_url}")
        print(f"Database: {config.database}")
        
        # Try a simple query - we don't care if the table exists yet
        try:
            await query_db("SELECT * FROM users LIMIT 1")
            print("✅ Successfully connected to PesaDB")
            return True
        except Exception as e:
            error_msg = str(e).lower()
            if 'table' in error_msg and ('not found' in error_msg or 'does not exist' in error_msg):
                # This is expected if database isn't initialized yet
                print("✅ Successfully connected to PesaDB (database not initialized yet)")
                return True
            else:
                # This is a real connection error
                print(f"❌ Failed to connect to PesaDB: {e}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing database connectivity: {e}")
        return False


async def verify_database_schema(repair: bool = False):
    """Verify database schema and optionally repair"""
    print("\n" + "="*80)
    print("STEP 3: DATABASE SCHEMA VERIFICATION")
    print("="*80 + "\n")
    
    try:
        from backend.scripts.verify_database_schema import SchemaVerifier
        
        print("Verifying all tables...")
        results = await SchemaVerifier.verify_all_tables(verbose=False)
        
        print("\nVerification Results:")
        all_valid = True
        for table_name, result in results.items():
            status_icon = "✅" if result['valid_schema'] and result['exists'] else "❌"
            print(f"  {status_icon} {table_name}: {result['status']}")
            
            if not result['valid_schema'] or not result['exists']:
                all_valid = False
                if result['missing_columns']:
                    print(f"     Missing columns: {', '.join(result['missing_columns'])}")
        
        if all_valid:
            print("\n✅ All tables are present and have correct schema")
            return True
        else:
            print("\n⚠️  Some tables are missing or have schema issues")
            
            if repair:
                print("\n🔧 Attempting to repair database...")
                success = await SchemaVerifier.repair_database(force_recreate=False)
                
                if success:
                    print("✅ Database repair completed")
                    
                    # Re-verify
                    print("\nRe-verifying schema...")
                    results = await SchemaVerifier.verify_all_tables(verbose=False)
                    all_valid_after = all(r['valid_schema'] and r['exists'] for r in results.values())
                    
                    if all_valid_after:
                        print("✅ All tables are now valid")
                        return True
                    else:
                        print("⚠️  Some issues remain after repair")
                        return False
                else:
                    print("❌ Database repair failed")
                    return False
            else:
                print("\nRun with --repair flag to automatically fix issues:")
                print("  python backend/scripts/quick_start.py --repair")
                return False
                
    except Exception as e:
        print(f"❌ Error verifying database schema: {e}")
        import traceback
        traceback.print_exc()
        return False


async def check_pesadb_capabilities():
    """Check what aggregate functions PesaDB supports"""
    print("\n" + "="*80)
    print("STEP 4: PESADB CAPABILITIES CHECK")
    print("="*80 + "\n")
    
    try:
        from backend.config.pesadb_fallbacks import detect_pesadb_capabilities
        
        print("Detecting PesaDB capabilities...")
        capabilities = await detect_pesadb_capabilities()
        
        print("\nAggregate Function Support:")
        for func, supported in capabilities.items():
            status = "✅ Supported" if supported else "⚠️  Not supported (using fallback)"
            print(f"  {func.upper():15} {status}")
        
        if not capabilities.get('count'):
            print("\n⚠️  Note: COUNT aggregates not supported")
            print("   The application will automatically use in-memory counting")
            print("   This is slower but functional for <10,000 rows")
        
        return True
        
    except Exception as e:
        print(f"⚠️  Could not detect PesaDB capabilities: {e}")
        print("   This is not critical - the application will adapt automatically")
        return True


def start_server():
    """Start the FastAPI server"""
    print("\n" + "="*80)
    print("STEP 5: STARTING SERVER")
    print("="*80 + "\n")
    
    print("Starting FastAPI server on http://0.0.0.0:8000")
    print("API endpoints will be available at http://0.0.0.0:8000/api/")
    print("\nPress Ctrl+C to stop the server\n")
    
    import uvicorn
    from backend.server import app
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


async def run_checks(skip_verification: bool = False, repair: bool = False, no_server: bool = False):
    """Run all checks and start server"""
    
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*20 + "M-PESA EXPENSE TRACKER BACKEND" + " "*28 + "║")
    print("║" + " "*25 + "Quick Start Script" + " "*35 + "║")
    print("╚" + "="*78 + "╝")
    
    # Step 1: Check environment
    env_ok = await check_environment()
    if not env_ok:
        print("\n❌ Setup failed: Environment configuration issues")
        return False
    
    # Step 2: Test database connectivity
    db_ok = await test_database_connectivity()
    if not db_ok:
        print("\n❌ Setup failed: Cannot connect to database")
        return False
    
    # Step 3: Verify database schema (unless skipped)
    if not skip_verification:
        schema_ok = await verify_database_schema(repair=repair)
        if not schema_ok and not repair:
            print("\n⚠️  Database schema has issues - run with --repair to fix")
            return False
    else:
        print("\n⚠️  Skipped database verification (--skip-verification flag)")
    
    # Step 4: Check PesaDB capabilities
    await check_pesadb_capabilities()
    
    # Final summary
    print("\n" + "="*80)
    print("SETUP COMPLETE")
    print("="*80 + "\n")
    
    print("✅ Environment configured")
    print("✅ Database connected")
    print("✅ Schema verified" if not skip_verification else "⚠️  Schema verification skipped")
    print("✅ Ready to start")
    
    if no_server:
        print("\n✅ Setup verification complete (--no-server flag)")
        print("\nTo start the server manually:")
        print("  python backend/server.py")
        print("  or")
        print("  uvicorn backend.server:app --reload")
        return True
    
    # Step 5: Start server
    start_server()
    
    return True


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Quick start script for M-Pesa Expense Tracker backend'
    )
    parser.add_argument('--skip-verification', action='store_true',
                       help='Skip database schema verification')
    parser.add_argument('--repair', action='store_true',
                       help='Repair database if issues are found')
    parser.add_argument('--no-server', action='store_true',
                       help="Don't start the server (just verify setup)")
    
    args = parser.parse_args()
    
    try:
        success = await run_checks(
            skip_verification=args.skip_verification,
            repair=args.repair,
            no_server=args.no_server
        )
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Startup cancelled by user")
        return 1
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
