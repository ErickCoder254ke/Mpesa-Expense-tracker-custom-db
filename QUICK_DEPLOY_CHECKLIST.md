# ⚡ Quick Deploy Checklist - Railway Backend

## 🎯 Before You Start

**Prerequisites:**
- [ ] PesaDB account with dashboard access
- [ ] Railway account
- [ ] Backend code pushed to GitHub/GitLab

---

## ✅ Step-by-Step Deployment

### 1️⃣ PesaDB Setup (2 minutes)

1. [ ] Log into PesaDB dashboard
2. [ ] Create a new database named: **`mpesa_tracker`**
3. [ ] Copy your **API Key** (starts with `pk_...`)
4. [ ] Copy your **API URL** (should end with `/api`)

**Example:**
```
API Key: pk_abc123def456...
API URL: https://your-pesadb-instance.onrender.com/api
Database: mpesa_tracker
```

---

### 2️⃣ Generate JWT Secret (30 seconds)

Run this command in your terminal:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

**Copy the output** - you'll need it for Railway.

---

### 3️⃣ Railway Configuration (3 minutes)

1. [ ] Go to Railway Dashboard
2. [ ] Open your backend service
3. [ ] Click **"Variables"** tab
4. [ ] Add these **4 variables**:

```env
PESADB_API_KEY=<paste-your-pk-key-here>
PESADB_API_URL=<paste-your-pesadb-url-here>
PESADB_DATABASE=mpesa_tracker
JWT_SECRET_KEY=<paste-generated-secret-here>
```

5. [ ] Click **"Deploy"** (or wait for auto-deploy)

---

### 4️⃣ Verify Backend (1 minute)

Wait for Railway deployment to finish (2-3 minutes), then test:

```bash
# Replace with your actual Railway URL
curl https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/health
```

**✅ Success looks like:**
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "initialized": true
  }
}
```

**❌ If you see `"initialized": false"`:**
```bash
# Manually trigger initialization
curl -X POST https://your-backend.railway.app/api/initialize-database
```

---

### 5️⃣ Update Frontend (2 minutes)

**Create/Update:** `frontend/.env`

```env
EXPO_PUBLIC_BACKEND_URL=https://mpesa-expense-tracker-custom-db-production.up.railway.app
```

**⚠️ Important:**
- Use your actual Railway backend URL
- No trailing slash
- No `/api` suffix

---

### 6️⃣ Test Frontend (2 minutes)

```bash
cd frontend
npm run reset      # Clear cache
npm start          # Start dev server
```

**✅ Success:** Console shows:
```
✅ Using environment variable URL: https://your-backend.railway.app
```

---

### 7️⃣ End-to-End Test (2 minutes)

1. [ ] Open your app (web/mobile)
2. [ ] Sign up with email/password
3. [ ] Check categories load (should see 12 default categories)
4. [ ] Create a test transaction
5. [ ] Set a test budget

**If everything works:** 🎉 **You're done!**

---

## 🐛 Quick Troubleshooting

### Backend won't start?
```bash
# Check Railway logs
railway logs --tail

# Look for these errors:
# ❌ "PESADB_API_KEY environment variable is required"
# ❌ "PesaDB Error: Not Found"
```

**Fix:** Verify all 4 environment variables are set correctly

---

### Tables not created?
```bash
# Manually trigger initialization
curl -X POST https://your-backend.railway.app/api/initialize-database
```

**Expected:** `"success": true, "tables_created": 7`

---

### Frontend can't connect?
```bash
# Verify backend URL is correct
cat frontend/.env

# Clear cache and restart
cd frontend
npm run reset
npm start
```

**Check console** for the backend URL - should match Railway

---

## 📊 Health Check Reference

### Healthy Backend Response

```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "initialized": true,
    "tables": {
      "users": {"exists": true, "count": 0},
      "categories": {"exists": true, "count": 12},
      "transactions": {"exists": true},
      "budgets": {"exists": true}
    },
    "config": {
      "api_url": "https://your-pesadb.onrender.com/api",
      "database_name": "mpesa_tracker",
      "api_key_configured": true
    }
  }
}
```

### What Each Field Means

| Field | Good Value | Bad Value | Fix |
|-------|-----------|-----------|-----|
| `status` | `"healthy"` | `"error"` | Check Railway logs |
| `database.status` | `"connected"` | `"error: ..."` | Verify PesaDB credentials |
| `database.initialized` | `true` | `false` | Run `/api/initialize-database` |
| `tables.*.exists` | `true` | `false` | Database not initialized |
| `categories.count` | `12` | `0` | Seed data not loaded |
| `api_key_configured` | `true` | `false` | Set `PESADB_API_KEY` |

---

## 🎯 URLs to Bookmark

| What | URL |
|------|-----|
| **Railway Backend** | `https://mpesa-expense-tracker-custom-db-production.up.railway.app` |
| **Health Check** | `https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/health` |
| **API Docs** | `https://mpesa-expense-tracker-custom-db-production.up.railway.app/docs` |
| **Manual Init** | `POST https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/initialize-database` |

---

## ⏱️ Time Estimates

| Step | Time | Can Skip? |
|------|------|-----------|
| PesaDB Setup | 2 min | ❌ No |
| Generate JWT Secret | 30 sec | ❌ No |
| Railway Config | 3 min | ❌ No |
| Backend Deploy | 2-3 min | ⏰ Auto |
| Verify Backend | 1 min | ⚠️ Recommended |
| Update Frontend | 2 min | ❌ No |
| Test Frontend | 2 min | ⚠️ Recommended |
| End-to-End Test | 2 min | ⚠️ Recommended |
| **Total** | **~15 minutes** | |

---

## 🔐 Security Checklist

- [ ] Never commit `.env` files with real secrets
- [ ] Use Railway secrets/variables (not hardcoded)
- [ ] API key starts with `pk_` prefix
- [ ] JWT secret is 64+ characters
- [ ] Don't share API keys in public repos
- [ ] Rotate keys if exposed

---

## 📚 Need More Help?

- **Full Guide:** `PESADB_DEPLOYMENT_FIXED.md`
- **Environment Variables:** `RAILWAY_ENV_VARIABLES.md`
- **Fix Summary:** `DATABASE_INITIALIZATION_FIX_SUMMARY.md`

---

## ✅ Final Verification

Before considering deployment complete, verify:

- [ ] Railway backend is running (not sleeping)
- [ ] Health endpoint returns `"initialized": true`
- [ ] All 7 tables exist
- [ ] 12 categories seeded
- [ ] Frontend connects successfully
- [ ] Can sign up with email/password
- [ ] Can log in
- [ ] Categories display correctly
- [ ] Can create transactions
- [ ] No error messages in console

---

## 🎉 Success!

If all checkboxes above are checked, your deployment is complete!

**What to do next:**
1. Test all features thoroughly
2. Monitor Railway logs for errors
3. Set up error tracking (optional)
4. Configure custom domain (optional)
5. Set up CI/CD pipeline (optional)

**Your backend is now running at:**
```
https://mpesa-expense-tracker-custom-db-production.up.railway.app
```

**Happy tracking! 💰**

---

**Last Updated:** 2025-01-16  
**Estimated Total Time:** 15 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Beginner-Friendly)
