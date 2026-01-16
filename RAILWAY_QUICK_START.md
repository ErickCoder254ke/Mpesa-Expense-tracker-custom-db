# Railway Deployment - Quick Start Checklist

**⏱️ Estimated Time: 15-20 minutes**

This is a condensed checklist for deploying to Railway. For detailed instructions, see [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md).

---

## 🚀 Quick Deployment Steps

### Step 1: Prerequisites (5 min)

- [ ] Railway account created ([railway.app](https://railway.app/))
- [ ] GitHub repository connected
- [ ] PesaDB API key obtained
- [ ] JWT secret key generated:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```

### Step 2: Deploy Backend (5 min)

1. **Create Railway Project**
   - Go to Railway Dashboard → "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Add Environment Variables**
   - Go to your service → "Variables" tab
   - Add these variables:
   ```
   PESADB_API_KEY=<your_pesadb_api_key>
   JWT_SECRET_KEY=<your_generated_secret_key>
   PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
   PESADB_DATABASE=mpesa_tracker
   ```

3. **Generate Public Domain**
   - Settings → Networking → "Generate Domain"
   - Copy the URL (e.g., `https://xxx.up.railway.app`)

4. **Verify Deployment**
   ```bash
   curl https://your-backend.up.railway.app/api/health
   ```
   - Should return `{"status": "healthy", ...}`

### Step 3: Deploy Frontend (Optional, 5 min)

1. **Create Frontend Service**
   - Railway Dashboard → "New" → "GitHub Repo"
   - Select same repository
   - Set Root Directory: `frontend`

2. **Configure Build**
   - Settings → Build Command: `npm install && npm run build:web`
   - Settings → Start Command: `npm run serve:web`

3. **Add Environment Variable**
   ```
   EXPO_PUBLIC_BACKEND_URL=https://your-backend.up.railway.app
   ```

4. **Generate Domain**
   - Settings → Networking → "Generate Domain"

### Step 4: Test Everything (5 min)

- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] Can sign up a new user
- [ ] Can login and logout
- [ ] Can create a transaction
- [ ] Can view transactions

---

## 🔧 Quick Troubleshooting

**Backend won't start?**
- Check logs: Deployments → View Logs
- Verify PESADB_API_KEY is set correctly
- Test: `curl -X POST https://your-backend.up.railway.app/api/initialize-database`

**Frontend can't connect?**
- Verify EXPO_PUBLIC_BACKEND_URL is correct
- Should be: `https://your-backend.up.railway.app` (no trailing slash)
- Check browser console for errors

**Database errors?**
- Initialize database manually:
  ```bash
  curl -X POST https://your-backend.up.railway.app/api/initialize-database
  ```

---

## 📁 Files Created for Deployment

These files have been created in your repository:

- ✅ `Dockerfile` - Docker configuration for backend
- ✅ `railway.json` - Railway deployment configuration
- ✅ `Procfile` - Process file for Railway
- ✅ `.env.example` - Environment variables template
- ✅ `frontend/railway.toml` - Frontend Railway configuration
- ✅ `RAILWAY_DEPLOYMENT_GUIDE.md` - Comprehensive guide
- ✅ `RAILWAY_QUICK_START.md` - This file

---

## 📝 Next Steps After Deployment

1. **Test thoroughly** - Try all features
2. **Update README** - Add your Railway URLs
3. **Monitor** - Check Railway dashboard regularly
4. **Secure** - Rotate JWT_SECRET_KEY every 90 days
5. **Backup** - Document all environment variables securely

---

## 🆘 Need Help?

- **Detailed Guide**: [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app/)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)

---

## ✅ Deployment Complete!

**Your URLs:**
- Backend: `https://your-backend.up.railway.app`
- Frontend: `https://your-frontend.up.railway.app`
- API Docs: `https://your-backend.up.railway.app/docs`

**Congratulations! Your M-Pesa Expense Tracker is now live! 🎉**
