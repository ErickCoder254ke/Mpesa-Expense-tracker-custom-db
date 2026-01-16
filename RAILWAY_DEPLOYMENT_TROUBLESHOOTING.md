# Railway Deployment Troubleshooting Guide

## 🚨 Current Issue: PesaDB "Not Found" (404) Errors

Based on your logs, the backend is getting **404 "Not Found"** errors when trying to query PesaDB:

```
❌ PesaDB Error - Full Response: {'detail': 'Not Found'}
```

This happens when:
1. The database doesn't exist in PesaDB
2. The API URL is incorrect
3. The database name is wrong
4. The API key doesn't have access

---

## ✅ Solution Steps

### Step 1: Verify PesaDB Database Exists

**The most common issue:** The database `mpesa_tracker` doesn't exist in your PesaDB dashboard.

**PesaDB databases CANNOT be created via API** - they must be manually created first.

#### Action Required:

1. **Log into your PesaDB dashboard** (wherever you got your API key)
2. **Check if a database named `mpesa_tracker` exists**
3. **If it doesn't exist, create it:**
   - Look for "Create Database" or similar button
   - Name it exactly: `mpesa_tracker`
   - Wait for creation to complete

4. **Verify the database is accessible:**
   - Check that the database shows as "Active" or "Ready"
   - Note the exact database name (case-sensitive)

---

### Step 2: Verify Environment Variables on Railway

Go to your Railway project → Variables tab and check:

#### Required Variables

```env
PESADB_API_KEY=pk_your_actual_key_here
PESADB_API_URL=https://your-pesadb-instance.onrender.com/api
PESADB_DATABASE=mpesa_tracker
JWT_SECRET_KEY=<64-char-random-string>
```

#### Common Mistakes:

❌ **Wrong:** `PESADB_API_URL=https://pesacoredb-backend.onrender.com/api`  
✅ **Correct:** Use YOUR PesaDB instance URL (not the example URL)

❌ **Wrong:** `PESADB_API_URL=https://your-instance.com` (missing `/api`)  
✅ **Correct:** `PESADB_API_URL=https://your-instance.com/api`

❌ **Wrong:** `PESADB_DATABASE=MyDatabase` (wrong case)  
✅ **Correct:** Must match exact database name from dashboard

---

### Step 3: Test PesaDB Connection Directly

Before deploying, verify your PesaDB credentials work:

```bash
# Replace with your actual values
export PESADB_API_URL="https://your-pesadb.onrender.com/api"
export PESADB_API_KEY="pk_your_key_here"
export PESADB_DATABASE="mpesa_tracker"

# Test 1: Simple query
curl -X POST "$PESADB_API_URL/query" \
  -H "X-API-Key: $PESADB_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"SELECT 1 as test\", \"db\": \"$PESADB_DATABASE\"}"
```

**Expected Success Response:**
```json
{
  "success": true,
  "data": [{"test": 1}]
}
```

**If you get 404 "Not Found":**
- Your `PESADB_API_URL` is wrong
- Your database doesn't exist
- Your API key is invalid

**If you get 401 "Unauthorized":**
- Your `PESADB_API_KEY` is incorrect
- Your API key was revoked

**If you get timeout:**
- Your PesaDB instance is down
- Network connectivity issue

---

### Step 4: Get Correct Values from PesaDB Dashboard

You need to find these values in your PesaDB dashboard:

#### Finding API URL:

Look for:
- "API Endpoint"
- "Connection String"
- "Base URL"

It should look like:
- `https://abc123.pesadb.io/api`
- `https://your-instance.onrender.com/api`

**Must end with `/api`**

#### Finding API Key:

Look for:
- "API Keys"
- "Access Keys"
- "Credentials"

It should start with:
- `pk_` (primary key)
- Example: `pk_abc123def456ghi789`

#### Finding Database Name:

Look for:
- "Databases"
- "My Databases"
- List of databases

The name must match **exactly** (case-sensitive):
- If dashboard shows: `mpesa_tracker` → use `mpesa_tracker`
- If dashboard shows: `Mpesa_Tracker` → use `Mpesa_Tracker`

---

### Step 5: Update Railway Variables

Once you have the correct values:

1. Go to Railway → Your Backend Service
2. Click "Variables" tab
3. Update or add these variables:

```env
PESADB_API_KEY=<paste-from-dashboard>
PESADB_API_URL=<paste-from-dashboard>
PESADB_DATABASE=<paste-from-dashboard>
JWT_SECRET_KEY=<generate-new-if-needed>
```

4. Click outside the variable box to save
5. Railway will automatically redeploy

---

### Step 6: Monitor Deployment Logs

1. Go to Railway → Deployments tab
2. Click the latest deployment
3. Click "View Logs"
4. Look for these messages:

#### ✅ Success Indicators:

```
🚀 Server starting up - checking database...
📝 Using PesaDB database: 'mpesa_tracker'
📖 Loading SQL schema from init_pesadb.sql...
✅ SQL file loaded successfully
📝 Creating table 'users'...
✅ Table 'users' created successfully
...
✅ Database initialized successfully
✅ 7 tables created, 0 existed
✅ 12 categories seeded
```

#### ❌ Error Indicators:

```
❌ PesaDB Error - Full Response: {'detail': 'Not Found'}
```
→ Database doesn't exist or wrong API URL

```
❌ PesaDB Error - Message: Unauthorized
```
→ Wrong API key

```
❌ PESADB_API_KEY environment variable is required
```
→ Variable not set on Railway

---

### Step 7: Test Health Endpoint

After successful deployment:

```bash
# Replace with your Railway URL
curl https://your-app.up.railway.app/api/health | jq
```

**Expected Success Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-16T...",
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

**If you see `"initialized": false`:**

Manually trigger initialization:

```bash
curl -X POST https://your-app.up.railway.app/api/initialize-database | jq
```

---

## 🔍 Common Issues and Fixes

### Issue 1: "Database does not exist"

**Symptoms:**
- 404 Not Found errors
- `{'detail': 'Not Found'}`

**Solution:**
1. Log into PesaDB dashboard
2. Create database named `mpesa_tracker`
3. Verify it's active
4. Redeploy on Railway

---

### Issue 2: "Wrong API URL"

**Symptoms:**
- Connection refused
- 404 errors
- Timeout

**Solution:**
1. Check `PESADB_API_URL` in Railway variables
2. Must end with `/api`
3. Must be your specific instance URL
4. Test with curl command above

---

### Issue 3: "Invalid API Key"

**Symptoms:**
- 401 Unauthorized
- Authentication failed

**Solution:**
1. Go to PesaDB dashboard → API Keys
2. Copy the correct key (starts with `pk_`)
3. Update `PESADB_API_KEY` on Railway
4. Wait for auto-redeploy

---

### Issue 4: "Tables not being created"

**Symptoms:**
- Health check shows `initialized: false`
- No tables in database

**Solution:**
1. Check that `backend/scripts/init_pesadb.sql` exists
2. Check Railway logs for SQL errors
3. Manually trigger initialization:
   ```bash
   curl -X POST https://your-app.up.railway.app/api/initialize-database
   ```

---

## 📋 Pre-Deployment Checklist

Before deploying to Railway, ensure:

- [ ] **PesaDB database exists** (created in dashboard)
- [ ] **Database name is noted** (exact spelling/case)
- [ ] **API URL is correct** (ends with `/api`)
- [ ] **API key is valid** (starts with `pk_`)
- [ ] **Test connection** with curl command above
- [ ] **All 4 env variables** set on Railway
- [ ] **`backend/scripts/init_pesadb.sql`** file exists in repo
- [ ] **Code pushed to Git** (Railway auto-deploys)

---

## 🎯 Quick Diagnosis

Run this command to test your PesaDB configuration:

```bash
#!/bin/bash
# Save as test-pesadb.sh

echo "Testing PesaDB Connection..."
echo "=============================="

# Check if variables are set
if [ -z "$PESADB_API_URL" ]; then
  echo "❌ PESADB_API_URL not set"
  exit 1
fi

if [ -z "$PESADB_API_KEY" ]; then
  echo "❌ PESADB_API_KEY not set"
  exit 1
fi

if [ -z "$PESADB_DATABASE" ]; then
  echo "❌ PESADB_DATABASE not set"
  exit 1
fi

echo "✅ Environment variables set"
echo "📡 API URL: $PESADB_API_URL"
echo "🗄️  Database: $PESADB_DATABASE"
echo ""

# Test connection
echo "Testing connection..."
RESPONSE=$(curl -s -X POST "$PESADB_API_URL/query" \
  -H "X-API-Key: $PESADB_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql\": \"SELECT 1 as test\", \"db\": \"$PESADB_DATABASE\"}")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Connection successful!"
  echo "$RESPONSE" | jq '.'
else
  echo "❌ Connection failed!"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
```

Usage:
```bash
export PESADB_API_URL="your-url"
export PESADB_API_KEY="your-key"
export PESADB_DATABASE="mpesa_tracker"
bash test-pesadb.sh
```

---

## 📞 Getting Help

If you're still stuck:

1. **Check Railway Logs:**
   - Go to Deployments → View Logs
   - Copy the full error message
   - Look for specific error codes

2. **Check PesaDB Status:**
   - Is your PesaDB instance running?
   - Can you access the dashboard?
   - Are there any service status warnings?

3. **Verify SQL File:**
   ```bash
   cat backend/scripts/init_pesadb.sql
   ```
   - Should have 7 CREATE TABLE statements
   - Should have 12 INSERT statements for categories

4. **Test Locally First:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   # Set env variables in .env file
   python -m uvicorn server:app --reload
   ```

---

## 🎉 Success Checklist

You know it's working when:

- [x] Railway logs show: `✅ Database initialized successfully`
- [x] Health endpoint returns: `"initialized": true`
- [x] Health endpoint shows: `"categories": {"count": 12}`
- [x] No 404 errors in logs
- [x] Frontend can connect to backend
- [x] Can create user accounts
- [x] Can see 12 default categories

---

**Next Steps After Fixing:**

1. Test signup/login via frontend
2. Import SMS transactions
3. Set up budgets
4. Configure frontend `EXPO_PUBLIC_BACKEND_URL`

Good luck! 🚀
