# Automatic Database Initialization Guide

## Overview

Your M-Pesa Expense Tracker now features **automatic database initialization** that runs every time the backend server starts. This eliminates the need to manually run database setup scripts.

## What Was Fixed

### 1. Backend Changes ✅

#### New Files Created:
- **`backend/services/database_initializer.py`** - Automatic database initialization service
- **`backend/check_environment.py`** - Environment configuration checker

#### Modified Files:
- **`backend/server.py`** - Added startup event to automatically initialize database
  - Creates all required tables if they don't exist
  - Seeds default categories on first run
  - Verifies database health
  - Enhanced health check endpoint with database stats

### 2. Frontend Changes ✅

#### Modified Files:
- **`frontend/contexts/AuthContext.tsx`** - Improved error handling
  - Added retry logic for backend connection issues
  - Better handling of server errors (500+)
  - Improved timeout handling for cold starts
  
- **`frontend/app/index.tsx`** - Enhanced splash screen
  - Better loading state management
  - Minimum splash time for better UX
  - Clear navigation logging for debugging

## How Automatic Initialization Works

### On Server Startup:

1. **Check Tables** - Verifies if each required table exists
2. **Create Missing Tables** - Creates any tables that don't exist
3. **Seed Categories** - Adds default categories if none exist
4. **Verify Database** - Confirms all tables are accessible
5. **Log Results** - Provides detailed feedback in console

### Database Tables Created:

- ✅ `users` - User authentication and preferences
- ✅ `categories` - Transaction categories with keywords
- ✅ `transactions` - M-Pesa transactions with metadata
- ✅ `budgets` - Monthly budget allocations
- ✅ `sms_import_logs` - SMS import history
- ✅ `duplicate_logs` - Duplicate detection tracking
- ✅ `status_checks` - Health monitoring

### Default Categories Seeded:

1. 🍔 Food & Dining
2. 🚗 Transport
3. 🛍️ Shopping
4. 📱 Bills & Utilities
5. 🎬 Entertainment
6. ⚕️ Health & Fitness
7. 📚 Education
8. 📞 Airtime & Data
9. 💸 Money Transfer
10. 💰 Savings & Investments
11. 📌 Other

## Setup & Configuration

### Required Environment Variables:

```bash
# .env file in backend directory
PESADB_API_KEY=your_pesadb_api_key_here
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_DATABASE=mpesa_tracker
```

### Check Your Environment:

```bash
cd backend
python check_environment.py
```

This will verify all required environment variables are set.

## Running the Application

### Backend:

```bash
cd backend
python server.py
# or
uvicorn server:app --reload
```

**What happens on startup:**
```
🚀 Server starting up - checking database...
📝 Creating table 'users'...
✅ Table 'users' created successfully
📝 Creating table 'categories'...
✅ Table 'categories' created successfully
... (all tables)
📦 Seeding default categories...
✅ Seeded category: Food & Dining
... (all categories)
✅ Database ready: 7 tables created, 0 existed, 11 categories seeded
```

### Frontend:

```bash
cd frontend
npm start
```

**What happens on app launch:**
```
🔍 Checking user status at: https://your-backend.com/api/auth/user-status
📡 Response received
✅ User status data: { has_user: false }
🆕 No user found, navigating to PIN setup
```

## Manual Database Management

### View Database Initialization Script:
```bash
cat backend/scripts/init_pesadb.sql
```

### Run Manual Initialization (Optional):
```bash
cd backend
python scripts/init_database.py
```

Note: This is **no longer required** as initialization happens automatically on server startup.

## Testing Database Initialization

### Test 1: Fresh Database
1. Delete all tables from PesaDB (if they exist)
2. Start the backend server
3. Check console logs - should see tables being created
4. Visit `/api/health` endpoint - should show database initialized

### Test 2: Existing Database
1. Start the server with existing tables
2. Check console logs - should see "already exists" messages
3. No duplicate data should be created

### Test 3: Health Check
```bash
curl http://localhost:8000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-14T...",
  "database": {
    "status": "connected",
    "initialized": true,
    "type": "PesaDB",
    "stats": {
      "users": 0,
      "categories": 11,
      "transactions": 0
    }
  },
  "message": "M-Pesa Expense Tracker Backend is running (PesaDB)"
}
```

## Frontend PIN Flow

### First Time User:
1. App checks backend for user status
2. Backend returns `has_user: false`
3. App navigates to **Setup PIN** screen
4. User creates PIN and security question
5. Backend creates user and default categories
6. User is logged in and navigated to main app

### Returning User:
1. App checks if user is logged in locally
2. If yes → Navigate to main app
3. If no but user exists → Navigate to **Verify PIN** screen
4. User enters PIN
5. App verifies and logs in

## Troubleshooting

### Issue: "Backend URL not configured"
**Solution:** Check `frontend/config/api.ts` and ensure BACKEND_URL is set

### Issue: "PESADB_API_KEY environment variable is required"
**Solution:** 
1. Create `.env` file in backend directory
2. Add `PESADB_API_KEY=your_key`
3. Restart server

### Issue: App shows PIN setup instead of verify
**Possible Causes:**
1. User doesn't exist in database
2. Backend returned error during user status check
3. Database not initialized

**Solution:**
1. Check backend logs for errors
2. Visit `/api/health` to verify database status
3. Check `/api/auth/user-status` response

### Issue: Tables not created on startup
**Solution:**
1. Check PesaDB API key is valid
2. Check backend logs for specific error
3. Verify PesaDB service is accessible
4. Run `python check_environment.py`

## Manual Category Creation

If you want to manually add categories to the database:

```sql
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default) 
VALUES (
  'cat-custom', 
  NULL, 
  'Custom Category', 
  '🎯', 
  '#FF5733', 
  '["keyword1", "keyword2"]', 
  FALSE
);
```

**Note:** 
- `user_id` can be NULL for default/shared categories
- `keywords` must be a valid JSON array as a string
- `is_default` should be FALSE for user-created categories

## Benefits of Automatic Initialization

✅ **No Manual Setup** - Database ready on first startup
✅ **Idempotent** - Safe to run multiple times
✅ **Self-Healing** - Recreates missing tables
✅ **Development Friendly** - Easy to reset and test
✅ **Production Ready** - Handles Render/deployment cold starts
✅ **Error Resilient** - Frontend retries on failures

## Next Steps

Your database will now:
1. ✅ Automatically initialize on backend startup
2. ✅ Create all required tables
3. ✅ Seed default categories
4. ✅ Be ready for the app to use

You can now:
- Start the backend server
- Launch the frontend app
- Create your PIN
- Start tracking expenses!

## Questions?

If you encounter any issues:
1. Check the backend console logs
2. Visit `/api/health` endpoint
3. Run `python check_environment.py`
4. Check this guide's troubleshooting section
