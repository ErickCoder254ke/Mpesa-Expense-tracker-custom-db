# Deployment Configuration Summary

## Current Deployment Architecture

```
┌─────────────────────┐
│   Frontend (Web)    │
│   Hosted on:        │
│   🔷 Render         │
│   Port: Dynamic     │
└──────────┬──────────┘
           │
           │ HTTP Requests
           │
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Backend (API)     │────────▶│   PesaDB            │
│   Hosted on:        │         │   (External SaaS)   │
│   🚂 Railway        │         │   SQL Database      │
│   Port: Dynamic     │         └─────────────────────┘
└─────────────────────┘
```

---

## Deployment Setup

### Frontend → Render
- **Service Type:** Static Web App (React Native Web / Expo)
- **Repository:** Connected to your Git repository
- **Build Command:** `npm install && npm run build:web`
- **Start Command:** `npm run serve:web`
- **Auto Deploy:** Yes (on Git push to main branch)

### Backend → Railway
- **Service Type:** Docker Container (FastAPI / Python)
- **Repository:** Connected to your Git repository
- **Build:** Uses `Dockerfile` in root directory
- **Auto Deploy:** Yes (on Git push to main branch)

### Database → PesaDB
- **Type:** External SaaS (SQL database via REST API)
- **Access:** Via `PESADB_API_KEY`
- **No hosting required:** Managed service

---

## Environment Variables Configuration

### ⚙️ Frontend (Render)

**Service:** `mpesa-expense-tracker-web`

| Variable | Value | Notes |
|----------|-------|-------|
| `EXPO_PUBLIC_BACKEND_URL` | `https://your-backend.up.railway.app` | ⚠️ **MUST match your Railway backend URL** |
| `NODE_VERSION` | `18.17.0` | Node.js version for build |

**Important:**
- After changing `EXPO_PUBLIC_BACKEND_URL`, you **MUST** manually trigger a rebuild
- Go to: Manual Deploy → Clear build cache & deploy
- Reason: Expo bakes this into the build at build time, not runtime

---

### ⚙️ Backend (Railway)

**Service:** Your Railway backend project

| Variable | Value | Notes |
|----------|-------|-------|
| `PESADB_API_KEY` | `pk_xxxxx...` | 🔐 **Secret** - Get from PesaDB dashboard |
| `PESADB_API_URL` | `https://pesacoredb-backend.onrender.com/api` | PesaDB API endpoint |
| `PESADB_DATABASE` | `mpesa_tracker` | Your database name in PesaDB |
| `JWT_SECRET_KEY` | `<64 char random string>` | 🔐 **Secret** - Generate with: `openssl rand -hex 32` |

**Important:**
- All variables are **required** - no defaults
- Railway auto-deploys when you push to Git
- Database initialization happens automatically on first deploy
- Health check: `https://your-backend.railway.app/api/health`

---

## Configuration Checklist

### ✅ Initial Setup

#### 1. Backend on Railway

- [ ] Create new project on Railway
- [ ] Connect Git repository
- [ ] Railway detects `Dockerfile` automatically
- [ ] Set **4 required environment variables:**
  - [ ] `PESADB_API_KEY` (from PesaDB dashboard)
  - [ ] `PESADB_API_URL`
  - [ ] `PESADB_DATABASE`
  - [ ] `JWT_SECRET_KEY` (generate new)
- [ ] Deploy and wait for build
- [ ] Get the deployed URL: `https://xxx.up.railway.app`
- [ ] Test health endpoint: `/api/health`
- [ ] Verify response shows `"initialized": true`

#### 2. Frontend on Render

- [ ] Create new Web Service on Render
- [ ] Connect Git repository
- [ ] Set Root Directory: `frontend`
- [ ] Set Build Command: `npm install && npm run build:web`
- [ ] Set Start Command: `npm run serve:web`
- [ ] Set **1 required environment variable:**
  - [ ] `EXPO_PUBLIC_BACKEND_URL` = Railway backend URL (from step 1)
- [ ] Set Node version: `NODE_VERSION=18.17.0`
- [ ] Deploy and wait for build (5-10 minutes)
- [ ] Get the deployed URL: `https://xxx.onrender.com`
- [ ] Open in browser and check console
- [ ] Verify it connects to Railway backend

---

### 🔄 Updating Backend URL

**Scenario:** You changed your Railway backend URL or redeployed to a new URL

**Steps:**

1. **Get New Backend URL**
   - Go to Railway dashboard
   - Copy the new URL: `https://new-url.up.railway.app`

2. **Update Render Environment Variable**
   - Go to Render dashboard
   - Select frontend service
   - Click "Environment" tab
   - Update: `EXPO_PUBLIC_BACKEND_URL=https://new-url.up.railway.app`
   - Click "Save"

3. **⚠️ CRITICAL: Rebuild Frontend**
   - Go to "Manual Deploy" section
   - Click "Clear build cache & deploy"
   - Wait 5-10 minutes for complete rebuild
   - This is **required** because Expo bakes the URL at build time

4. **Verify**
   - Open frontend URL in browser
   - Open browser console (F12)
   - Look for: `"✅ Using environment variable URL: https://new-url.up.railway.app"`
   - Test login/signup

---

### 🔄 Updating Database Configuration

**Scenario:** You changed PesaDB credentials or database name

**Steps:**

1. **Update Railway Variables**
   - Go to Railway dashboard
   - Select backend service
   - Click "Variables" tab
   - Update the changed variables:
     - `PESADB_API_KEY`
     - `PESADB_API_URL`
     - `PESADB_DATABASE`
   - Railway will auto-deploy

2. **Monitor Logs**
   - Click "Deployments" → "View Logs"
   - Watch for database initialization logs
   - Look for: `"✅ Database ready: X tables created..."`

3. **Verify Health**
   - Visit: `https://your-backend.railway.app/api/health`
   - Check: `"database": { "status": "connected", "initialized": true }`

4. **Reinitialize if Needed**
   - If initialization failed, manually trigger:
   ```bash
   curl -X POST https://your-backend.railway.app/api/initialize-database
   ```

---

## Verification & Testing

### Backend Health Check

```bash
curl https://your-backend.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T...",
  "database": {
    "status": "connected",
    "initialized": true,
    "type": "PesaDB",
    "api_url": "https://pesacoredb-backend.onrender.com/api",
    "api_key_configured": true,
    "stats": {
      "users": 1,
      "categories": 12,
      "transactions": 0
    }
  },
  "message": "M-Pesa Expense Tracker Backend is running (PesaDB)"
}
```

### Frontend Browser Console Check

1. Open frontend URL: `https://your-frontend.onrender.com`
2. Open browser console (F12)
3. Look for logs:

```
🔧 Backend URL Resolution:
- Environment variable: https://your-backend.up.railway.app
- App.json extra: undefined
✅ Using environment variable URL: https://your-backend.up.railway.app
```

### Test API Connection

From browser console on frontend:
```javascript
fetch('https://your-backend.railway.app/api/health')
  .then(r => r.json())
  .then(console.log)
```

Should return the health check response above.

---

## Troubleshooting

### Frontend Error: "EXPO_PUBLIC_BACKEND_URL environment variable is required"

**Cause:** Environment variable not set on Render

**Fix:**
1. Go to Render → Environment
2. Add: `EXPO_PUBLIC_BACKEND_URL=https://your-backend.railway.app`
3. Manually deploy with cache clear
4. Wait for rebuild

---

### Frontend Still Using Old Backend URL

**Cause:** Frontend was not rebuilt after environment variable change

**Fix:**
1. Render → Manual Deploy
2. Clear build cache & deploy
3. Wait for complete rebuild
4. Verify in browser console

---

### Backend Error: "PESADB_API_KEY environment variable is required"

**Cause:** Environment variable not set on Railway

**Fix:**
1. Go to Railway → Variables
2. Add all required variables:
   - `PESADB_API_KEY`
   - `PESADB_API_URL`
   - `PESADB_DATABASE`
   - `JWT_SECRET_KEY`
3. Railway auto-deploys
4. Check logs for successful startup

---

### Backend Health Shows "initialized": false

**Cause:** Database tables not created

**Possible Reasons:**
- Invalid `PESADB_API_KEY`
- PesaDB service down
- Network connectivity issues

**Fix:**
1. Verify `PESADB_API_KEY` is correct
2. Check Railway logs for detailed errors
3. Manually trigger initialization:
   ```bash
   curl -X POST https://your-backend.railway.app/api/initialize-database
   ```
4. Check response for details

---

### CORS Errors in Browser

**Cause:** Backend not allowing frontend origin

**Fix:**
Backend already allows all origins (`"*"`) for development. If you see CORS errors:
1. Check that backend URL is correct
2. Verify backend is actually running (health check)
3. Check browser network tab for actual error

---

## Security Best Practices

### 🔐 Secrets Management

**Never commit these to Git:**
- `PESADB_API_KEY`
- `JWT_SECRET_KEY`
- `.env` files

**Store securely:**
- Railway: Encrypted environment variables
- Render: Encrypted environment variables
- Local: `.env` files (in `.gitignore`)

### 🔄 Key Rotation

Rotate secrets periodically:
- JWT Secret: Every 90 days (invalidates all sessions)
- PesaDB API Key: Per PesaDB policy
- Update on Railway/Render after rotation

---

## Auto-Deployment Behavior

### Railway (Backend)
- ✅ Auto-deploys on Git push to main branch
- ✅ Environment variables persist across deployments
- ✅ Database initialization runs on first startup only
- ⏱️ Build time: ~2-3 minutes

### Render (Frontend)
- ✅ Auto-deploys on Git push to main branch
- ✅ Environment variables persist across deployments
- ⚠️ Must manually redeploy after changing environment variables
- ⏱️ Build time: ~5-10 minutes

---

## Quick Commands Reference

### Generate JWT Secret
```bash
openssl rand -hex 32
```

### Test Backend Locally
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
# Set environment variables in .env
uvicorn server:app --reload
```

### Test Frontend Locally
```bash
cd frontend
npm install
npm start  # Development mode
# OR
npm run build:web && npm run serve:web  # Production mode
```

### Manual Database Initialization
```bash
curl -X POST https://your-backend.railway.app/api/initialize-database
```

---

## Support & Resources

- **Railway Docs:** https://docs.railway.app/
- **Render Docs:** https://render.com/docs
- **Expo Docs:** https://docs.expo.dev/
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **PesaDB Docs:** Check your PesaDB dashboard

---

## Summary

✅ **Frontend:** Hosted on Render, requires `EXPO_PUBLIC_BACKEND_URL`  
✅ **Backend:** Hosted on Railway, requires 4 environment variables  
✅ **Database:** PesaDB (external SaaS)  
✅ **No defaults:** All variables must be explicitly set  
✅ **Auto-deploy:** Both services auto-deploy on Git push  
⚠️ **Rebuild required:** Frontend must be rebuilt after changing `EXPO_PUBLIC_BACKEND_URL`

Your deployment is configured for maximum clarity and no surprises! 🚀
