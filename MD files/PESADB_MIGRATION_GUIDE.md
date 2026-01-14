# PesaDB Migration Guide

## Overview

This document describes the migration from MongoDB to PesaDB for the M-Pesa Expense Tracker backend. The migration maintains all UI, features, and styling while replacing only the data access layer.

## Migration Status

### ✅ Completed (Core Features Working)

1. **PesaDB Integration Layer**
   - `backend/config/pesadb.py` - PesaDB client and connection utilities
   - `backend/services/pesadb_service.py` - Service layer with all data operations
   - `backend/scripts/init_pesadb.sql` - SQL schema for all tables
   - `backend/scripts/init_database.py` - Database initialization script

2. **Migrated Routes**
   - `backend/routes/auth.py` - User authentication (PIN setup/verify)
   - `backend/routes/categories.py` - Category management
   - `backend/routes/transactions.py` - Transaction CRUD and analytics
   - `backend/routes/budgets.py` - Budget management
   - `backend/routes/sms_integration.py` - SMS parsing and import

3. **Migrated Services**
   - `backend/services/duplicate_detector.py` - SMS duplicate detection

### ⚠️ Pending Migration

1. **Advanced Services (Not Currently Used)**
   - `backend/services/frequency_analyzer.py` - Transaction pattern analysis (uses MongoDB aggregation)
   - `backend/services/budget_monitoring.py` - Advanced budget insights (uses MongoDB aggregation)

   **Note:** These services are mentioned in route comments but not actively called. They can be migrated later if needed.

## Environment Configuration

### Required Environment Variables

Create or update your `.env` file in the `backend` directory:

```env
# PesaDB Configuration (Required)
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_API_KEY=your_pesadb_api_key_here
PESADB_DATABASE=mpesa_tracker

# Legacy MongoDB (No longer required - can be removed)
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=mpesa_tracker
```

### Getting Your PesaDB API Key

1. Contact PesaDB support to obtain an API key
2. Ensure your PesaDB instance is accessible at the configured `PESADB_API_URL`
3. Set the `PESADB_API_KEY` environment variable before starting the backend

## Database Initialization

### 1. Create Database Schema

Run the initialization script to set up all required tables:

```bash
cd backend
python scripts/init_database.py
```

This script will:
- Create all necessary tables (users, categories, transactions, budgets, etc.)
- Create appropriate indexes for performance
- Seed default categories

### 2. SQL Schema Overview

The following tables are created:

**Core Tables:**
- `users` - User accounts and PIN hashes
- `categories` - Expense/income categories
- `transactions` - All transactions (manual and SMS)
- `budgets` - Monthly budget allocations

**SMS Integration Tables:**
- `sms_import_logs` - SMS import session tracking
- `duplicate_logs` - Duplicate detection logging
- `status_checks` - System status checks

### 3. Table Structure Example

```sql
-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category_id VARCHAR(255),
  description TEXT,
  date TIMESTAMP,
  source VARCHAR(50),
  mpesa_details TEXT,  -- JSON string
  sms_metadata TEXT,   -- JSON string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints (Unchanged)

All API endpoints remain the same. The frontend does not need any changes.

### Authentication
- `POST /api/users/` - Create user and set PIN
- `POST /api/users/verify-pin` - Verify PIN
- `GET /api/users/status` - Check user status

### Transactions
- `GET /api/transactions/` - List transactions (with filters)
- `POST /api/transactions/` - Create transaction
- `GET /api/transactions/{id}` - Get single transaction
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Categories
- `GET /api/categories/` - List all categories
- `POST /api/categories/` - Create category
- `DELETE /api/categories/{id}` - Delete category

### Budgets
- `GET /api/budgets/` - List budgets with progress
- `POST /api/budgets/` - Create budget
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget

### SMS Integration
- `POST /api/sms/parse` - Parse single SMS
- `POST /api/sms/import` - Batch import SMS messages
- `GET /api/sms/import-status/{id}` - Check import status
- `POST /api/sms/create-transaction` - Create transaction from parsed SMS
- `GET /api/sms/test-parser` - Test parser with sample messages

## Migration Details

### Data Model Mapping

**MongoDB → PesaDB**
- `ObjectId` → `VARCHAR(255)` IDs (UUID format)
- Embedded documents → JSON strings (e.g., `mpesa_details`, `sms_metadata`)
- Date fields → ISO 8601 timestamp strings
- Arrays → JSON strings (e.g., `keywords`, `errors`)

### JSON Field Handling

PesaDB stores complex objects as JSON strings. The service layer automatically:
- Serializes Python dicts/lists to JSON when saving
- Deserializes JSON strings to Python objects when reading

Example:
```python
# Saving
transaction_data = {
    "mpesa_details": {
        "transaction_id": "ABC123",
        "recipient": "John Doe"
    }
}
# Automatically converted to: '{"transaction_id":"ABC123","recipient":"John Doe"}'

# Reading
transaction = await db_service.get_transaction_by_id(txn_id)
mpesa_details = transaction["mpesa_details"]  # Automatically parsed to dict
```

### Duplicate Detection

The duplicate detector now uses PesaDB service methods:
- Hash-based detection: `get_transaction_by_message_hash()`
- M-Pesa ID detection: `get_transaction_by_mpesa_id()`
- Similar transactions: `get_similar_transactions()`

### Aggregation Replacement

MongoDB aggregation pipelines have been replaced with SQL queries:

**Example: Category spending summary**
```python
# MongoDB aggregation
await db.transactions.aggregate([
    {"$match": {"type": "expense"}},
    {"$group": {"_id": "$category_id", "total": {"$sum": "$amount"}}}
])

# PesaDB SQL
await query_db("""
    SELECT category_id, SUM(amount) as total
    FROM transactions
    WHERE type = 'expense'
    GROUP BY category_id
""")
```

## Testing the Migration

### 1. Health Check

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "status": "healthy",
  "message": "M-Pesa Expense Tracker API is running",
  "database_type": "PesaDB",
  "version": "2.0.0"
}
```

### 2. Test User Creation

```bash
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

### 3. Test Transaction Creation

```bash
curl -X POST http://localhost:8000/api/transactions/ \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.50,
    "type": "expense",
    "category_id": "cat_123",
    "description": "Test transaction",
    "date": "2025-01-14T12:00:00Z"
  }'
```

### 4. Test SMS Parser

```bash
curl -X POST http://localhost:8000/api/sms/parse \
  -H "Content-Type: application/json" \
  -d '{
    "message": "TJ6CF6NDST Confirmed.Ksh30.00 sent to SIMON NDERITU on 6/10/25 at 7:43 AM. New M-PESA balance is Ksh21.73."
  }'
```

## Deployment Considerations

### Render.com Deployment

Update your `render.yaml` to include PesaDB environment variables:

```yaml
services:
  - type: web
    name: mpesa-expense-tracker-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "python -m uvicorn server:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PESADB_API_URL
        value: https://pesacoredb-backend.onrender.com/api
      - key: PESADB_API_KEY
        sync: false  # Set in Render dashboard
      - key: PESADB_DATABASE
        value: mpesa_tracker
```

### Environment Variables in Render

1. Go to your service in Render dashboard
2. Navigate to "Environment" tab
3. Add the following variables:
   - `PESADB_API_URL`
   - `PESADB_API_KEY` (use "Add Secret File" for sensitive data)
   - `PESADB_DATABASE`

4. Remove old MongoDB variables:
   - `MONGO_URL`
   - `DB_NAME`

## Troubleshooting

### Common Issues

**1. "PESADB_API_KEY environment variable is required"**
- Ensure `.env` file exists with `PESADB_API_KEY` set
- Restart the backend server after setting the variable

**2. Database connection errors**
- Verify `PESADB_API_URL` is correct and accessible
- Check API key is valid
- Ensure PesaDB service is running

**3. JSON parsing errors**
- Check that complex fields (mpesa_details, sms_metadata) are valid JSON
- PesaDB service handles serialization automatically

**4. SMS import failures**
- Ensure categories are created first (run `init_database.py`)
- Check SMS message format matches parser expectations
- Review duplicate detection logs

### Debugging

Enable debug logging:
```python
# In server.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check PesaDB queries:
```python
# Queries are logged to console by default
# Look for SQL statements in backend output
```

## Performance Optimization

### Indexes

The initialization script creates indexes on commonly queried fields:
- `transactions(user_id, date)`
- `transactions(category_id)`
- `budgets(user_id, month, year)`
- `categories(user_id)`

### Query Optimization

- Use pagination for large result sets
- Filter by date ranges to reduce data scanned
- Limit result counts when appropriate

## Data Migration from MongoDB

If you have existing MongoDB data to migrate:

### 1. Export MongoDB Data

```bash
mongoexport --db mpesa_tracker --collection transactions --out transactions.json
mongoexport --db mpesa_tracker --collection categories --out categories.json
mongoexport --db mpesa_tracker --collection budgets --out budgets.json
mongoexport --db mpesa_tracker --collection users --out users.json
```

### 2. Transform and Import

Create a migration script:
```python
import json
from config.pesadb import execute_db
from services.pesadb_service import db_service

async def migrate_data():
    # Read exported data
    with open('transactions.json') as f:
        transactions = [json.loads(line) for line in f]
    
    # Transform and import
    for txn in transactions:
        # Transform MongoDB ObjectId to UUID string
        txn['id'] = str(txn['_id'])
        del txn['_id']
        
        # Import to PesaDB
        await db_service.create_transaction(txn)
```

## Frontend Changes

**None required!** The frontend continues to use the same API endpoints and data structures.

## Rollback Plan

If you need to rollback to MongoDB:

1. Restore original MongoDB-dependent files from git history
2. Update `.env` to use MongoDB connection
3. Restart backend server

Files to restore:
- `backend/routes/sms_integration.py`
- `backend/services/duplicate_detector.py`

## Future Enhancements

### Planned Migrations

1. **Frequency Analyzer**
   - Reimplement pattern detection using SQL window functions
   - Add SQL-based similarity scoring

2. **Budget Monitoring**
   - Replace aggregation pipelines with SQL GROUP BY queries
   - Implement date functions for trend analysis

### Performance Improvements

1. **Caching Layer**
   - Add Redis for frequently accessed data
   - Cache category lists and user settings

2. **Batch Operations**
   - Optimize bulk transaction inserts
   - Implement transaction batching for SMS import

## Support

For issues or questions:
- Check this migration guide
- Review PesaDB documentation
- Contact PesaDB support for database-specific issues
- Review backend logs for detailed error messages

## Version History

- **v2.0.0** (2025-01-14) - Initial PesaDB migration
  - Core routes migrated to PesaDB
  - SMS integration working with PesaDB
  - Duplicate detection migrated
  - All tests passing

---

**Migration completed successfully!** The application now runs on PesaDB while maintaining all features and UI.
