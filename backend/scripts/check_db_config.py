"""
Quick script to check PesaDB configuration
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables
backend_dir = Path(__file__).parent.parent
env_file = backend_dir / '.env'

print("\n" + "="*80)
print("PESADB CONFIGURATION CHECK")
print("="*80 + "\n")

# Check for .env file
if env_file.exists():
    print(f"✅ .env file found at: {env_file}")
    load_dotenv(env_file)
else:
    print(f"⚠️  No .env file found at: {env_file}")
    print("   Loading from system environment variables...")
    load_dotenv()

# Check configuration
api_url = os.environ.get('PESADB_API_URL')
api_key = os.environ.get('PESADB_API_KEY')
database = os.environ.get('PESADB_DATABASE')

print("\nConfiguration Status:")
print(f"  PESADB_API_URL:      {'✅ SET' if api_url else '❌ NOT SET'}")
if api_url:
    print(f"    Value: {api_url}")

print(f"  PESADB_API_KEY:      {'✅ SET' if api_key else '❌ NOT SET'}")
if api_key:
    print(f"    Value: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else ''} (masked)")

print(f"  PESADB_DATABASE:     {'✅ SET' if database else '❌ NOT SET'}")
if database:
    print(f"    Value: {database}")
else:
    print("    ⚠️  This will cause initialization to fail!")
    print("    Set with: export PESADB_DATABASE=your_database_name")

print("\n" + "="*80 + "\n")

if not database:
    print("❌ DATABASE NAME IS NOT SET!")
    print("\nTo fix this, you need to:")
    print("1. Create a .env file in the backend directory, OR")
    print("2. Set the environment variable directly:")
    print("   export PESADB_DATABASE=mpesa_tracker")
    print("\nExample .env file contents:")
    print("  PESADB_API_URL=https://your-pesadb-instance.com/api")
    print("  PESADB_API_KEY=your_api_key_here")
    print("  PESADB_DATABASE=mpesa_tracker")
    sys.exit(1)
else:
    print(f"✅ Database name is configured: {database}")
    print(f"\nMake sure this database exists in your PesaDB dashboard!")
    sys.exit(0)
