# Database Schema Migration Guide

## Problem

The backend is failing with the error:
```
ColumnNotFoundError: column 'email' does not exist in table 'users'
```

This happens because your database was created with an **old schema** (PIN-based authentication) but the code has been updated to use **email/password authentication**.

## Solution

You have **3 options** to fix this:

### Option 1: Automatic Migration (Recommended - Easiest)

Simply **restart your backend server**. The server will automatically detect the schema issue and fix it on startup.

```bash
# Stop the backend server (Ctrl+C)
# Then restart it:
python backend/server.py
# or
python run-backend.py
```

### Option 2: Manual Migration Script

Run the migration script that will:
- Drop the old users table
- Create a new users table with the correct schema
- Verify the schema is correct

```bash
python backend/scripts/migrate_to_email_auth.py
```

**⚠️ Warning:** This will delete all existing users. You'll need to create new accounts after migration.

### Option 3: Full Database Reinitialization

If you want to start completely fresh:

```bash
python backend/scripts/init_database.py
```

This will:
- Create all tables with the correct schema
- Seed default categories
- Create a default admin user (email: admin@example.com, password: admin123)

## Verification

After running any of the above options, verify the schema is correct:

```bash
python backend/scripts/verify_schema.py
```

You should see:
```
✅ Users table has 'email' column
✅ Users table has 'password_hash' column
✅ Users table has correct email/password authentication schema
```

## What Changed?

The application migrated from:

**Old Schema (PIN-based):**
- `phone_number` (STRING)
- `pin_hash` (STRING)

**New Schema (Email/Password):**
- `email` (STRING)
- `password_hash` (STRING)

## After Migration

1. All old user accounts are deleted
2. Create new accounts using the **Signup** endpoint:
   ```
   POST /api/auth/signup
   {
     "email": "your@email.com",
     "password": "yourpassword",
     "name": "Your Name"
   }
   ```

3. Login with email/password:
   ```
   POST /api/auth/login
   {
     "email": "your@email.com",
     "password": "yourpassword"
   }
   ```

## Need Help?

If you encounter any issues:

1. Check the backend logs for detailed error messages
2. Verify your PESADB_API_KEY environment variable is set correctly
3. Try the full database reinitialization (Option 3)
4. Check that your PesaDB instance is running and accessible

## Technical Details

The schema version has been updated:
- **Old Version:** 1.0.0 (PIN-based authentication)
- **New Version:** 2.0.0 (Email/Password authentication)

The migration ensures all tables are created with the correct schema according to the new version.
