# Database Initialization Fix Guide

## Problem Summary

The M-Pesa Expense Tracker backend was failing to create required database tables during deployment, resulting in the following error:

```
2026-01-14 19:05:26,948 - services.database_initializer - ERROR - ❌ Required table 'users' does not exist
2026-01-14 19:05:26,949 - services.database_initializer - ERROR - ❌ Database verification failed - some tables are missing
```

## Root Causes Identified

1. **Missing SQL Schema File**: The `database_initializer.py` was trying to load table schemas from `backend/scripts/init_pesadb.sql`, but this file didn't exist.

2. **Incomplete Error Handling**: When table creation failed via the PesaDB API, error messages were not detailed enough to diagnose the issue.

3. **Table Verification Issues**: The `table_exists()` method was using `LIMIT 0` queries which might not work reliably with all database APIs.

4. **No Fallback Mechanism**: If the SQL file-based approach failed, there was no automatic fallback to inline table creation.

## Changes Made

### 1. Created `backend/scripts/init_pesadb.sql`

A comprehensive SQL schema file containing all required table definitions:
- users
- categories
- transactions
- budgets
- sms_import_logs
- duplicate_logs
- status_checks

All tables use `CREATE TABLE IF NOT EXISTS` to ensure idempotent operations.

### 2. Improved `backend/services/database_initializer.py`

#### Enhanced Table Creation Logic
- Better error handling with detailed logging
- Verification after each table creation
- Improved SQL statement parsing
- Cleaner SQL formatting (removed extra whitespace)

#### Improved Table Verification
- Changed from `LIMIT 0` to `COUNT(*)` queries for better reliability
- Better error message detection for missing tables
- More detailed verification logging

#### Added Fallback Mechanism
- Automatic fallback to inline table creation if SQL file method fails
- Retry logic when verification fails after initial creation
- Dual-path approach ensures tables are created even if one method fails

#### Better Error Reporting
- Detailed error messages with SQL snippets
- Summary of tables created vs. skipped
- List of missing tables when verification fails
- Exception stack traces for debugging

### 3. Created Diagnostic Tool

Added `backend/test_database_connection.py` to help diagnose database issues:
- Tests PesaDB API connection
- Verifies database creation
- Tests table creation and querying
- Validates the full initialization process
- Provides detailed error messages

## How to Use

### During Deployment

The database initialization now happens automatically on server startup. The improved error handling and fallback mechanisms should ensure tables are created successfully.

### Manual Testing

To test the database initialization manually:

```bash
# Test database connection and initialization
python backend/test_database_connection.py
```

This will:
1. Verify your PesaDB API credentials
2. Test database creation
3. Test table creation and queries
4. Run the full schema initialization
5. Provide detailed diagnostics if anything fails

### Manual Database Initialization

If you need to manually trigger database initialization:

```bash
# Using the initialization script
python backend/scripts/init_database.py
```

Or via the API endpoint:
```bash
POST /api/initialize-database
```

### Environment Variables Required

Make sure these environment variables are set:

```env
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_API_KEY=your_api_key_here
PESADB_DATABASE=mpesa_tracker
```

## Troubleshooting

### Tables Still Not Being Created

1. **Check API Key**: Ensure `PESADB_API_KEY` is set correctly
   ```bash
   echo $PESADB_API_KEY
   ```

2. **Test Connection**: Run the diagnostic tool
   ```bash
   python backend/test_database_connection.py
   ```

3. **Check Logs**: Look for detailed error messages in the server logs
   - Search for "❌" or "ERROR" in logs
   - Check for API connection errors
   - Look for SQL syntax errors

4. **Verify PesaDB API**: Ensure the PesaDB API service is running and accessible
   ```bash
   curl -H "X-API-Key: YOUR_KEY" https://pesacoredb-backend.onrender.com/api/databases
   ```

### Verification Fails But Tables Exist

If verification reports missing tables but you believe they exist:

1. The `table_exists()` method tries to query each table
2. Check if the PesaDB API returns proper error messages for missing tables
3. Try querying the tables manually via the API

### Partial Table Creation

If some tables are created but not all:

1. Check the initialization logs for specific error messages
2. Look for SQL syntax errors in the failed table definitions
3. Verify the PesaDB API supports all data types used (STRING, INT, REAL, BOOL)
4. Test creating the failing tables manually

## Database Schema

### Tables Created

1. **users**: User authentication and preferences
2. **categories**: Transaction categories with icons and keywords
3. **transactions**: Financial transactions (expenses and income)
4. **budgets**: Budget limits per category
5. **sms_import_logs**: SMS import session tracking
6. **duplicate_logs**: Duplicate transaction detection logs
7. **status_checks**: System health monitoring

### Data Types Used

- `STRING`: Text data, IDs, JSON strings
- `INT`: Integer values (counts, months, years)
- `REAL`: Floating-point numbers (amounts, scores)
- `BOOL`: Boolean values (TRUE/FALSE)

All JSON data (keywords, mpesa_details, sms_metadata) is stored as STRING and parsed at the application level.

## Key Improvements

### Before
- ❌ Missing SQL schema file
- ❌ Silent failures during table creation
- ❌ Poor error diagnostics
- ❌ No fallback mechanism

### After
- ✅ Complete SQL schema file
- ✅ Detailed error logging and reporting
- ✅ Comprehensive diagnostics tool
- ✅ Automatic fallback to inline creation
- ✅ Better table verification
- ✅ Retry logic for failed operations

## Testing Checklist

- [ ] Environment variables are set correctly
- [ ] PesaDB API is accessible
- [ ] Database can be created
- [ ] All 7 tables are created successfully
- [ ] Tables can be queried
- [ ] Default categories are seeded
- [ ] Default user can be created
- [ ] Verification passes

## Support

If you continue to experience issues:

1. Run the diagnostic tool and save the output
2. Check server logs for detailed error messages
3. Verify PesaDB API service status
4. Ensure all environment variables are configured
5. Test with the manual initialization script

## References

- Database configuration: `backend/config/pesadb.py`
- Initialization service: `backend/services/database_initializer.py`
- SQL schema: `backend/scripts/init_pesadb.sql`
- Diagnostic tool: `backend/test_database_connection.py`
- Server startup: `backend/server.py` (startup event handler)
