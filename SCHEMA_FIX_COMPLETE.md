# Schema Fix Complete ✅

## Problem Fixed

**Error:** `ColumnNotFoundError: column 'email' does not exist in table 'users'`

**Root Cause:** The database was created with an old schema (PIN-based authentication) but the code has been updated to use email/password authentication.

## Solution Implemented

I've implemented **automatic schema migration** that fixes this issue automatically when you restart the backend server. Plus, I've created several manual fix options if needed.

---

## 🚀 Quick Fix (Recommended)

**Just restart your backend server!**

```bash
# Stop the server (Ctrl+C)
# Then restart:
python backend/server.py
```

The server will:
1. ✅ Detect the old schema automatically
2. ✅ Migrate the users table to the new schema
3. ✅ Verify the migration succeeded
4. ✅ Start up normally

You'll see this in the logs:
```
⚠️  OLD SCHEMA DETECTED - Users table needs migration!
✅ Users table migrated successfully to email/password schema
✅ Database ready (schema migrated)
```

---

## Alternative Fix Options

### Option 1: Run Quick Fix Script

```bash
python backend/scripts/quick_fix_schema.py
```

This script:
- Checks your schema
- Fixes it if needed
- Verifies the fix
- Gives you clear next steps

### Option 2: Run Full Migration Script

```bash
python backend/scripts/migrate_to_email_auth.py
```

This gives you more control and asks for confirmation before migrating.

### Option 3: Verify Schema

Check if your schema is correct:

```bash
python backend/scripts/verify_schema.py
```

---

## What Was Changed

### 1. **Automatic Migration on Startup** ✨

The backend server now:
- Checks the users table schema on startup
- Automatically migrates from PIN to email/password if needed
- Logs clear messages about what's happening

**Files Modified:**
- `backend/services/database_initializer.py` - Added schema checking and migration methods
- `backend/server.py` - Updated startup logging to show migration status

### 2. **Migration Scripts Created** 📝

**New Files:**
- `backend/scripts/migrate_to_email_auth.py` - Full migration script with confirmation
- `backend/scripts/quick_fix_schema.py` - Quick fix script (no questions, just fix it)
- `SCHEMA_MIGRATION_GUIDE.md` - Comprehensive guide for users
- `SCHEMA_FIX_COMPLETE.md` - This summary document

### 3. **Schema Verification** 🔍

**Existing File Enhanced:**
- `backend/scripts/verify_schema.py` - Already existed, now can be used to verify the fix

---

## What Happens During Migration

1. **Old users table is dropped** (all previous users are deleted)
2. **New users table is created** with these columns:
   - `id` (STRING PRIMARY KEY)
   - `email` (STRING) ← **NEW**
   - `password_hash` (STRING) ← **NEW**
   - `name` (STRING)
   - `created_at` (STRING)
   - `preferences` (STRING)

3. **Old columns removed:**
   - `phone_number` ← Removed
   - `pin_hash` ← Removed

---

## After Migration

### Create New User Accounts

All previous users are deleted during migration. Create new accounts:

**1. Via Signup Endpoint:**
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword",
    "name": "Your Name"
  }'
```

**2. Via Frontend:**
Use the signup screen in your mobile app.

### Login with Email/Password

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

---

## Verification Steps

After running any fix option:

1. **Check server logs** - should see "✅ Database ready (schema migrated)"
2. **Run verify script:**
   ```bash
   python backend/scripts/verify_schema.py
   ```
3. **Try signup:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test123","name":"Test"}'
   ```

Expected result: `{"message": "Signup successful", ...}`

---

## Technical Details

### Schema Version

- **Old:** 1.0.0 (PIN-based authentication)
- **New:** 2.0.0 (Email/Password authentication)

### New Methods Added

**In `database_initializer.py`:**
- `check_users_table_schema()` - Checks if users table has correct schema
- `migrate_users_table()` - Automatically migrates from old to new schema

### Automatic Migration Flow

```
Server Startup
    ↓
Check Database Exists
    ↓
Check Users Table Schema ← NEW
    ↓
[If old schema detected]
    ↓
Auto-migrate to new schema ← NEW
    ↓
Create other tables
    ↓
Seed categories
    ↓
Server ready
```

---

## Troubleshooting

### Issue: "Migration failed"

**Solution:**
1. Check your PESADB_API_KEY is set correctly
2. Check your PesaDB instance is running
3. Try the manual migration script
4. Check the backend logs for detailed errors

### Issue: "Table already exists" error

**Solution:**
This is normal! The migration handles this automatically. The server continues normally.

### Issue: Still getting "column 'email' does not exist"

**Solution:**
1. Stop the server completely
2. Run: `python backend/scripts/quick_fix_schema.py`
3. Verify: `python backend/scripts/verify_schema.py`
4. Restart the server

---

## Summary

✅ **Problem:** Database schema was outdated (PIN-based)  
✅ **Solution:** Automatic migration to email/password schema  
✅ **How:** Just restart your backend server  
✅ **Fallback:** Multiple manual fix scripts available  
✅ **Verification:** Scripts to verify schema is correct  

The fix is **fully automatic** - just restart your server! 🎉

---

## Need More Help?

1. Check the **SCHEMA_MIGRATION_GUIDE.md** for detailed instructions
2. Check backend logs for specific error messages
3. Run **verify_schema.py** to check your current state
4. Run **quick_fix_schema.py** for immediate fix

All scripts provide clear, helpful error messages to guide you.
