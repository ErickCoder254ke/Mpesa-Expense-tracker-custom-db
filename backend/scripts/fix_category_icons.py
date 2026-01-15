#!/usr/bin/env python3
"""
Fix Category Icons Script

This script updates category icons from emojis to valid Ionicons names.
Run this script to fix existing categories in the database.

Usage:
    python backend/scripts/fix_category_icons.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from config.pesadb import query_db, execute_db


async def fix_category_icons():
    """Update category icons from emojis to valid Ionicons names"""
    
    print("🔧 Fixing category icons...")
    
    # Mapping of category IDs to their correct icon names
    icon_mapping = {
        'cat-food': 'restaurant',
        'cat-transport': 'car',
        'cat-shopping': 'shopping-bag',
        'cat-bills': 'receipt',
        'cat-entertainment': 'film',
        'cat-health': 'medical',
        'cat-education': 'book',
        'cat-airtime': 'call',
        'cat-transfers': 'swap-horizontal',
        'cat-savings': 'wallet',
        'cat-income': 'cash',
        'cat-other': 'ellipsis-horizontal',
    }
    
    success_count = 0
    error_count = 0
    
    for cat_id, icon_name in icon_mapping.items():
        try:
            # Update the icon for this category
            sql = f"UPDATE categories SET icon = '{icon_name}' WHERE id = '{cat_id}'"
            await execute_db(sql)
            print(f"✅ Updated {cat_id} to use icon '{icon_name}'")
            success_count += 1
        except Exception as e:
            print(f"⚠️  Failed to update {cat_id}: {str(e)}")
            error_count += 1
    
    print("\n" + "="*60)
    print(f"✅ Category icon fix completed!")
    print(f"   - Successful: {success_count}")
    print(f"   - Errors: {error_count}")
    print("="*60)
    
    # Verify the changes
    print("\n🔍 Verifying categories...")
    try:
        categories = await query_db("SELECT id, name, icon FROM categories WHERE is_default = TRUE")
        print(f"\nFound {len(categories)} default categories:")
        for cat in categories:
            print(f"  - {cat['name']}: {cat['icon']}")
    except Exception as e:
        print(f"⚠️  Could not verify categories: {str(e)}")


async def main():
    """Main execution function"""
    
    print("\n" + "="*60)
    print("  Fix Category Icons")
    print("  M-Pesa Expense Tracker")
    print("="*60 + "\n")
    
    try:
        await fix_category_icons()
        
        print("\n" + "="*60)
        print("  ✅ Fix Complete!")
        print("  Category icons have been updated.")
        print("="*60 + "\n")
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Fix cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fix failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
