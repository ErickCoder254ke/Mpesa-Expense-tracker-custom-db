# 🚂 Railway Backend Deployment Guide

I'll guide you through deploying your M-Pesa Expense Tracker backend to Railway. No code changes yet - just the roadmap!

## 📊 Railway vs Render - Quick Comparison

| Feature | Railway | Render |
|---------|---------|--------|
| **Free Tier** | $5 free credits/month | 750 hrs/month free |
| **Sleep/Spin Down** | No sleep on paid plans | Free tier sleeps after 15 min |
| **Build Time** | Generally faster | Can be slower |
| **Pricing** | Usage-based ($0.000231/GB-s) | Flat rate ($7/month) |
| **Database** | Built-in Postgres | Need external DB |
| **CLI** | Excellent CLI tool | Basic CLI |
| **GitHub Integration** | Excellent | Excellent |
| **Environment Variables** | Simple UI | Simple UI |

## 🎯 Prerequisites

Before deploying to Railway:

1. **Railway Account**
   - Sign up at https://railway.app
   - Connect your GitHub account
   - Get $5 free credits (no credit card required initially)

2. **Backend Ready**
   - Your backend is in `backend/` directory ✅
   - `requirements.txt` exists ✅
   - `server.py` with FastAPI app ✅

3. **PesaDB Account**
   - You already have PesaDB configured ✅
   - You'll need your `PESADB_API_KEY`

## 📋 Deployment Steps Overview

### **Step 1: Create New Project**

1. Go to Railway Dashboard: https://railway.app/dashboard
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your repository
5. Railway will detect it's a Python app

### **Step 2: Configure Service**

Railway will auto-detect Python, but you need to configure:

**Root Directory:**
- Set to `backend/` (since your backend code is in a subdirectory)
- Railway → Project Settings → Root Directory → `backend`

**Start Command:**
Railway should auto-detect, but verify it's:
```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

**Build Command:**
```bash
pip install -r requirements.txt
```

### **Step 3: Environment Variables**

You need to set these in Railway Dashboard → Variables:

#### Required Variables:

1. **`PESADB_API_URL`**
   - Value: `https://pesacoredb-backend.onrender.com/api`
   - What it does: Points to your PesaDB instance

2. **`PESADB_API_KEY`** 🔐
   - Value: Your actual PesaDB API key (secret)
   - What it does: Authenticates with PesaDB
   - **Important**: Keep this secret!

3. **`PESADB_DATABASE`**
   - Value: `mpesa_tracker`
   - What it does: Specifies which database to use

4. **`PYTHON_VERSION`** (Optional but recommended)
   - Value: `3.11.0`
   - What it does: Ensures consistent Python version

5. **`PORT`** (Auto-provided by Railway)
   - Railway automatically sets this
   - Your app should use `$PORT` environment variable

### **Step 4: Deploy**

1. After configuring variables, Railway will automatically deploy
2. Build process starts immediately
3. Takes ~2-5 minutes typically
4. You'll get a deployment URL like: `https://your-app.up.railway.app`

### **Step 5: Generate Domain**

1. Go to your Railway service → Settings
2. Click **"Generate Domain"**
3. You'll get a URL like: `your-backend-production-abc123.up.railway.app`
4. This is your **backend URL** to use in the frontend

## 🔧 Railway-Specific Configuration

### Option 1: Using Railway UI (Easiest)

1. **No configuration files needed!**
2. Railway auto-detects Python projects
3. Just set environment variables through UI
4. Set root directory to `backend/`

### Option 2: Using railway.json (Advanced)

If you want version-controlled configuration, create `backend/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn server:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Option 3: Using railway.toml (Alternative)

Create `backend/railway.toml`:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn server:app --host 0.0.0.0 --port $PORT"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## 🔐 Environment Variables Setup Guide

### How to Add Variables in Railway:

1. **Navigate**: Railway Dashboard → Your Project → Variables tab
2. **Add Variable**: Click "New Variable"
3. **Enter**: 
   - Variable name (e.g., `PESADB_API_KEY`)
   - Variable value (your actual key)
4. **Save**: Railway auto-redeploys when you add variables

### Variable Reference Format:

For referencing between services in Railway:
```bash
BACKEND_URL=${{SERVICE_NAME.RAILWAY_PUBLIC_DOMAIN}}
```

## 🌐 Connecting Frontend to Railway Backend

After deploying backend to Railway:

1. **Get your Railway backend URL**:
   - Example: `https://mpesa-backend-production.up.railway.app`

2. **Update frontend environment variable**:
   - If frontend is on Render: Set `EXPO_PUBLIC_BACKEND_URL` to Railway URL
   - If frontend is also on Railway: Use Railway variable reference

3. **Update CORS settings** (if needed):
   - Your backend already allows `*` origins, so should work
   - For production, restrict to your frontend domain

## 💰 Cost Breakdown

### Railway Pricing:

**Free Tier:**
- $5 in credits per month
- No credit card required
- No sleep/spin-down
- Good for testing and small projects

**Estimated Usage:**
- Small backend: ~$1-3/month
- Includes CPU, RAM, and bandwidth
- Usage-based pricing is transparent

**Upgrading:**
- Hobby Plan: $5/month (replaces free credits)
- Pro Plan: $20/month (team features)
- Pay-as-you-go for usage beyond credits

### When You'll Need to Pay:

- If backend uses >$5/month in resources
- Typically happens with high traffic or long uptime
- Railway will email you when approaching limit

## ⚡ Railway Advantages

### 1. **No Sleep Issues**
- Unlike Render free tier, no forced sleep
- Backend stays alive 24/7 (even on free tier)
- No cold start delays

### 2. **Better Developer Experience**
- Railway CLI is excellent
- Real-time logs in dashboard
- Easy rollbacks

### 3. **Built-in Database Options**
- Railway offers PostgreSQL, MySQL, Redis
- One-click provisioning
- Could migrate from PesaDB later if needed

### 4. **Faster Deployments**
- Typically faster builds than Render
- Better caching
- Incremental builds

## 🚨 Potential Issues & Solutions

### Issue 1: Root Directory Not Set

**Problem**: Railway builds from repo root, wrong `requirements.txt`

**Solution**:
- Railway Project Settings → Root Directory → `backend`
- Or use `nixpacks.toml` to specify

### Issue 2: Port Binding

**Problem**: App doesn't respond to requests

**Solution**:
- Ensure your FastAPI app uses `$PORT` environment variable
- Your current code already does this: `--port $PORT` ✅

### Issue 3: PesaDB Connection Fails

**Problem**: Can't connect to PesaDB from Railway

**Solution**:
- Verify `PESADB_API_KEY` is set correctly
- Check `PESADB_API_URL` is accessible from Railway
- Test API key with curl/Postman first

### Issue 4: Build Timeout

**Problem**: Build takes too long

**Solution**:
- Railway has generous build timeouts (usually 10+ minutes)
- Check `requirements.txt` for unnecessary packages
- Use Python wheels when possible

### Issue 5: Environment Variables Not Loading

**Problem**: App can't read environment variables

**Solution**:
- Verify variables are set in Railway Variables tab
- Check variable names match exactly (case-sensitive)
- Restart deployment after adding variables

## 📝 Step-by-Step Checklist

### Pre-Deployment:
- [ ] Railway account created and GitHub connected
- [ ] PesaDB API key ready
- [ ] Backend code committed to GitHub
- [ ] `requirements.txt` is up to date

### During Deployment:
- [ ] Project created from GitHub repo
- [ ] Root directory set to `backend/`
- [ ] Environment variables added (PESADB_API_KEY, etc.)
- [ ] Start command verified
- [ ] Build command verified

### Post-Deployment:
- [ ] Service shows "Active" status
- [ ] Domain generated and accessible
- [ ] Health endpoint working: `https://your-backend.up.railway.app/api/health`
- [ ] API endpoints responding correctly
- [ ] Frontend EXPO_PUBLIC_BACKEND_URL updated to Railway URL
- [ ] Test login/signup from frontend

## 🧪 Testing Your Railway Deployment

### 1. Health Check:
```bash
curl https://your-backend.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 2. Test API Endpoint:
```bash
curl https://your-backend.up.railway.app/api/
```

### 3. Test from Frontend:
- Update frontend's `EXPO_PUBLIC_BACKEND_URL`
- Try login/signup
- Check browser console for errors

## 🛠️ Railway CLI (Optional but Powerful)

### Install Railway CLI:
```bash
npm i -g @railway/cli
# or
brew install railway
```

### Useful Commands:
```bash
# Login
railway login

# Link project
railway link

# View logs
railway logs

# Open dashboard
railway open

# Deploy manually
railway up

# Run command in Railway environment
railway run python manage.py migrate
```

## 📊 Monitoring & Logs

### Viewing Logs:
1. Railway Dashboard → Your Service → Deployments
2. Click on active deployment
3. View real-time logs

### Metrics:
- CPU usage
- Memory usage
- Network bandwidth
- Request volume

### Alerts:
- Set up in Railway dashboard
- Email notifications for failures
- Webhook integrations available

## 🔄 Continuous Deployment

Railway automatically deploys when you push to GitHub:

1. **Auto-Deploy**: Enabled by default
2. **Branch**: Usually `main` or `master`
3. **Trigger**: Any push to connected branch
4. **Process**: Build → Test → Deploy → Live

### Manual Deploy:
- Railway Dashboard → Deployments → "Redeploy"
- Or use Railway CLI: `railway up`

## 🎯 Next Steps After Backend Deployment

1. **Test thoroughly**: Ensure all endpoints work
2. **Update frontend**: Point to Railway backend URL
3. **Monitor usage**: Check Railway dashboard for resource usage
4. **Set up alerts**: Get notified of issues
5. **Consider database**: Maybe migrate to Railway Postgres later
6. **Add custom domain**: If you have one

## 📚 Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: Active community support
- **Railway Templates**: Pre-configured setups
- **Your Backend Docs**: `RENDER_DEPLOYMENT_GUIDE.md` (similar concepts)

---

## 🤔 Questions to Consider

Before preparing the code/config files:

1. **Do you want to use Railway UI only** (simpler, no config files)?
   - OR create `railway.json`/`railway.toml` for version control?

2. **Deploy only backend to Railway**, keep frontend on Render?
   - OR deploy both frontend and backend to Railway?

3. **Use Railway's built-in PostgreSQL** database in the future?
   - OR stick with PesaDB for now?

4. **Need custom domain** setup?

Let me know your preferences, and I'll prepare the necessary configurations! 🚀
