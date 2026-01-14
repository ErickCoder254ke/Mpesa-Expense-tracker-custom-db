#!/usr/bin/env python3
"""
Environment Configuration Checker

This script verifies that all required environment variables are set
and provides helpful feedback for configuration issues.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / '.env')

def check_environment():
    """Check all required environment variables"""
    
    print("\n" + "="*60)
    print("  M-Pesa Expense Tracker - Environment Check")
    print("="*60 + "\n")
    
    issues = []
    warnings = []
    
    # Required variables
    required_vars = {
        'PESADB_API_KEY': 'Your PesaDB API key',
    }
    
    # Optional variables with defaults
    optional_vars = {
        'PESADB_API_URL': ('PesaDB API URL', 'https://pesacoredb-backend.onrender.com/api'),
        'PESADB_DATABASE': ('Database name', 'mpesa_tracker'),
    }
    
    print("📋 Required Environment Variables:")
    print("-" * 60)
    
    for var, description in required_vars.items():
        value = os.environ.get(var)
        if value:
            # Show partial value for security
            display_value = f"{value[:8]}..." if len(value) > 8 else value
            print(f"✅ {var:<20} : {display_value}")
        else:
            print(f"❌ {var:<20} : NOT SET")
            issues.append(f"{var} is required ({description})")
    
    print("\n📋 Optional Environment Variables:")
    print("-" * 60)
    
    for var, (description, default) in optional_vars.items():
        value = os.environ.get(var)
        if value:
            print(f"✅ {var:<20} : {value}")
        else:
            print(f"⚠️  {var:<20} : Using default ({default})")
            warnings.append(f"{var} not set, using default: {default}")
    
    print("\n" + "="*60)
    
    if issues:
        print("\n❌ CONFIGURATION ISSUES FOUND:")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
        
        print("\n💡 How to fix:")
        print("  1. Create a .env file in the backend directory")
        print("  2. Add the following lines:")
        print()
        for var in required_vars:
            print(f"     {var}=your_value_here")
        print()
        print("  3. Restart the server")
        
        return False
    
    if warnings:
        print("\n⚠️  Warnings:")
        for warning in warnings:
            print(f"  - {warning}")
    
    print("\n✅ Environment configuration looks good!")
    print()
    
    return True


if __name__ == "__main__":
    success = check_environment()
    sys.exit(0 if success else 1)
