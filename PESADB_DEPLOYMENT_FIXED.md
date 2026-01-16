# PesaDB Deployment - Fixed Guide

## ✅ Issues Fixed

This guide documents the fixes applied to resolve database initialization failures.

### Problems Identified and Resolved

1. **❌ Missing SQL File** → ✅ Created `backend/scripts/init_pesadb.sql`
2. **❌ Wrong API Endpoints** → ✅ Removed unsupported `/databases` endpoint calls
3. **❌ Silent Failures** → ✅ Improved error logging and fail-fast behavior
4. **❌ Poor SQL Parsing** → ✅ Enhanced SQL statement parser

---

## 🔧 Required Environment Variables

### Backend (Railway)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `PESADB_API_KEY` | ✅ Yes | `pk_abc123...` | PesaDB API key from dashboard |
| `PESADB_API_URL` | ✅ Yes | `https://your-pesadb.onrender.com/api` | PesaDB API endpoint |
| `PESADB_DATABASE` | ✅ Yes | `mpesa_tracker` | Database name (pre-created in PesaDB) |
| `JWT_SECRET_KEY` | ✅ Yes | `<64-char-random>` | Authentication secret |

**⚠️ CRITICAL:** 
- Your PesaDB database must be **pre-created** via the PesaDB dashboard
- The API does **NOT** support database creation programmatically
- Ensure the database name in `PESADB_DATABASE` matches your PesaDB dashboard

### Generate JWT Secret

```bash
# Generate a secure 64-character secret
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## 🚀 Deployment Steps

### Step 1: Prepare PesaDB Database

1. **Log into your PesaDB dashboard**
2. **Create a new database** named `mpesa_tracker` (or your preferred name)
3. **Copy your API key** (starts with `pk_...`)
4. **Copy your API URL** (should end with `/api`)
5. **Verify connectivity:**
   ```bash
   curl -X POST "YOUR_PESADB_API_URL/query" \
     -H "X-API-Key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"sql": "SELECT 1 as test", "db": "mpesa_tracker"}'
   ```

### Step 2: Configure Railway Environment Variables

1. Go to Railway Dashboard → Your Backend Service
2. Click "Variables" tab
3. Add these variables:

```env
PESADB_API_KEY=pk_your_actual_key_here
PESADB_API_URL=https://your-pesadb-instance.onrender.com/api
PESADB_DATABASE=mpesa_tracker
JWT_SECRET_KEY=<generated-64-char-secret>
```

4. Click "Deploy" to trigger a rebuild

### Step 3: Verify Backend Deployment

1. **Wait for Railway deployment to complete** (2-3 minutes)
2. **Get your Railway backend URL:**
   ```
   https://mpesa-expense-tracker-custom-db-production.up.railway.app
   ```
3. **Test the health endpoint:**
   ```bash
   curl https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/health
   ```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": {
    "status": "tables_missing",
    "initialized": false,
    "config": {
      "api_url": "https://your-pesadb.onrender.com/api",
      "database_name": "mpesa_tracker",
      "api_key_configured": true
    }
  }
}
```

### Step 4: Initialize Database Tables

**Option A: Automatic (on startup)**
- Tables are created automatically when the backend starts
- Check Railway logs for initialization success

**Option B: Manual (via API)**
```bash
curl -X POST https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/initialize-database
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "details": {
    "tables_created": 7,
    "tables_skipped": 0,
    "categories_seeded": 12,
    "verified": true
  }
}
```

### Step 5: Verify Database Initialization

**Check health endpoint again:**
```bash
curl https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/health
```

**Expected Response (Success):**
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "initialized": true,
    "tables": {
      "users": {"exists": true, "count": 0},
      "categories": {"exists": true, "count": 12},
      "transactions": {"exists": true, "count": "exists"},
      "budgets": {"exists": true, "count": "exists"}
    }
  }
}
```

---

## 🎯 Startup Flow (Fixed)

### What Happens on Backend Start

```
1. Server Starts
   ↓
2. Load Environment Variables
   - PESADB_API_KEY
   - PESADB_API_URL
   - PESADB_DATABASE
   ↓
3. Validate Configuration
   - Check API key exists
   - Check API URL is set
   - Check database name is set
   ↓
4. Assume Database Exists
   ⚠️  PesaDB databases must be pre-created
   ↓
5. Load SQL Schema from init_pesadb.sql
   - Parse CREATE TABLE statements
   - Parse INSERT statements (seed data)
   ↓
6. Create Tables (if not exist)
   - Check each table existence first
   - Skip if already exists
   - Create if missing
   ↓
7. Seed Default Categories
   - 12 default M-Pesa categories
   - Skip if categories already exist
   ↓
8. Verify All Tables
   - users ✓
   - categories ✓
   - transactions ✓
   - budgets ✓
   - sms_import_logs ✓
   - duplicate_logs ✓
   - status_checks ✓
   ↓
9. Server Ready ✅
```

---

## 📊 Database Schema

### Tables Created

1. **users** - User accounts (email/password authentication)
2. **categories** - Expense categories with keywords
3. **transactions** - Financial transactions
4. **budgets** - Monthly budget limits
5. **sms_import_logs** - SMS import tracking
6. **duplicate_logs** - Duplicate detection logs
7. **status_checks** - Health check logs

### Seed Data

- **12 default categories** automatically created:
  - Food & Dining 🍔
  - Transport 🚗
  - Shopping 🛍️
  - Bills & Utilities 📱
  - Entertainment 🎬
  - Health & Fitness ⚕️
  - Education 📚
  - Airtime & Data 📞
  - Money Transfer 💸
  - Savings & Investments 💰
  - Income 💵
  - Other 📌

---

## 🔗 Frontend Configuration

### Update Frontend Environment Variable

The frontend needs your Railway backend URL:

**File: `frontend/.env`**
```env
EXPO_PUBLIC_BACKEND_URL=https://mpesa-expense-tracker-custom-db-production.up.railway.app
```

**⚠️ Important:**
- Use your actual Railway URL (the one you deployed to)
- No trailing slash
- Must start with `https://`
- No `/api` suffix (the frontend adds it automatically)

### Verify Frontend Connection

After updating the `.env` file:

1. **Local Development:**
   ```bash
   cd frontend
   npm run reset  # Clear cache
   npm start      # Start dev server
   ```

2. **Check console logs** - you should see:
   ```
   ✅ Using environment variable URL: https://mpesa-expense-tracker-custom-db-production.up.railway.app
   ```

3. **For Render Deployment:**
   - Update `EXPO_PUBLIC_BACKEND_URL` in Render dashboard
   - Trigger **"Clear build cache & deploy"**
   - Wait for rebuild (5-10 minutes)

---

## 🐛 Troubleshooting

### Issue: "PesaDB Error: Not Found"

**Cause:** API endpoint doesn't exist or wrong URL

**Solutions:**
1. ✅ Verify `PESADB_API_URL` ends with `/api`
2. ✅ Test connectivity with curl (see Step 1)
3. ✅ Check PesaDB dashboard is accessible
4. ✅ Verify API key is correct

**Test command:**
```bash
curl -X POST "$PESADB_API_URL/query" \
  -H "X-API-Key: $PESADB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1", "db": "mpesa_tracker"}'
```

---

### Issue: "Database query failed"

**Cause:** Database doesn't exist or wrong database name

**Solutions:**
1. ✅ Check `PESADB_DATABASE` matches dashboard
2. ✅ Verify database was created in PesaDB dashboard
3. ✅ Try creating tables manually via dashboard

---

### Issue: "Tables not created"

**Cause:** SQL execution failed silently

**Solutions:**
1. ✅ Check Railway logs for errors
2. ✅ Manually trigger initialization:
   ```bash
   curl -X POST https://your-backend.railway.app/api/initialize-database
   ```
3. ✅ Verify SQL syntax in `backend/scripts/init_pesadb.sql`

---

### Issue: "Frontend can't connect"

**Cause:** Wrong backend URL or backend not running

**Solutions:**
1. ✅ Test backend health endpoint directly
2. ✅ Verify `EXPO_PUBLIC_BACKEND_URL` is correct
3. ✅ Check Railway deployment logs
4. ✅ Ensure backend is not sleeping (Railway free tier)

---

## ✅ Final Checklist

### Backend (Railway)

- [ ] PesaDB database created in dashboard
- [ ] `PESADB_API_KEY` set in Railway
- [ ] `PESADB_API_URL` set in Railway
- [ ] `PESADB_DATABASE` set in Railway
- [ ] `JWT_SECRET_KEY` set in Railway
- [ ] Backend deployed successfully
- [ ] Health endpoint returns `"status": "healthy"`
- [ ] Database shows `"initialized": true`
- [ ] All 7 tables exist
- [ ] 12 categories seeded

### Frontend

- [ ] `EXPO_PUBLIC_BACKEND_URL` updated to Railway URL
- [ ] Frontend cache cleared (`npm run reset`)
- [ ] Dev server restarted
- [ ] Console shows correct backend URL
- [ ] Login/signup works
- [ ] Categories load correctly

---

## 📞 Support

### Backend Logs

```bash
# View Railway logs
railway logs --tail
```

Look for:
- ✅ `Database initialized successfully`
- ✅ `7 tables created`
- ✅ `12 categories seeded`
- ❌ `Database initialization failed`
- ❌ `PesaDB Error`

### Health Check

```bash
# Always test this first
curl https://your-backend.railway.app/api/health | jq
```

### Manual Initialization

```bash
# Force re-initialization
curl -X POST https://your-backend.railway.app/api/initialize-database | jq
```

---

## 🎉 Success Indicators

You know everything is working when:

1. **Backend Health Check:**
   ```json
   {
     "status": "healthy",
     "database": {
       "status": "connected",
       "initialized": true
     }
   }
   ```

2. **Railway Logs show:**
   ```
   ✅ Database initialized successfully
   ✅ 7 tables created, 0 existed
   ✅ 12 categories seeded
   ✅ Database verification successful
   ```

3. **Frontend connects successfully:**
   - Login screen loads
   - Categories appear
   - No connection errors

---

## 📝 Key Changes Made

### Files Created
- ✅ `backend/scripts/init_pesadb.sql` - Complete database schema

### Files Modified
- ✅ `backend/config/pesadb.py` - Removed unsupported `/databases` calls
- ✅ `backend/services/database_initializer.py` - Improved SQL parsing and error handling
- ✅ `backend/server.py` - Enhanced health check endpoint
- ✅ `frontend/.env` - Updated backend URL to Railway

### What Was Fixed
1. **Database Creation**: Now assumes database is pre-created (PesaDB requirement)
2. **API Endpoints**: Removed calls to non-existent `/databases` endpoint
3. **SQL Parsing**: Fixed parser to properly detect executable statements
4. **Error Handling**: Better logging, fail-fast on critical errors
5. **Health Checks**: Comprehensive status reporting for debugging

---

## 🔐 Security Notes

- **Never commit** `PESADB_API_KEY` to git
- **Use Railway secrets** for sensitive variables
- **Rotate JWT_SECRET_KEY** if compromised
- **API keys** should start with `pk_` prefix

---

## 📚 Additional Resources

- **PesaDB Documentation**: Check your PesaDB dashboard for API docs
- **Railway Documentation**: https://docs.railway.app
- **Backend API Documentation**: `https://your-backend.railway.app/docs`

---

**Last Updated:** 2025-01-16
**Schema Version:** 2.0.0
**Status:** ✅ Production Ready
