# Environment Variables Configuration Guide

## Overview

All default values have been **removed** from the codebase. Environment variables are now **strictly required** for both frontend and backend to function.

This ensures:
- ✅ No confusion about which URL is being used
- ✅ Proper configuration per environment (dev, staging, production)
- ✅ Clear errors if misconfigured instead of silent failures

---

## Backend Environment Variables (Railway)

### Required Variables

All of these **must** be set on Railway for the backend to start:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `PESADB_API_KEY` | Your PesaDB API key (secret) | `pk_1234567890abcdef...` |
| `PESADB_API_URL` | PesaDB API endpoint URL | `https://pesacoredb-backend.onrender.com/api` |
| `PESADB_DATABASE` | Database name in PesaDB | `mpesa_tracker` |
| `JWT_SECRET_KEY` | Secret key for JWT tokens | Generate with: `openssl rand -hex 32` |

### How to Set on Railway

1. Go to your Railway project
2. Select your backend service
3. Click on **"Variables"** tab
4. Click **"New Variable"**
5. Add each variable with its value
6. Click **"Deploy"** to restart with new variables

### What Happens if Not Set

If any required variable is missing, the backend will:
- ❌ Fail to start
- ❌ Show clear error in logs: `"PESADB_API_KEY environment variable is required"`
- ❌ Health check will fail

---

## Frontend Environment Variables (Render)

### Required Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `EXPO_PUBLIC_BACKEND_URL` | Your backend API URL (Railway) | `https://your-backend.up.railway.app` |
| `NODE_VERSION` | Node.js version | `18.17.0` |

### How to Set on Render

1. Go to your Render dashboard
2. Select your frontend service
3. Click on **"Environment"** tab
4. Add/Update variables:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app
   NODE_VERSION=18.17.0
   ```
5. Click **"Save"**
6. **Trigger a manual deploy** (critical - see below)

### ⚠️ CRITICAL: Rebuild Required

Expo variables prefixed with `EXPO_PUBLIC_*` are **embedded at build time**, not runtime.

This means:
- Updating the variable alone does NOT update the app
- You **MUST** rebuild the app after changing the variable

**Steps After Updating `EXPO_PUBLIC_BACKEND_URL`:**
1. Update the variable on Render
2. Go to **"Manual Deploy"** section
3. Click **"Clear build cache & deploy"**
4. Wait 5-10 minutes for rebuild
5. Verify new URL in browser console

### What Happens if Not Set

If `EXPO_PUBLIC_BACKEND_URL` is not set, the frontend will:
- ❌ Throw error on startup: `"EXPO_PUBLIC_BACKEND_URL environment variable is required"`
- ❌ App will crash with clear error message
- ❌ Console will show configuration instructions

---

## Local Development Setup

### Backend (.env file)

Create `backend/.env`:

```bash
# PesaDB Configuration (REQUIRED)
PESADB_API_KEY=your_pesadb_api_key_here
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_DATABASE=mpesa_tracker

# JWT Secret (REQUIRED)
JWT_SECRET_KEY=your_64_character_secret_key_here

# Optional
DEBUG=True
LOG_LEVEL=DEBUG
```

### Frontend (.env file)

Create `frontend/.env`:

```bash
# Backend URL (REQUIRED)
# Point to your local backend
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

# Or point to deployed backend for testing
# EXPO_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app

# Environment
EXPO_PUBLIC_ENV=development
```

---

## Verification Checklist

### Backend (Railway)

After setting environment variables and deploying:

- [ ] Check Railway logs for startup messages
- [ ] Should see: `"✅ Database ready: X tables created..."`
- [ ] Visit: `https://your-backend.railway.app/api/health`
- [ ] Response should show: `"database": { "initialized": true }`

### Frontend (Render)

After setting environment variables and rebuilding:

- [ ] Visit your frontend URL
- [ ] Open browser console (F12)
- [ ] Look for: `"🔧 Backend URL Resolution:"`
- [ ] Should show your Railway backend URL
- [ ] No errors about missing `EXPO_PUBLIC_BACKEND_URL`

---

## Troubleshooting

### Backend Won't Start

**Error:** `"PESADB_API_KEY environment variable is required"`

**Solution:**
1. Go to Railway → Variables tab
2. Add `PESADB_API_KEY` with your actual key
3. Add `PESADB_API_URL` and `PESADB_DATABASE`
4. Redeploy

---

### Frontend Still Using Old URL

**Problem:** Updated `EXPO_PUBLIC_BACKEND_URL` but app still uses old URL

**Solution:**
1. Render only updates the variable, not the built app
2. Go to Render → Manual Deploy
3. Click **"Clear build cache & deploy"**
4. Wait for complete rebuild (5-10 minutes)

---

### Frontend Shows Error on Startup

**Error:** `"EXPO_PUBLIC_BACKEND_URL environment variable is required"`

**Solution:**
1. Go to Render → Environment tab
2. Add variable: `EXPO_PUBLIC_BACKEND_URL=https://your-backend.railway.app`
3. Trigger manual deploy with cache clear
4. Wait for rebuild to complete

---

### Database Not Initialized

**Problem:** Backend starts but shows `"initialized": false` in health check

**Possible Causes:**
- `PESADB_API_KEY` is invalid
- PesaDB service is down
- Network connectivity issues

**Solution:**
1. Verify API key is correct
2. Check Railway logs for detailed error messages
3. Manually trigger initialization:
   ```bash
   curl -X POST https://your-backend.railway.app/api/initialize-database
   ```

---

## Quick Reference

### Generate JWT Secret

```bash
# Linux/Mac
openssl rand -hex 32

# Or Python
python -c "import secrets; print(secrets.token_hex(32))"

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test Backend Health

```bash
curl https://your-backend.railway.app/api/health
```

### Test Frontend Build Locally

```bash
cd frontend
npm run build:web
npm run serve:web
# Visit http://localhost:3000
```

---

## Environment Variable Summary

### Backend (Railway) - 4 Required Variables
```bash
PESADB_API_KEY=pk_...
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_DATABASE=mpesa_tracker
JWT_SECRET_KEY=...64_chars...
```

### Frontend (Render) - 1 Required Variable
```bash
EXPO_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app
```

---

## Important Notes

1. **No Defaults:** All defaults have been removed. The app will fail fast with clear errors if misconfigured.

2. **Frontend Rebuild:** Always rebuild after changing `EXPO_PUBLIC_BACKEND_URL` - it's baked in at build time.

3. **Security:** Never commit `.env` files to Git. Use `.env.example` as template only.

4. **Railway Auto-Deploy:** Railway auto-deploys on Git push. Environment variables persist across deployments.

5. **Render Auto-Deploy:** Render auto-deploys on Git push, but you must manually redeploy after changing environment variables.

---

## Next Steps

1. ✅ Set all backend environment variables on Railway
2. ✅ Deploy backend (or redeploy if already deployed)
3. ✅ Verify backend health endpoint shows `initialized: true`
4. ✅ Set `EXPO_PUBLIC_BACKEND_URL` on Render pointing to Railway backend
5. ✅ **Rebuild** frontend on Render (clear cache & deploy)
6. ✅ Verify frontend connects to correct backend (check browser console)
7. ✅ Test signup/login functionality

Done! Your app is now properly configured with no defaults. 🚀
