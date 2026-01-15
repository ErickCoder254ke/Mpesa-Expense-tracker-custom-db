# Database Setup and Troubleshooting Guide

This guide provides instructions for setting up, verifying, and troubleshooting the PesaDB database for the M-Pesa Expense Tracker application.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Database Verification](#database-verification)
3. [Common Issues](#common-issues)
4. [Database Repair](#database-repair)
5. [Manual Initialization](#manual-initialization)
6. [PesaDB Limitations](#pesadb-limitations)

---

## Initial Setup

### Prerequisites

1. **PesaDB API Key**: Obtain a PesaDB API key from [PesaDB](https://pesadb.com)
2. **Environment Variables**: Create a `.env` file in the `backend/` directory:

```bash
# PesaDB Configuration
PESADB_API_KEY=your_api_key_here
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_DATABASE=mpesa_tracker

# JWT Configuration
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
```

### Automatic Initialization

The database is automatically initialized when you start the server:

```bash
# From project root
python backend/server.py

# Or using uvicorn
uvicorn backend.server:app --reload
```

The startup process will:
- ✅ Create all required tables
- ✅ Seed default categories
- ✅ Create a default admin user (email: admin@example.com, password: admin123)

**IMPORTANT**: Change the default admin password after first login!

---

## Database Verification

### Quick Verification

Run the verification script to check database schema:

```bash
# Basic verification
python backend/scripts/verify_database_schema.py

# Verbose output
python backend/scripts/verify_database_schema.py --verbose
```

Expected output:
```
DATABASE SCHEMA VERIFICATION
================================================================================

🔍 Verifying database schema...

✅ Table users is valid (1 rows)
✅ Table categories is valid (12 rows)
✅ Table transactions is valid (0 rows)
✅ Table budgets is valid (0 rows)
✅ Table sms_import_logs is valid (0 rows)
✅ Table duplicate_logs is valid (0 rows)
✅ Table status_checks is valid (0 rows)

VERIFICATION SUMMARY
================================================================================

✅ OK (1 rows)                          users
✅ OK (12 rows)                         categories
✅ OK (0 rows)                          transactions
✅ OK (0 rows)                          budgets
✅ OK (0 rows)                          sms_import_logs
✅ OK (0 rows)                          duplicate_logs
✅ OK (0 rows)                          status_checks

================================================================================

✅ All tables are present and have correct schema!
```

### Using the API

You can also verify database status via the API:

```bash
# Health check endpoint
curl http://localhost:8000/api/health

# Manual initialization endpoint
curl -X POST http://localhost:8000/api/initialize-database
```

---

## Common Issues

### Issue 1: "Column 'user_id' not found in row"

**Symptoms:**
```
Column 'user_id' not found in row
SQL: SELECT id FROM transactions WHERE user_id = '...'
```

**Cause:** This is a PesaDB quirk where selecting specific columns with WHERE clauses on other columns can fail.

**Solution:**
The application has been updated to use `SELECT *` in fallback queries. If you still see this error:

1. Verify the transactions table exists and has the correct schema:
   ```bash
   python backend/scripts/verify_database_schema.py
   ```

2. If schema is incorrect, repair the database:
   ```bash
   python backend/scripts/verify_database_schema.py --repair
   ```

3. If issues persist, force recreate (⚠️ DESTRUCTIVE - deletes all data):
   ```bash
   python backend/scripts/verify_database_schema.py --force-recreate
   ```

### Issue 2: "SyntaxError: Expected IDENTIFIER near 'COUNT'"

**Symptoms:**
```
PesaDB Error: An error occurred: SyntaxError: Expected IDENTIFIER near 'COUNT'
⚠️ FALLBACK ACTIVATED: Database does not support COUNT aggregates.
```

**Cause:** Your PesaDB instance doesn't support aggregate functions (COUNT, SUM, AVG, etc.). This is expected for older PesaDB versions.

**Solution:**
This is **not an error** - it's a warning. The application automatically uses fallback methods:

- **COUNT queries** → Fetch all rows and count in memory
- **SUM queries** → Fetch all values and sum in memory
- **Aggregations** → Perform grouping and aggregation in memory

**Performance Impact:**
- Works fine for <10,000 transactions
- Slower for larger datasets (10-100x slower than native aggregates)

**Long-term Solution:**
Upgrade to PesaDB v2.0.0+ which has native aggregate support. Once upgraded, the application will automatically use native aggregates.

### Issue 3: "Table does not exist"

**Symptoms:**
```
PesaDB Error: Table 'transactions' does not exist
```

**Solution:**

1. Run database initialization:
   ```bash
   python backend/scripts/init_database.py
   ```

2. Or use the API:
   ```bash
   curl -X POST http://localhost:8000/api/initialize-database
   ```

3. Or use the repair script:
   ```bash
   python backend/scripts/verify_database_schema.py --repair
   ```

### Issue 4: "PESADB_API_KEY environment variable is required"

**Cause:** Missing or incorrect API key configuration.

**Solution:**

1. Check your `.env` file in the `backend/` directory
2. Ensure `PESADB_API_KEY` is set correctly
3. Restart the server after updating `.env`

### Issue 5: Empty/Missing Data

**Symptoms:**
- No categories showing up
- No default user
- Transactions not saving

**Solution:**

1. Check if tables are empty:
   ```bash
   python backend/scripts/verify_database_schema.py --verbose
   ```

2. Reinitialize database (preserves existing data):
   ```bash
   curl -X POST http://localhost:8000/api/initialize-database
   ```

3. If categories are missing, seed them:
   ```bash
   python backend/scripts/init_database.py
   ```

---

## Database Repair

### Safe Repair (Preserves Data)

This will create missing tables and seed missing categories without deleting existing data:

```bash
python backend/scripts/verify_database_schema.py --repair
```

### Force Recreate (⚠️ DESTRUCTIVE)

This will **delete all data** and recreate all tables from scratch:

```bash
python backend/scripts/verify_database_schema.py --force-recreate
```

You will be prompted to confirm by typing `YES`.

---

## Manual Initialization

### Using Python Script

```bash
# From project root
python backend/scripts/init_database.py
```

This script will:
- Check if tables exist
- Create missing tables
- Seed default categories
- Create default admin user
- Verify the setup

### Using SQL File

The canonical schema is in `backend/scripts/init_pesadb.sql`. You can execute it directly via PesaDB API if needed.

---

## PesaDB Limitations

### Current Limitations (as of this documentation)

1. **No COUNT/SUM/AVG support**: Older PesaDB versions don't support aggregate functions
   - **Workaround**: Automatic fallback to in-memory aggregation
   - **Impact**: Slower queries, but functional

2. **Limited WHERE clause parsing**: Some queries with complex WHERE clauses may fail
   - **Workaround**: Use simpler queries or fetch all data and filter in memory

3. **JSON Storage**: JSON data must be stored as STRING columns
   - **Workaround**: Automatic JSON serialization/deserialization in the app

4. **No DEFAULT values**: All columns must be explicitly provided in INSERT statements
   - **Workaround**: Application provides defaults

5. **No NULL support for STRING columns**: Must use JSON 'null' string
   - **Workaround**: Application uses `'null'` string for empty optional fields

### Checking PesaDB Capabilities

You can check what your PesaDB instance supports:

```python
from backend.config.pesadb_fallbacks import detect_pesadb_capabilities

# This will test various SQL features
capabilities = await detect_pesadb_capabilities()
print(capabilities)
# Output: {'count': False, 'sum': False, 'avg': False, ...}
```

---

## Database Schema

### Tables

1. **users**: User accounts (email/password authentication)
2. **categories**: Expense/income categories with auto-categorization keywords
3. **transactions**: Financial transactions (manual and SMS-imported)
4. **budgets**: Monthly budget allocations per category
5. **sms_import_logs**: SMS import session tracking
6. **duplicate_logs**: Duplicate transaction detection logs
7. **status_checks**: Health check and system status logs

### Schema Version

Current schema version: **2.0.0** (Email/Password authentication)

Previous version: 1.0.0 (PIN-based authentication - deprecated)

---

## Troubleshooting Checklist

If you're experiencing database issues, run through this checklist:

- [ ] Environment variables are set correctly in `.env`
- [ ] PesaDB API key is valid and has correct permissions
- [ ] Server can connect to PesaDB API (check `http://localhost:8000/api/health`)
- [ ] All required tables exist (`python backend/scripts/verify_database_schema.py`)
- [ ] Tables have correct schema (same script with `--verbose`)
- [ ] Default categories are seeded (should see 12 categories)
- [ ] Default admin user exists (check health endpoint)

If all checks pass but issues persist, try:

1. **Repair database**:
   ```bash
   python backend/scripts/verify_database_schema.py --repair
   ```

2. **Check server logs** for specific error messages

3. **Restart the server** after making changes

4. **Clear browser cache** if frontend is showing stale data

---

## Getting Help

If you continue to experience issues:

1. **Check server logs** for detailed error messages
2. **Run verification script** with `--verbose` flag
3. **Check PesaDB API status** at https://pesadb.com/status
4. **Review this guide** for common issues

For PesaDB-specific issues, contact PesaDB support.

For application-specific issues, check the GitHub repository or contact the development team.

---

## Quick Reference

```bash
# Verify database
python backend/scripts/verify_database_schema.py

# Repair database (safe)
python backend/scripts/verify_database_schema.py --repair

# Force recreate (DESTRUCTIVE)
python backend/scripts/verify_database_schema.py --force-recreate

# Initialize database
python backend/scripts/init_database.py

# Start server
python backend/server.py

# Health check
curl http://localhost:8000/api/health

# Manual initialization
curl -X POST http://localhost:8000/api/initialize-database
```

---

**Last Updated**: January 2026
**Schema Version**: 2.0.0
