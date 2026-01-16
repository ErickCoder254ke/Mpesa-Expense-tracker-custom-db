# Frontend Deployment Guide for Render

This guide will help you deploy the M-Pesa Expense Tracker frontend to Render.

## Overview

The frontend is built using:
- **Framework**: Expo + React Native with Web support
- **Build Tool**: Metro bundler
- **Output**: Static web bundle served via `serve` package
- **Port**: Dynamically assigned by Render via `$PORT` environment variable

## Prerequisites

1. A Render account (https://render.com)
2. Backend API already deployed (see `RENDER_DEPLOYMENT_GUIDE.md`)
3. Git repository connected to Render

## Deployment Steps

### Option 1: Deploy Using render.yaml (Recommended)

The repository includes a `render.yaml` file that defines both frontend and backend services.

1. **Connect Your Repository to Render**
   - Go to Render Dashboard → Blueprints → New Blueprint Instance
   - Connect your GitHub/GitLab repository
   - Render will automatically detect the `render.yaml` file

2. **Configure Environment Variables**
   
   Before deploying, you need to set the following environment variable in the Render dashboard:

   **For the Frontend Service (`mpesa-expense-tracker-web`):**
   - `EXPO_PUBLIC_BACKEND_URL`: Your backend API URL
     - Example: `https://mpesa-expense-tracker-api.onrender.com`
     - This tells the frontend where to send API requests

   **For the Backend Service (`mpesa-expense-tracker-api`):**
   - `PESADB_API_KEY`: Your PesaDB API key (secret)
   - Other variables are pre-configured in `render.yaml`

3. **Deploy**
   - Click "Apply" to create both services
   - Render will automatically build and deploy
   - Build time: ~5-10 minutes for frontend

### Option 2: Deploy Manually

1. **Create a New Web Service**
   - Go to Render Dashboard → New → Web Service
   - Connect your repository
   - Select the repository

2. **Configure the Service**
   - **Name**: `mpesa-expense-tracker-web` (or your choice)
   - **Root Directory**: `frontend`
   - **Environment**: `Node`
   - **Region**: Oregon (or your choice)
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install && npm run build:web`
   - **Start Command**: `npm run serve:web`

3. **Add Environment Variables**
   - `NODE_VERSION`: `18.17.0`
   - `EXPO_PUBLIC_BACKEND_URL`: Your backend URL
     - Example: `https://mpesa-expense-tracker-api.onrender.com`

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

## Build Process

The build process consists of:

1. **Install Dependencies** (`npm install`)
   - Installs all packages from `frontend/package.json`
   - Includes Expo, React Native Web, and Metro bundler

2. **Build Web Bundle** (`npm run build`)
   - Runs `expo export --platform web`
   - Compiles React Native components to web-compatible code using Metro bundler
   - Outputs static files to `dist/` directory
   - Includes HTML, CSS, and JavaScript bundles

3. **Serve Static Files** (`npm run serve:web`)
   - Runs `npx serve dist -s -l ${PORT:-3000}`
   - Serves the static files from `dist/`
   - Uses Render's `$PORT` environment variable
   - Fallback to port 3000 for local development

## Environment Variables

### Required

- **EXPO_PUBLIC_BACKEND_URL**: Backend API URL
  - Must be set in Render dashboard
  - Used at build time to configure API endpoint
  - Example: `https://your-backend.onrender.com`

### Optional

- **NODE_VERSION**: Node.js version (default: 18.17.0)
  - Pre-configured in `render.yaml`
  - Ensures consistent builds

## Configuration Files

### Key Files Modified for Deployment

1. **`frontend/package.json`**
   - Updated `serve:web` script to use `$PORT` environment variable
   - Supports both Render deployment and local development

2. **`render.yaml`** (root level)
   - Defines both frontend and backend services
   - Includes `rootDir: frontend` for correct build context
   - Pre-configured environment variables

3. **`frontend/config/api.ts`**
   - Resolves backend URL from environment variables
   - Falls back to app.json configuration
   - Supports both development and production

4. **`frontend/app.json`**
   - Contains default backend URL in `extra` section
   - Used as fallback if environment variable not set
   - Currently set to: `https://mpesa-expense-tracker-custom-db.onrender.com`
   - Configured to use Metro bundler (`"web": { "bundler": "metro" }`)
   - Metro is the modern Expo bundler (replaces older Webpack bundler)

## API Configuration

The frontend determines the backend URL using this priority:

1. **app.json extra config** (highest priority)
   - `extra.EXPO_PUBLIC_BACKEND_URL`
   - Currently: `https://mpesa-expense-tracker-custom-db.onrender.com`

2. **Environment variable** (build-time)
   - `process.env.EXPO_PUBLIC_BACKEND_URL`
   - Set in Render dashboard

3. **Default fallback** (hardcoded)
   - `https://mpesa-expense-tracker-custom-db.onrender.com`

### Updating Backend URL

To point to a different backend:

**Option 1: Via Render Dashboard (Recommended)**
- Go to your frontend service → Environment
- Update `EXPO_PUBLIC_BACKEND_URL`
- Trigger a manual deploy

**Option 2: Via app.json**
- Edit `frontend/app.json`
- Update `extra.EXPO_PUBLIC_BACKEND_URL`
- Commit and push changes

## Troubleshooting

### Build Failures

**Problem**: npm install fails
- **Solution**: Check that `rootDir: frontend` is set in render.yaml
- **Reason**: Ensures npm runs in the frontend directory with correct package.json

**Problem**: Error "expo export:web can only be used with Webpack"
- **Solution**: Use `expo export --platform web` instead
- **Solution**: Verify `app.json` has `"web": { "bundler": "metro" }`
- **Reason**: The command `expo export:web` only works with Webpack bundler, not Metro

**Problem**: expo export fails
- **Solution**: Check Node version (should be 18.x)
- **Solution**: Verify all dependencies in package.json are available
- **Reason**: Expo requires specific Node versions and dependencies

**Problem**: Build times out (>15 minutes on free tier)
- **Solution**: Consider upgrading Render plan
- **Solution**: Remove unused dependencies from package.json
- **Reason**: Free tier has 15-minute build timeout

### Runtime Issues

**Problem**: Frontend can't connect to backend
- **Solution**: Verify `EXPO_PUBLIC_BACKEND_URL` is correct
- **Solution**: Check backend service is running
- **Solution**: Check browser console for CORS errors

**Problem**: Port binding errors
- **Solution**: Verify `serve:web` script uses `${PORT:-3000}`
- **Reason**: Render assigns dynamic ports

**Problem**: 404 errors on routes
- **Solution**: Ensure `serve` uses `-s` flag (single-page app mode)
- **Reason**: React Router needs all routes to serve index.html

### Debugging

**View Build Logs**
- Render Dashboard → Your Service → Logs → Build Logs

**View Runtime Logs**
- Render Dashboard → Your Service → Logs → Runtime Logs

**Check Environment Variables**
- Render Dashboard → Your Service → Environment
- Verify all required variables are set

**Test Backend Connection**
- Open browser console on deployed frontend
- Look for backend URL resolution logs
- Check network tab for API requests

## Deployment Checklist

Before deploying, ensure:

- [ ] Backend service is deployed and running
- [ ] `PESADB_API_KEY` is set in backend service (secret)
- [ ] `EXPO_PUBLIC_BACKEND_URL` is set in frontend service
- [ ] Backend URL in frontend points to deployed backend
- [ ] `render.yaml` is committed to repository
- [ ] Repository is connected to Render
- [ ] Branch is set correctly (usually `main` or `master`)

After deployment:

- [ ] Frontend service shows "Live" status
- [ ] Backend service shows "Live" status
- [ ] Can access frontend URL in browser
- [ ] Can login/signup through frontend
- [ ] API requests succeed (check browser console)
- [ ] No CORS errors in browser console

## Useful Commands

### Local Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build web bundle
npm run build

# Serve production build locally
npm run serve:web
```

### Testing Production Build Locally

```bash
cd frontend
npm run build
npm run serve:web
# Open http://localhost:3000
```

### Manual Deployment Trigger

1. Go to Render Dashboard
2. Select your frontend service
3. Click "Manual Deploy" → "Deploy latest commit"

## Cost Optimization

**Free Tier**
- Frontend and backend can run on free tier
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds

**Upgrading**
- Paid plans ($7/month) prevent spin-down
- Faster builds and more resources
- Consider for production apps

## Next Steps

1. **Custom Domain**
   - Render Dashboard → Your Service → Settings → Custom Domain
   - Add your domain and configure DNS

2. **Continuous Deployment**
   - Push to main branch automatically deploys
   - Configure in Render Dashboard → Settings → Auto-Deploy

3. **Monitoring**
   - Check Render logs for errors
   - Set up external monitoring (e.g., UptimeRobot)

4. **Scaling**
   - Upgrade to paid plan for better performance
   - Consider CDN for static assets

## Support

- Render Documentation: https://render.com/docs
- Expo Documentation: https://docs.expo.dev
- Project Issues: Check repository issues page

## Summary

Your frontend is now configured for Render deployment with:

✅ Dynamic port binding via `$PORT`
✅ Unified `render.yaml` with both services
✅ Configurable backend URL via environment variables
✅ Static web bundle optimized for production
✅ Single-page app routing support

Deploy using Render Blueprints or manual service creation. Set environment variables, and you're live!
