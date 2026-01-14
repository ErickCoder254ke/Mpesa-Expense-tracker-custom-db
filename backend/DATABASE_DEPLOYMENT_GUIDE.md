# M-Pesa Expense Tracker - Database Deployment Guide

## 🚀 Automatic Database Initialization

This application uses **PesaDB** (a custom SQL database) and includes **fully automatic database initialization** that runs on every server startup. When you deploy the application, the database will be ready to use immediately with all required tables, relations, and seed data.

---

## ✅ What Happens Automatically on Deployment

When the backend server starts (whether locally or in production), the following happens automatically:

### 1. **Database Creation**
- Checks if the configured database exists
- Creates the database if it doesn't exist
- Uses the database name from `PESADB_DATABASE` environment variable (default: `mpesa_tracker`)

### 2. **Table Creation**
All required tables are created with proper relationships:

| Table | Purpose | Relations |
|-------|---------|-----------|
| `users` | User accounts with PIN authentication | - |
| `categories` | Expense/income categories with keywords | - |
| `transactions` | Financial transactions (manual & SMS) | References `users`, `categories` |
| `budgets` | Monthly budget allocations | References `users`, `categories` |
| `sms_import_logs` | SMS import session tracking | References `users` |
| `duplicate_logs` | Duplicate transaction detection | References `users` |
| `status_checks` | System health checks | - |

### 3. **Default Categories Seeded**
12 default categories are automatically inserted with Kenyan-specific keywords:

1. **Food & Dining** 🍔 - restaurant, nyama choma, KFC, Java, etc.
2. **Transport** 🚗 - matatu, Uber, Bolt, fuel stations, etc.
3. **Shopping** 🛍️ - supermarkets (Carrefour, Naivas, Quickmart), malls, etc.
4. **Bills & Utilities** 📱 - KPLC, Safaricom, Zuku, rent, DStv, etc.
5. **Entertainment** 🎬 - cinema, Netflix, Showmax, clubs, concerts, etc.
6. **Health & Fitness** ⚕️ - hospitals, pharmacies, gyms, clinics, etc.
7. **Education** 📚 - schools, universities, books, tuition, etc.
8. **Airtime & Data** 📞 - Safaricom, Airtel, Telkom bundles, etc.
9. **Money Transfer** 💸 - M-Pesa transfers, Paybill, Till, etc.
10. **Savings & Investments** 💰 - M-Shwari, KCB M-Pesa, Fuliza, etc.
11. **Income** 💵 - salary, payments received, deposits, etc.
12. **Other** 📌 - miscellaneous expenses

### 4. **Default User Creation** (Optional)
- Creates a default user if no users exist
- Default PIN: `0000` (user should change on first login)
- Security question: "What is your favorite color?"

### 5. **Database Verification**
- Verifies all tables exist and are accessible
- Logs detailed status information
- Server continues even if some initialization steps fail

---

## 🔧 Configuration

### Required Environment Variables

Create a `.env` file in the `backend/` directory with:

```env
# PesaDB Configuration (REQUIRED)
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_API_KEY=your_api_key_here
PESADB_DATABASE=mpesa_tracker

# Other settings
PORT=8000
```

### Important Notes:

1. **PESADB_API_KEY is required** - The server will fail if this is not set
2. **Database name** can be customized via `PESADB_DATABASE` (default: `mpesa_tracker`)
3. **API URL** defaults to the production PesaDB instance if not specified

---

## 📋 Deployment Checklist

When deploying to production (e.g., Render, Railway, Fly.io):

### ✅ Before Deployment

- [ ] Set `PESADB_API_KEY` environment variable in your hosting platform
- [ ] Set `PESADB_DATABASE` environment variable (optional, defaults to `mpesa_tracker`)
- [ ] Ensure `backend/scripts/init_pesadb.sql` file exists in your repository
- [ ] Verify `requirements.txt` includes all dependencies

### ✅ After Deployment

- [ ] Check deployment logs for "Database ready" message
- [ ] Visit `/api/health` endpoint to verify database connectivity
- [ ] Confirm categories were seeded (should see 12 categories)
- [ ] Test creating a user or use the default user (PIN: `0000`)

---

## 🔍 Monitoring Database Initialization

### Startup Logs

When the server starts, you'll see logs like this:

```
🚀 Server starting up - checking database...
🔍 Checking if database 'mpesa_tracker' exists...
✅ Database 'mpesa_tracker' already exists
📝 Step 1: Creating tables...
📖 Loading SQL schema from init_pesadb.sql...
📝 Found 19 SQL statements to execute
📝 Creating table 'users'...
✅ Table 'users' created successfully
... (more tables) ...
📦 Now executing INSERT statements for seed data...
✅ Inserted 12 seed data records
📝 Step 2: Verifying database...
✅ Database verification successful - all 7 tables exist
✅ Categories already seeded (12 exist)
✅ Database ready: 7 tables created, 0 existed, 0 categories seeded, Default user already exists
```

### Health Check Endpoint

Check database status at any time:

```bash
curl https://your-app.com/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-14T12:00:00Z",
  "database": {
    "status": "connected",
    "initialized": true,
    "type": "PesaDB",
    "api_url": "https://pesacoredb-backend.onrender.com/api",
    "database_name": "mpesa_tracker",
    "api_key_configured": true,
    "stats": {
      "users": 1,
      "categories": 12,
      "transactions": 0
    }
  }
}
```

---

## 🛠️ Manual Initialization (Troubleshooting)

If automatic initialization fails, you can trigger it manually:

### Option 1: API Endpoint

```bash
curl -X POST https://your-app.com/api/initialize-database
```

**Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "details": {
    "tables_created": 7,
    "tables_skipped": 0,
    "categories_seeded": 12,
    "user_created": true,
    "verified": true,
    "errors": []
  }
}
```

### Option 2: Python Script (Local)

```bash
cd backend
python scripts/init_database.py
```

**Output:**
```
============================================================
  PesaDB Database Initialization
  M-Pesa Expense Tracker
============================================================

🚀 Starting PesaDB initialization...
📝 Found 19 SQL statements to execute
... (initialization process) ...
✅ Database initialization completed!
   - Successful: 19
   - Errors: 0
```

---

## 🐛 Troubleshooting

### Problem: "PESADB_API_KEY environment variable is required"

**Solution:** Set the `PESADB_API_KEY` environment variable in your `.env` file or hosting platform.

```bash
# .env
PESADB_API_KEY=your_actual_api_key_here
```

### Problem: "Table already exists" errors

**Solution:** This is normal! The initialization process is idempotent - it safely skips existing tables.

### Problem: Categories not showing in the app

**Solution:**
1. Check `/api/health` - verify `categories: 12`
2. Try manual initialization: `POST /api/initialize-database`
3. Check if categories table exists: Look for "categories" in logs

### Problem: Database verification fails

**Solution:**
1. Check if PesaDB API is accessible
2. Verify `PESADB_API_URL` is correct
3. Ensure your API key has proper permissions
4. Try manual initialization script

### Problem: "Database query failed" errors

**Solution:**
1. Verify all environment variables are set correctly
2. Check if PesaDB service is running
3. Review API key permissions
4. Check network connectivity to PesaDB API

---

## 📚 PesaDB Specific Considerations

### Supported Features ✅

- ✅ Single-column PRIMARY KEY (required)
- ✅ FOREIGN KEY constraints (REFERENCES)
- ✅ UNIQUE constraints
- ✅ Basic data types (STRING, INT, FLOAT, BOOL, DATE, DATETIME)
- ✅ WHERE clauses with complex expressions
- ✅ JOINs (INNER, LEFT, RIGHT, FULL OUTER)
- ✅ Aggregates (COUNT, SUM, AVG, MIN, MAX)
- ✅ GROUP BY and HAVING
- ✅ ORDER BY, LIMIT, OFFSET

### Not Supported ❌

- ❌ AUTO_INCREMENT (use UUIDs generated by application)
- ❌ DEFAULT values (all columns must be provided in INSERT)
- ❌ Composite PRIMARY KEYs (only single column)
- ❌ ALTER TABLE (schema changes require drop/recreate)
- ❌ Transactions (BEGIN/COMMIT/ROLLBACK)
- ❌ IF NOT EXISTS in CREATE TABLE

### Schema Design Implications

1. **UUIDs for IDs**: All primary keys use UUID strings generated by the application
2. **All columns required**: No DEFAULT or NULL constraints - provide all values in INSERT
3. **JSON as strings**: Complex data stored as JSON strings (e.g., `keywords`, `mpesa_details`)
4. **Dates as ISO strings**: All timestamps stored as ISO 8601 strings
5. **Booleans**: Use `TRUE`/`FALSE` (not 0/1)

---

## 📊 Database Schema Reference

### Users Table
```sql
CREATE TABLE users (
    id STRING PRIMARY KEY,           -- UUID
    pin_hash STRING,                 -- Bcrypt hash
    security_question STRING,        -- Optional
    security_answer_hash STRING,     -- Optional
    created_at STRING,               -- ISO 8601 datetime
    preferences STRING               -- JSON string
);
```

### Categories Table
```sql
CREATE TABLE categories (
    id STRING PRIMARY KEY,           -- UUID or custom ID
    user_id STRING,                  -- NULL for default categories
    name STRING,                     -- Category name
    icon STRING,                     -- Emoji icon
    color STRING,                    -- Hex color
    keywords STRING,                 -- JSON array of strings
    is_default BOOL                  -- TRUE for system categories
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
    id STRING PRIMARY KEY,               -- UUID
    user_id STRING REFERENCES users(id), -- Foreign key
    amount FLOAT,                        -- Transaction amount
    type STRING,                         -- 'expense' or 'income'
    category_id STRING REFERENCES categories(id), -- Foreign key
    description STRING,                  -- Transaction description
    date STRING,                         -- ISO 8601 datetime
    source STRING,                       -- 'manual', 'sms', 'api'
    mpesa_details STRING,                -- JSON string (optional)
    sms_metadata STRING,                 -- JSON string (optional)
    created_at STRING,                   -- ISO 8601 datetime
    transaction_group_id STRING,         -- Optional grouping ID
    transaction_role STRING,             -- 'primary', 'fee', etc.
    parent_transaction_id STRING         -- Reference to parent transaction
);
```

### Budgets Table
```sql
CREATE TABLE budgets (
    id STRING PRIMARY KEY,                         -- UUID
    user_id STRING REFERENCES users(id),           -- Foreign key
    category_id STRING REFERENCES categories(id),  -- Foreign key
    amount FLOAT,                                  -- Budget amount
    period STRING,                                 -- 'monthly'
    month INT,                                     -- 1-12
    year INT,                                      -- e.g. 2025
    created_at STRING                              -- ISO 8601 datetime
);
```

---

## 🎯 Summary

The M-Pesa Expense Tracker includes **fully automatic database initialization** that:

1. ✅ Creates all required tables with proper relationships
2. ✅ Seeds 12 default categories with Kenyan-specific keywords
3. ✅ Creates a default user (optional)
4. ✅ Verifies database integrity
5. ✅ Works on every server startup (idempotent)
6. ✅ Provides detailed logging for monitoring
7. ✅ Includes manual initialization fallbacks

**You don't need to do anything manually** - just deploy with the correct environment variables and the database will be ready to use!

---

## 📞 Support

If you encounter issues:

1. Check the logs for detailed error messages
2. Review this guide's troubleshooting section
3. Verify all environment variables are set correctly
4. Use the `/api/health` endpoint to check database status
5. Try manual initialization if needed

The initialization process is designed to be robust and will continue even if some steps fail, ensuring your application remains operational.
