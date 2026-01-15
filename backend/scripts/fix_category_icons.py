"""
Fix invalid category icons in the database.

This script identifies categories with invalid icon names (emojis, special characters, etc.)
and replaces them with valid Ionicons names.
"""

import asyncio
import re
import sys
import os

# Add parent directory to path so we can import from backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.pesadb import query_db, execute_db

# Valid Ionicons pattern: lowercase letters and hyphens
IONICONS_PATTERN = re.compile(r'^[a-z]+(-[a-z]+)*$')

# Emoji detection pattern
EMOJI_PATTERN = re.compile(
    r'[\U0001F300-\U0001F9FF\U00002600-\U000026FF\U00002700-\U000027BF]'
)

# Mapping of common invalid icons to valid replacements
ICON_MAPPING = {
    '📌': 'pin',
    '🍕': 'restaurant',
    '🍔': 'restaurant',
    '🍜': 'restaurant',
    '🚗': 'car',
    '🚕': 'car',
    '🚙': 'car',
    '⚡': 'flash',
    '💡': 'bulb',
    '🏠': 'home',
    '🏡': 'home',
    '🏥': 'medical',
    '💊': 'medical',
    '🎓': 'school',
    '📚': 'school',
    '🛒': 'cart',
    '🛍️': 'shopping-bag',
    '💰': 'cash',
    '💵': 'cash',
    '💳': 'card',
    '🎵': 'musical-notes',
    '🎶': 'musical-notes',
    '📱': 'phone-portrait',
    '☎️': 'call',
    '✈️': 'airplane',
    '🚀': 'rocket',
    '🎉': 'balloon',
    '🎈': 'balloon',
    '🍺': 'beer',
    '☕': 'cafe',
    '🍰': 'restaurant',
    '🎮': 'game-controller',
    '📺': 'tv',
    '💻': 'laptop',
    '⚽': 'football',
    '🏋️': 'fitness',
    '🎬': 'film',
    '📷': 'camera',
    '🎨': 'color-palette',
    '✉️': 'mail',
    '📧': 'mail',
    '🔒': 'lock-closed',
    '🔓': 'lock-open',
    '⚙️': 'settings',
    '🔧': 'construct',
    '🔨': 'hammer',
    '💼': 'briefcase',
    '👔': 'shirt',
    '👗': 'shirt',
    '👞': 'footsteps',
    '🎓': 'school',
    '📖': 'book',
    '✏️': 'pencil',
    '✍️': 'create',
    '📝': 'document-text',
    '📄': 'document',
    '📋': 'clipboard',
    '📊': 'stats-chart',
    '📈': 'trending-up',
    '📉': 'trending-down',
    '🔔': 'notifications',
    '⏰': 'alarm',
    '⏱️': 'timer',
    '🕐': 'time',
    '📅': 'calendar',
    '📆': 'calendar-number',
    '🎁': 'gift',
    '🎂': 'cafe',
    '🍿': 'fast-food',
    '🌍': 'globe',
    '🌎': 'globe',
    '🌏': 'earth',
    '⭐': 'star',
    '❤️': 'heart',
    '💙': 'heart',
    '💚': 'heart',
    '💛': 'heart',
    '🔥': 'flame',
    '💧': 'water',
    '🌧️': 'rainy',
    '☀️': 'sunny',
    '🌙': 'moon',
    '⚠️': 'warning',
    '❌': 'close-circle',
    '✅': 'checkmark-circle',
    '❓': 'help-circle',
    '❗': 'alert-circle',
    '➕': 'add-circle',
    '➖': 'remove-circle',
    '🔍': 'search',
}

# Default fallback icon
DEFAULT_ICON = 'help-circle'


def is_valid_ionicon(icon_name: str) -> bool:
    """Check if an icon name is valid for Ionicons"""
    if not icon_name:
        return False
    
    # Check for emojis
    if EMOJI_PATTERN.search(icon_name):
        return False
    
    # Check if it matches Ionicons pattern
    if IONICONS_PATTERN.match(icon_name):
        return True
    
    return False


def get_replacement_icon(invalid_icon: str, category_name: str) -> str:
    """Get a replacement icon for an invalid icon"""
    
    # First, check direct mapping
    if invalid_icon in ICON_MAPPING:
        return ICON_MAPPING[invalid_icon]
    
    # Try to infer from category name
    category_lower = category_name.lower()
    
    if 'food' in category_lower or 'dining' in category_lower or 'restaurant' in category_lower:
        return 'restaurant'
    elif 'transport' in category_lower or 'travel' in category_lower or 'car' in category_lower:
        return 'car'
    elif 'utility' in category_lower or 'utilities' in category_lower or 'electric' in category_lower:
        return 'flash'
    elif 'shopping' in category_lower or 'shop' in category_lower:
        return 'cart'
    elif 'health' in category_lower or 'medical' in category_lower:
        return 'medical'
    elif 'education' in category_lower or 'school' in category_lower:
        return 'school'
    elif 'entertainment' in category_lower or 'fun' in category_lower:
        return 'musical-notes'
    elif 'bill' in category_lower or 'fee' in category_lower:
        return 'receipt'
    elif 'income' in category_lower or 'salary' in category_lower:
        return 'cash'
    elif 'home' in category_lower or 'house' in category_lower:
        return 'home'
    elif 'pin' in category_lower or 'save' in category_lower:
        return 'pin'
    
    # Default fallback
    return DEFAULT_ICON


async def fix_category_icons():
    """Find and fix invalid category icons"""
    try:
        print("🔍 Checking for invalid category icons...")
        
        # Get all categories
        categories = await query_db("SELECT * FROM categories")
        
        if not categories:
            print("❌ No categories found in database")
            return
        
        print(f"📊 Found {len(categories)} categories")
        
        invalid_categories = []
        
        # Check each category
        for category in categories:
            icon = category.get('icon', '')
            name = category.get('name', 'Unknown')
            category_id = category.get('id')
            
            if not is_valid_ionicon(icon):
                invalid_categories.append({
                    'id': category_id,
                    'name': name,
                    'current_icon': icon,
                    'is_default': category.get('is_default', False)
                })
        
        if not invalid_categories:
            print("✅ All category icons are valid!")
            return
        
        print(f"\n⚠️ Found {len(invalid_categories)} categories with invalid icons:\n")
        
        # Display invalid categories and their replacements
        updates = []
        for cat in invalid_categories:
            replacement_icon = get_replacement_icon(cat['current_icon'], cat['name'])
            updates.append({
                'id': cat['id'],
                'name': cat['name'],
                'current_icon': cat['current_icon'],
                'new_icon': replacement_icon
            })
            
            print(f"  • {cat['name']}")
            print(f"    Current: '{cat['current_icon']}'")
            print(f"    Replacement: '{replacement_icon}'\n")
        
        # Ask for confirmation
        print("=" * 60)
        response = input("\n🔧 Do you want to apply these fixes? (yes/no): ").strip().lower()
        
        if response not in ['yes', 'y']:
            print("❌ Operation cancelled")
            return
        
        # Apply updates
        print("\n🔄 Applying fixes...")
        fixed_count = 0
        
        for update in updates:
            try:
                sql = f"""
                    UPDATE categories 
                    SET icon = '{update['new_icon']}' 
                    WHERE id = '{update['id']}'
                """
                await execute_db(sql)
                print(f"  ✅ Fixed: {update['name']}")
                fixed_count += 1
            except Exception as e:
                print(f"  ❌ Failed to fix {update['name']}: {str(e)}")
        
        print(f"\n✅ Successfully fixed {fixed_count} out of {len(updates)} categories!")
        print("\n💡 Please restart your React Native app to see the changes.")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


async def list_all_icons():
    """List all category icons (for debugging)"""
    try:
        categories = await query_db("SELECT id, name, icon, is_default FROM categories ORDER BY name")
        
        print("\n📋 All Category Icons:")
        print("=" * 60)
        
        for cat in categories:
            status = "✅" if is_valid_ionicon(cat['icon']) else "❌"
            default = " [DEFAULT]" if cat.get('is_default') else ""
            print(f"{status} {cat['name']}{default}")
            print(f"   Icon: '{cat['icon']}'")
            print()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        asyncio.run(list_all_icons())
    else:
        asyncio.run(fix_category_icons())
