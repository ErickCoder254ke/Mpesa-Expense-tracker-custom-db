# Quick Fix Guide - Email Column Error

## Problem
Getting this error when signing up?
```
ColumnNotFoundError: column 'email' does not exist in table 'users'
```

## Quick Solution (5 Minutes)

### Step 1: Stop Backend Server
Press `Ctrl+C` in the terminal running your backend

### Step 2: Restart Backend Server
The backend will automatically fix the schema on startup:

```bash
cd backend
python server.py
# OR
python start-backend.py
```

### Step 3: Look for Success Message
You should see:
```
✅ Database ready: X tables created, Y existed...
```

### Step 4: Test Signup
Try signing up again with your email and password.

---

## Alternative: Manual Database Initialization

If auto-initialization doesn't work:

```bash
cd backend
python scripts/init_database.py
```

Then restart the backend server.

---

## Alternative: API-Based Initialization

While backend is running:

```bash
curl -X POST http://localhost:8000/api/initialize-database
```

---

## Verify the Fix

Run the verification script:

```bash
cd backend
python scripts/verify_schema.py
```

Should output: `✅ Database schema verification passed!`

---

## Default User Credentials

After initialization, you can log in with:
- **Email**: admin@example.com
- **Password**: admin123

⚠️ **Change these immediately after first login!**

---

## Still Having Issues?

### Check Environment Variables
```bash
cd backend
python check_environment.py
```

Make sure you have:
- `PESADB_API_KEY` set in `backend/.env`
- `PESADB_API_URL` (optional, has default)
- `PESADB_DATABASE` (optional, defaults to "mpesa_tracker")

### Check Backend Logs
Look for errors in the backend startup logs.

Common issues:
- ❌ PesaDB API key not set
- ❌ Network issues connecting to PesaDB
- ❌ Old table schema not dropped

### Nuclear Option: Drop All Tables
If all else fails, drop all tables and let the backend recreate them:

1. Connect to your PesaDB dashboard
2. Drop all tables (users, categories, transactions, etc.)
3. Restart backend server
4. Server will recreate everything with correct schema

---

## Need More Help?

See the detailed fix summary: [SCHEMA_FIX_SUMMARY.md](SCHEMA_FIX_SUMMARY.md)

---

**Last Updated**: January 15, 2026
