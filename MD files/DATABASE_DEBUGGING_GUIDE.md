# Database Debugging Guide - COUNT(*) Error

## Overview

Your M-Pesa Expense Tracker is experiencing a persistent `SyntaxError: Expected IDENTIFIER near 'COUNT'` error during database initialization. This guide provides multiple approaches to debug and resolve the issue.

## Error Details

```
❌ Error seeding default categories: PesaDB Query Error: PesaDB Error: An error occurred: SyntaxError: Expected IDENTIFIER near 'COUNT'
❌ Error creating default user: PesaDB Query Error: PesaDB Error: An error occurred: SyntaxError: Expected IDENTIFIER near 'COUNT'
```

## Files Created

### 1. AI_AGENT_PROMPT.md
A comprehensive prompt you can use with an AI agent to investigate and fix the database code systematically.

### 2. SEED_DATA_SQL.sql  
Ready-to-run SQL INSERT statements for manual seeding via PesaDB SQL editor. **Use this as a quick workaround!**

### 3. backend/test_count_query.py
A diagnostic script that tests various COUNT(*) query patterns to identify exactly what's failing.

### 4. backend/seed_categories_direct.py
A direct seeding script that bypasses COUNT checks and inserts categories directly.

### 5. backend/config/pesadb.py (Updated)
Added detailed debug logging to see exactly what SQL is being sent to PesaDB.

## Quick Fix: Manual Seeding

### Option 1: Run SQL Commands Directly

1. Open your PesaDB SQL editor at: `https://pesacoredb-backend.onrender.com/query` (or your PesaDB console)
2. Ensure you're connected to database: `mpesa_tracker`
3. Copy and paste the commands from `SEED_DATA_SQL.sql`
4. Execute them one by one or all at once
5. Verify with: `SELECT COUNT(*) FROM categories WHERE is_default = TRUE;`
6. You should see 12 categories

### Option 2: Use the Direct Seed Script

```bash
cd backend
python seed_categories_direct.py
```

This script will:
- Attempt to insert all 12 default categories
- Catch and handle duplicate errors gracefully
- Show a summary of what was inserted

## Diagnostic Steps

### Step 1: Run the COUNT Query Test

```bash
cd backend
python test_count_query.py
```

This will test various COUNT(*) patterns and show you:
- Which queries work
- Which queries fail
- The exact error messages from PesaDB
- What tables exist in your database

### Step 2: Check the Logs

With the updated pesadb.py, run your server and check for detailed logs:

```bash
python backend/server.py
```

Look for lines starting with:
- `🔍 PesaDB Query - SQL:` - Shows exact SQL being sent
- `🔍 PesaDB Response:` - Shows what PesaDB returns
- `❌ PesaDB Error - SQL:` - Shows failed queries with full context

### Step 3: Verify Table Structure

Run this SQL directly in PesaDB:

```sql
SHOW TABLES;
```

Then for each table:

```sql
DESCRIBE categories;
DESCRIBE users;
```

Make sure the tables exist and have the correct structure.

## Possible Root Causes

### 1. **Database Not Selected**
PesaDB might not be using the correct database. Check:
- Environment variable `PESADB_DATABASE` is set to `mpesa_tracker`
- The database exists: `SHOW DATABASES;`

### 2. **Query Construction Issue**
The SQL string might be getting corrupted:
- Check for extra quotes or special characters
- Verify JSON serialization in the API payload
- Look at the debug logs to see exact SQL sent

### 3. **PesaDB Syntax Limitation**
PesaDB might have undocumented limitations:
- The `as count` alias might be problematic
- Try without alias: `SELECT COUNT(*) FROM categories`
- Try with different table names

### 4. **API Version Mismatch**
Your PesaDB API might have changed:
- Check if the API endpoint is correct
- Verify the API key has proper permissions
- Test with a simple query first

### 5. **Async/Session Issues**
The aiohttp session might have problems:
- Sessions might need to be recreated
- Connection timeout or pooling issues
- Try adding session refresh logic

## Workaround: Modify seed_default_categories()

Edit `backend/services/database_initializer.py`:

```python
@staticmethod
async def seed_default_categories() -> int:
    """Seed default categories without checking count first"""
    try:
        # Skip the COUNT check, just try to insert
        logger.info("📦 Seeding default categories...")
        
        default_categories = [
            # ... your categories here
        ]
        
        seeded_count = 0
        for cat_id, name, icon, color, keywords in default_categories:
            try:
                safe_name = name.replace("'", "''")
                sql = f"""
                INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
                VALUES ('{cat_id}', NULL, '{safe_name}', '{icon}', '{color}', '{keywords}', TRUE)
                """
                await execute_db(sql)
                seeded_count += 1
                logger.info(f"✅ Seeded category: {name}")
            except Exception as e:
                # Ignore duplicate errors
                if 'duplicate' in str(e).lower() or 'exists' in str(e).lower():
                    logger.info(f"⏭️  Category '{name}' already exists")
                else:
                    logger.warning(f"⚠️  Error seeding '{name}': {str(e)}")
        
        return seeded_count
        
    except Exception as e:
        logger.error(f"❌ Error seeding default categories: {str(e)}")
        return 0
```

## Testing After Fix

### 1. Verify Categories Exist

```sql
SELECT id, name FROM categories WHERE is_default = TRUE ORDER BY name;
```

Expected: 12 rows

### 2. Test COUNT Query

```sql
SELECT COUNT(*) as total FROM categories WHERE is_default = TRUE;
```

Expected: 12

### 3. Verify Users Can Be Created

Try creating a test user or run the default user creation.

## Environment Variables Check

Ensure these are set in your `.env` file:

```bash
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_API_KEY=your_actual_api_key_here
PESADB_DATABASE=mpesa_tracker
```

## Manual Database Initialization

If all else fails, you can initialize the database manually:

### 1. Create Tables

Run the CREATE TABLE statements from `backend/scripts/init_pesadb.sql`

### 2. Seed Categories

Run the INSERT statements from `SEED_DATA_SQL.sql`

### 3. Create Default User

```sql
INSERT INTO users (id, pin_hash, security_question, security_answer_hash, created_at, preferences)
VALUES (
    'default-user-id-12345',
    '$2b$12$YourHashedPinHere',
    'What is your favorite color?',
    NULL,
    '2026-01-15T00:00:00',
    '{"default_currency": "KES", "is_default": true}'
);
```

(You'll need to generate the bcrypt hash for PIN "0000" separately)

## Next Steps

1. **Try the quick fix first**: Run the SQL commands from `SEED_DATA_SQL.sql` manually
2. **Run diagnostics**: Use `test_count_query.py` to see what's failing
3. **Check logs**: Run server with new debug logging to see exact SQL
4. **Use AI agent**: If still stuck, use `AI_AGENT_PROMPT.md` with an AI agent for deep investigation
5. **Apply workaround**: Modify the code to skip COUNT checks if needed

## Success Criteria

✅ All 12 default categories are seeded  
✅ Default user is created  
✅ Server starts without initialization errors  
✅ COUNT(*) queries work correctly  
✅ Application can perform CRUD operations

## Support Resources

- **PesaDB Documentation**: See `commands.md` for SQL syntax reference
- **Debug Logs**: Check server output with new detailed logging
- **Test Scripts**: Use provided diagnostic scripts to isolate issues

---

**Last Updated**: 2026-01-15  
**Issue**: COUNT(*) syntax error during database initialization  
**Status**: Under investigation
