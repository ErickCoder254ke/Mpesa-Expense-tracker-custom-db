# Render Deployment Guide - Frontend

This guide covers deploying the M-Pesa Expense Tracker frontend to Render as a web application.

## Prerequisites

- Render account (free tier works)
- GitHub repository with your code
- Backend already deployed (you'll need its URL)

## Deployment Commands

### Build Command
```bash
npm install && npm run build:web
```

### Start Command
```bash
npm run serve:web
```

## Step-by-Step Deployment to Render

### Option 1: Using Render Dashboard (Recommended for First Time)

1. **Push Your Code to GitHub**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Create New Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your frontend code

3. **Configure the Service**
   ```
   Name: mpesa-expense-tracker-web
   Region: Oregon (US West) or closest to you
   Branch: main
   Root Directory: frontend
   Runtime: Node
   Build Command: npm install && npm run build:web
   Start Command: npm run serve:web
   Instance Type: Free
   ```

4. **Set Environment Variables**
   
   In the "Environment" section, add:
   ```
   NODE_VERSION = 18.17.0
   EXPO_PUBLIC_BACKEND_URL = https://your-backend.onrender.com
   ```
   
   Replace `https://your-backend.onrender.com` with your actual backend URL from Render.

5. **Deploy**
   - Click "Create Web Service"
   - Wait for the build to complete (5-10 minutes first time)
   - Your app will be available at: `https://mpesa-expense-tracker-web.onrender.com`

### Option 2: Using render.yaml (Infrastructure as Code)

1. **Copy render-web.yaml to Root**
   ```bash
   cp frontend/render-web.yaml ./render.yaml
   ```

2. **Update render.yaml**
   Edit the file and set your backend URL:
   ```yaml
   envVars:
     - key: EXPO_PUBLIC_BACKEND_URL
       value: https://your-backend.onrender.com
   ```

3. **Connect to Render**
   - Go to Render Dashboard
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render will automatically detect render.yaml
   - Click "Apply" to deploy

## Environment Variables Required

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_VERSION` | `18.17.0` | Node.js version for build |
| `EXPO_PUBLIC_BACKEND_URL` | `https://your-backend.onrender.com` | Backend API URL |

**Important:** The frontend needs to know where your backend is hosted. Make sure to set `EXPO_PUBLIC_BACKEND_URL` to your backend's Render URL.

## Update Backend URL in Code

If you haven't already, update `frontend/config/api.ts`:

```typescript
// Use environment variable for backend URL, with fallback for local dev
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
```

## Troubleshooting

### Build Fails with "Command not found: expo"

**Solution:** Expo CLI is installed automatically via `npm install`. If build still fails, update build command to:
```bash
npm install && npx expo export:web
```

### "Cannot find module 'serve'"

**Solution:** Make sure `serve` is in dependencies (not devDependencies):
```bash
npm install --save serve
```

### Frontend Can't Connect to Backend

**Symptoms:** 
- Network errors in console
- "Failed to fetch" errors
- Backend requests timing out

**Solutions:**

1. **Check CORS Settings** - Make sure your backend allows requests from your Render frontend URL. Update `backend/server.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "http://localhost:19006",
           "https://mpesa-expense-tracker-web.onrender.com",  # Add your frontend URL
       ],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Verify Environment Variable** - Check that `EXPO_PUBLIC_BACKEND_URL` is set correctly in Render dashboard

3. **Test Backend URL** - Visit your backend health endpoint:
   ```
   https://your-backend.onrender.com/health
   ```
   Should return `{"status": "healthy"}`

### App Loads but Shows Empty/Broken UI

**Causes:**
- Static assets not loading
- Metro bundler configuration issues

**Solution:** Clear build cache and rebuild:
```bash
npm run clear-cache
npm run build:web
```

### Render Build Times Out

**Solution:** Render free tier has 15-minute build timeout. Optimize your build:

1. Use build cache - Render caches `node_modules` by default
2. Remove unused dependencies
3. Consider upgrading to paid tier for faster builds

## Free Tier Limitations

Render free tier includes:
- ✅ 750 hours/month of runtime
- ✅ Automatic HTTPS
- ✅ Custom domains
- ⚠️ App sleeps after 15 minutes of inactivity
- ⚠️ 512MB RAM limit
- ⚠️ Slower CPU

**Important:** Your frontend will sleep after 15 minutes of no traffic. First request after sleep will be slow (30-60 seconds). Consider:
- Upgrading to paid tier ($7/month) for always-on service
- Using a keep-alive service to ping your app periodically

## Verifying Deployment

### 1. Check Build Logs
In Render dashboard, click on your service → "Logs" tab. Look for:
```
Build successful!
Serving dist on port 3000
```

### 2. Test the Live App
1. Visit your Render URL: `https://mpesa-expense-tracker-web.onrender.com`
2. Try logging in
3. Add a test transaction
4. Check analytics page
5. Open browser console - should see no errors

### 3. Test Backend Connection
In browser console, you should see:
```
📡 Backend URL: https://your-backend.onrender.com
✅ Dashboard data received: {...}
✅ Charges analytics received: {...}
```

## Continuous Deployment

Render automatically redeploys when you push to your main branch:

```bash
# Make changes to your code
git add .
git commit -m "Update frontend"
git push origin main
```

Render will:
1. Detect the push
2. Run build command
3. Deploy new version (5-10 minutes)
4. Automatically switch traffic to new version

## Performance Optimization

### Enable Compression
Update start command to enable gzip:
```bash
npx serve dist -s -l 3000 --compression
```

### Add Caching Headers
Create `frontend/serve.json`:
```json
{
  "public": "dist",
  "cleanUrls": true,
  "headers": [
    {
      "source": "**/*.@(jpg|jpeg|gif|png|svg|ico|woff|woff2)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

Then update start command:
```bash
npx serve dist -s -l 3000 -c serve.json
```

## Custom Domain Setup

1. Go to Render Dashboard → Your Service → Settings
2. Scroll to "Custom Domain"
3. Add your domain (e.g., `app.yourdomain.com`)
4. Add DNS records as shown by Render:
   ```
   Type: CNAME
   Name: app
   Value: mpesa-expense-tracker-web.onrender.com
   ```
5. Wait for DNS propagation (up to 48 hours)
6. Render automatically provisions SSL certificate

## Health Checks

Render can monitor your app health. Add a health endpoint or use the root path:

In Render dashboard:
```
Health Check Path: /
```

## Monitoring

View real-time logs:
```bash
# Option 1: Render Dashboard
Go to your service → Logs tab

# Option 2: Render CLI (if installed)
render logs -f mpesa-expense-tracker-web
```

## Cost Estimate

| Tier | Price | Features |
|------|-------|----------|
| Free | $0/month | 750 hours, sleeps after 15min |
| Starter | $7/month | Always-on, 512MB RAM |
| Standard | $25/month | 2GB RAM, better performance |

For a personal expense tracker, **free tier is sufficient** for testing. Upgrade to Starter if you want always-on availability.

## Summary of Commands

```bash
# Local testing
cd frontend
npm install
npm run web

# Build for production (test locally)
npm run build:web
npm run serve:web

# Deploy to Render
git add .
git commit -m "Deploy to Render"
git push origin main
```

## Next Steps

1. ✅ Deploy backend first (if not done)
2. ✅ Set `EXPO_PUBLIC_BACKEND_URL` environment variable
3. ✅ Push code to GitHub
4. ✅ Create Render web service
5. ✅ Configure build/start commands
6. ✅ Wait for build to complete
7. ✅ Test the deployed app
8. ✅ Update backend CORS to allow frontend domain

Your M-Pesa Expense Tracker will be live at:
- Frontend: `https://mpesa-expense-tracker-web.onrender.com`
- Backend: `https://your-backend.onrender.com`

Enjoy your deployed app! 🚀
