# Railway Deployment Guide - M-Pesa Expense Tracker

This guide provides step-by-step instructions for deploying the M-Pesa Expense Tracker application to Railway.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)
9. [Post-Deployment](#post-deployment)

---

## Overview

### What This Project Does

The M-Pesa Expense Tracker is a mobile and web application that helps users track their M-Pesa transactions and expenses. It consists of:

- **Backend**: Python FastAPI application that provides REST API endpoints
- **Frontend**: React Native (Expo) application for mobile and web
- **Database**: PesaDB - a cloud-based database accessed via REST API

### Deployment Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │────────▶│   Backend        │────────▶│   PesaDB API    │
│   (Railway)     │         │   (Railway)      │         │   (External)    │
│   Expo/React    │         │   FastAPI        │         │   Database      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

---

## Prerequisites

### Required Accounts

1. **Railway Account**: Sign up at [railway.app](https://railway.app/)
2. **GitHub Account**: To connect your repository
3. **PesaDB Account**: To get your API key (required for database access)

### Required Tools (for local testing)

- **Git**: For version control
- **Python 3.11+**: For local backend testing
- **Node.js 18+**: For local frontend testing (optional)
- **Docker** (optional): For local container testing

### Get Your PesaDB API Key

1. Go to your PesaDB dashboard
2. Navigate to API Keys section
3. Copy your API key (keep it secure!)

---

## Project Structure

```
mpesa-expense-tracker/
├── backend/                 # Backend API (Python FastAPI)
│   ├── server.py           # Main application entry point
│   ├── requirements.txt    # Python dependencies
│   ├── config/             # Configuration files
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   └── models/             # Data models
├── frontend/               # Frontend (React Native/Expo)
│   ├── app/                # Application screens
│   ├── components/         # Reusable components
│   ├── package.json        # Node.js dependencies
│   └── app.json            # Expo configuration
├── Dockerfile              # Docker configuration for backend
├── railway.json            # Railway deployment configuration
├── Procfile                # Process file for Railway
├── .env.example            # Environment variables template
└── RAILWAY_DEPLOYMENT_GUIDE.md  # This file
```

---

## Environment Variables

### Backend Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
# Required
PESADB_API_KEY=your_pesadb_api_key_here
JWT_SECRET_KEY=generate_a_secure_random_key_here

# Optional (with defaults)
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_DATABASE=mpesa_tracker
PYTHON_VERSION=3.11.0
```

#### How to Generate JWT_SECRET_KEY

**Option 1 - Python:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**Option 2 - OpenSSL:**
```bash
openssl rand -hex 32
```

**Option 3 - Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend Environment Variables

```bash
EXPO_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app
```

---

## Backend Deployment

### Step 1: Prepare Your Repository

1. **Ensure all deployment files are present:**
   - `Dockerfile` ✓
   - `railway.json` ✓
   - `Procfile` ✓
   - `backend/requirements.txt` ✓

2. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

### Step 2: Create Railway Project

#### Option A: Via Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app/)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `mpesa-expense-tracker` repository
5. Railway will automatically detect the Dockerfile

#### Option B: Via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to GitHub repo
railway link

# Deploy
railway up
```

### Step 3: Configure Environment Variables

1. Go to your Railway project dashboard
2. Click on your backend service
3. Navigate to **"Variables"** tab
4. Add the following variables:

```
PESADB_API_KEY=<your_pesadb_api_key>
JWT_SECRET_KEY=<your_generated_secret_key>
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_DATABASE=mpesa_tracker
PYTHON_VERSION=3.11.0
```

5. Click **"Deploy"** (or wait for auto-deploy)

### Step 4: Generate Public Domain

1. Go to **"Settings"** tab in your Railway service
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. Copy the generated URL (e.g., `https://your-app-production.up.railway.app`)
5. Save this URL - you'll need it for the frontend

### Step 5: Verify Backend Deployment

1. **Check deployment logs:**
   - Go to **"Deployments"** tab
   - Click on the latest deployment
   - Check logs for errors

2. **Test health endpoint:**
   ```bash
   curl https://your-backend.up.railway.app/api/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-01-16T...",
     "database": {
       "status": "connected",
       "initialized": true,
       "type": "PesaDB"
     }
   }
   ```

---

## Frontend Deployment

### Option 1: Deploy Web Version to Railway

#### Step 1: Create Frontend Service

1. In Railway dashboard, click **"New"** → **"GitHub Repo"**
2. Select the same repository
3. Railway will detect it's a Node.js project

#### Step 2: Configure Frontend Build

1. Go to **"Settings"** tab
2. Set **Root Directory**: `frontend`
3. Set **Build Command**: `npm install && npm run build:web`
4. Set **Start Command**: `npm run serve:web`

#### Step 3: Add Environment Variables

1. Go to **"Variables"** tab
2. Add:
   ```
   EXPO_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app
   NODE_VERSION=18.17.0
   ```

#### Step 4: Generate Domain

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Your frontend is now accessible!

### Option 2: Mobile App Build (Expo)

For mobile app builds (iOS/Android), you'll need to:

1. **Update app configuration:**
   ```bash
   cd frontend
   # Edit app.json and set your backend URL in the app config
   ```

2. **Build with EAS (Expo Application Services):**
   ```bash
   npm install -g eas-cli
   eas login
   eas build --platform android
   eas build --platform ios
   ```

3. **Set backend URL in your app:**
   - Update `EXPO_PUBLIC_BACKEND_URL` in your `.env` file
   - The mobile app will use this URL to connect to your Railway backend

---

## Verification

### Backend Health Check

Test all health and API endpoints:

```bash
# Simple health check
curl https://your-backend.up.railway.app/api/health

# Check root endpoint
curl https://your-backend.up.railway.app/api/

# Test database initialization (if needed)
curl -X POST https://your-backend.up.railway.app/api/initialize-database
```

### Frontend Verification

1. Open your frontend URL in a browser
2. Open browser console (F12)
3. Look for successful API calls
4. Try creating a test transaction
5. Verify data is saved and retrieved correctly

### End-to-End Test

1. **Sign up a new user** via frontend
2. **Login** with the new user
3. **Add a transaction**
4. **View transactions** list
5. **Check categories** are loaded
6. **Test budget features**
7. **Try SMS import** (if applicable)

---

## Troubleshooting

### Common Issues

#### Issue 1: Health Check Fails with 500 Error

**Symptoms:**
```bash
curl https://your-backend.up.railway.app/api/health
# Returns 500 Internal Server Error
```

**Possible Causes:**
- PesaDB API key not set or invalid
- Database connection failure
- Environment variables missing

**Solution:**
1. Check Railway logs: Go to "Deployments" → "View Logs"
2. Verify `PESADB_API_KEY` is set correctly
3. Test PesaDB connection:
   ```bash
   curl -H "X-API-Key: YOUR_KEY" https://pesacoredb-backend.onrender.com/api/databases
   ```

#### Issue 2: Database Not Initialized

**Symptoms:**
```
"Database not initialized" or "tables not found" errors
```

**Solution:**
1. Manually trigger database initialization:
   ```bash
   curl -X POST https://your-backend.up.railway.app/api/initialize-database
   ```
2. Check the response for any errors
3. Verify your PesaDB account has the database created

#### Issue 3: Frontend Can't Connect to Backend

**Symptoms:**
- Frontend shows network errors
- Console shows "Failed to fetch" or CORS errors

**Solution:**
1. **Verify backend URL in frontend:**
   - Check `EXPO_PUBLIC_BACKEND_URL` variable
   - Ensure it includes `https://` and no trailing slash
   - Should be: `https://your-backend.up.railway.app`

2. **Check CORS configuration:**
   - Backend should allow your frontend domain
   - Check `backend/server.py` CORS settings

3. **Test backend directly:**
   ```bash
   curl https://your-backend.up.railway.app/api/health
   ```

#### Issue 4: Deployment Build Fails

**Symptoms:**
- Build logs show errors
- Deployment status shows "Failed"

**Common Solutions:**

**For Backend:**
1. Check `requirements.txt` syntax
2. Verify all dependencies are available
3. Check Python version compatibility
4. Review build logs for specific error messages

**For Frontend:**
1. Check `package.json` syntax
2. Try local build: `npm run build:web`
3. Check for outdated dependencies
4. Clear Railway build cache and retry

#### Issue 5: Application Runs Locally But Not on Railway

**Checklist:**
- [ ] Environment variables set in Railway dashboard
- [ ] Correct Python/Node version specified
- [ ] Database credentials valid
- [ ] Health check endpoint working
- [ ] Dockerfile builds successfully locally
- [ ] No hardcoded localhost URLs in code

**Debug Steps:**
1. Check Railway logs for errors
2. Compare local vs Railway environment variables
3. Test Docker build locally:
   ```bash
   docker build -t mpesa-backend .
   docker run -p 8000:8000 -e PORT=8000 mpesa-backend
   ```

#### Issue 6: "Port Already in Use" Errors

**Solution:**
- Railway automatically sets the `PORT` environment variable
- Ensure your app uses `${PORT}` variable, not hardcoded port
- In `server.py`, the uvicorn command should use `--port ${PORT:-8000}`

---

## Post-Deployment

### Security Checklist

After successful deployment:

- [ ] Change default JWT_SECRET_KEY to a strong random key
- [ ] Verify PESADB_API_KEY is not exposed in logs
- [ ] Check that CORS is properly configured
- [ ] Review Railway access logs
- [ ] Set up monitoring and alerts (Railway Dashboard)
- [ ] Enable 2FA on Railway account
- [ ] Document credentials in a secure password manager
- [ ] Plan for regular key rotation (every 90 days)

### Monitoring

#### Railway Dashboard Metrics

Monitor your application in Railway:

1. **CPU & Memory Usage**: Settings → Metrics
2. **Request Logs**: Deployments → View Logs
3. **Error Tracking**: Check logs for errors
4. **Uptime**: Monitor health check status

#### Set Up Alerts

1. Go to Railway Project Settings
2. Configure webhook notifications
3. Connect to Slack, Discord, or email
4. Set alerts for:
   - Deployment failures
   - High memory usage
   - Health check failures

### Backup Strategy

#### Database Backups (PesaDB)

1. Check PesaDB documentation for backup options
2. Set up automated backups if available
3. Test restore procedure

#### Application Code

1. Keep Git repository up to date
2. Tag stable releases:
   ```bash
   git tag -a v1.0.0 -m "Production release"
   git push origin v1.0.0
   ```
3. Document deployment configuration

### Scaling

#### When to Scale

Monitor these metrics:
- Response time increasing
- CPU/Memory usage consistently high
- Request queue building up

#### How to Scale on Railway

1. Go to **Settings** → **Resources**
2. Upgrade to higher tier plan
3. Consider horizontal scaling (multiple instances)
4. Add Redis cache for frequently accessed data

### Updates and Maintenance

#### Deploying Updates

1. **Make changes and test locally**
   ```bash
   cd backend
   python -m pytest  # Run tests
   uvicorn server:app --reload  # Test locally
   ```

2. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

3. **Railway auto-deploys** (if enabled)
   - Or manually trigger via Railway dashboard

4. **Verify deployment**
   - Check health endpoint
   - Test affected features
   - Monitor logs for errors

#### Rollback Procedure

If deployment fails:

1. Go to Railway **"Deployments"** tab
2. Find last working deployment
3. Click **"..."** → **"Redeploy"**
4. Investigate issue in separate branch

---

## Railway CLI Quick Reference

```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Check environment variables
railway vars

# Add environment variable
railway vars set KEY=VALUE

# View logs
railway logs

# Open in browser
railway open

# Deploy
railway up

# Run command in Railway environment
railway run <command>
```

---

## Cost Estimates

### Railway Pricing (as of 2025)

**Free Tier:**
- $5 credit per month
- Suitable for development/testing
- May sleep after inactivity

**Hobby Plan ($5/month):**
- $5 credit included
- Better for production
- Always-on deployments
- Custom domains

**Pro Plan ($20/month):**
- $20 credit included
- Priority support
- Advanced features
- Better for high-traffic apps

### Typical Usage

**Backend Service:**
- ~$3-5/month for low traffic
- ~$10-20/month for moderate traffic

**Frontend Service:**
- ~$2-3/month for static hosting
- More for dynamic web apps

**Total: ~$5-25/month** depending on traffic

---

## Helpful Resources

### Documentation

- [Railway Documentation](https://docs.railway.app/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/)
- [PesaDB Documentation](https://pesacoredb-backend.onrender.com/docs)

### Community Support

- [Railway Discord](https://discord.gg/railway)
- [Railway Community](https://railway.app/community)
- [Stack Overflow - Railway](https://stackoverflow.com/questions/tagged/railway)

### Project-Specific Files

- `RENDER_DEPLOYMENT_GUIDE.md` - Alternative deployment to Render
- `.env.example` - Environment variables template
- `prepare.md` - General deployment preparation tips

---

## Success Checklist

Before considering deployment complete:

### Backend
- [ ] Backend service deployed and running
- [ ] Health check endpoint returns 200 OK
- [ ] Database connection successful
- [ ] Environment variables configured
- [ ] Public domain generated and accessible
- [ ] API endpoints responding correctly
- [ ] Logs show no errors

### Frontend
- [ ] Frontend deployed (web or mobile)
- [ ] Backend URL configured correctly
- [ ] App loads without errors
- [ ] Can sign up new users
- [ ] Can login and logout
- [ ] Can create and view transactions
- [ ] All features working as expected

### Security
- [ ] Strong JWT secret key set
- [ ] API keys secured
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] 2FA enabled on Railway account

### Monitoring
- [ ] Railway monitoring configured
- [ ] Alerts set up for failures
- [ ] Backup strategy in place
- [ ] Rollback procedure documented

---

## Next Steps

After successful deployment:

1. **Test thoroughly** - Create test accounts and transactions
2. **Monitor closely** - Watch logs for first 24 hours
3. **Document** - Keep notes on any issues encountered
4. **Share** - Share your deployed app URL with users
5. **Iterate** - Collect feedback and improve

---

## Congratulations! 🎉

Your M-Pesa Expense Tracker is now deployed on Railway!

**Your Deployment:**
- Backend: `https://your-backend.up.railway.app`
- Frontend: `https://your-frontend.up.railway.app` (if deployed)

**Quick Links:**
- [Railway Dashboard](https://railway.app/dashboard)
- [API Documentation](https://your-backend.up.railway.app/docs)
- [Health Check](https://your-backend.up.railway.app/api/health)

---

*Last Updated: January 16, 2025*
*Version: 1.0.0*
*Project: M-Pesa Expense Tracker*
