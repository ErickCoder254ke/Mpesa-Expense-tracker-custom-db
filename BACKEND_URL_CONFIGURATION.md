# Backend URL Configuration Guide

## Overview
Your app now uses the Railway backend at:
```
https://mpesa-expense-tracker-custom-db-production.up.railway.app
```

## Configuration Files Updated

### 1. ✅ `frontend/.env` (PRIMARY)
```env
EXPO_PUBLIC_BACKEND_URL=https://mpesa-expense-tracker-custom-db-production.up.railway.app
```
**This is your primary configuration file for local development and deployment.**

### 2. ✅ `env.txt` (ROOT - For specific environments)
Updated with the new Railway URL for compatibility.

### 3. ✅ `frontend/.env.example` (Template)
Updated to show the correct Railway URL as an example.

---

## How It Works

The app reads the backend URL in this priority order:

1. **Environment Variable** (Highest Priority)
   - `process.env.EXPO_PUBLIC_BACKEND_URL`
   - Set in Render/Railway dashboard for production

2. **app.json extra config** 
   - `extra.EXPO_PUBLIC_BACKEND_URL` in `frontend/app.json`
   - Currently not used (commented out)

3. **.env file** (Development)
   - `frontend/.env`
   - Used during local development and builds

See: `frontend/config/api.ts` for implementation

---

## For Different Environments

### Local Development
```bash
cd frontend
# Create .env file if it doesn't exist
echo "EXPO_PUBLIC_BACKEND_URL=https://mpesa-expense-tracker-custom-db-production.up.railway.app" > .env

# Start the app
npm start
```

### Testing with Local Backend
Edit `frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Production Deployment on Render

**Option 1: Use .env file (Committed to repo)**
- The `.env` file will be bundled with your build
- No additional configuration needed on Render
- ✅ Easiest for your use case

**Option 2: Set in Render Dashboard (Recommended for secrets)**
1. Go to Render → Your Frontend Service
2. Click "Environment" tab
3. Add variable:
   ```
   Key: EXPO_PUBLIC_BACKEND_URL
   Value: https://mpesa-expense-tracker-custom-db-production.up.railway.app
   ```
4. Click "Save Changes"
5. **IMPORTANT:** Manually trigger a rebuild with cache clear

---

## Important Notes

### After Changing the Backend URL:

1. **For Local Development:**
   ```bash
   cd frontend
   npm run reset  # Clear Expo cache
   npm start      # Start fresh
   ```

2. **For Render Deployment:**
   - Go to Render Dashboard → Manual Deploy
   - Select: **"Clear build cache & deploy"**
   - Wait for rebuild to complete
   - Changes are bundled at BUILD TIME, not runtime

3. **Verify the Change:**
   - Check app console logs for: "✅ Using environment variable URL:"
   - Should show your Railway URL

### Common Issues

**Problem:** Updated .env but app still uses old URL

**Solutions:**
- Clear Expo cache: `npm run reset`
- Restart dev server: Stop and run `npm start` again
- For production: Trigger manual deploy with cache clear

**Problem:** "EXPO_PUBLIC_BACKEND_URL environment variable is required"

**Solutions:**
- Ensure `frontend/.env` exists
- Verify the variable name is exactly: `EXPO_PUBLIC_BACKEND_URL`
- Restart Expo dev server

---

## Verification

To verify your backend URL is correctly configured:

1. Start your app (development or production)
2. Check the console logs
3. You should see:
   ```
   🔧 Backend URL Resolution:
   - Environment variable: https://mpesa-expense-tracker-custom-db-production.up.railway.app
   ✅ Using environment variable URL: https://mpesa-expense-tracker-custom-db-production.up.railway.app
   ```

---

## Files Structure

```
project-root/
├── env.txt                          # Root env config (compatibility)
├── frontend/
│   ├── .env                         # PRIMARY: Your backend URL here
│   ├── .env.example                 # Template for new developers
│   ├── config/
│   │   └── api.ts                   # Reads EXPO_PUBLIC_BACKEND_URL
│   └── utils/
│       └── apiClient.ts             # Uses BACKEND_URL from api.ts
```

---

## Security Note

The `.env` file contains your production backend URL. Since this URL is public-facing (it's compiled into your web/mobile app), it's safe to commit to your repository. However, **never commit sensitive secrets** like API keys or database passwords to `.env`.

For sensitive variables:
- Use `.env.local` (which is gitignored)
- Or set them in Render/Railway dashboard directly

---

## Quick Reference

| Environment | Backend URL | Configuration Method |
|------------|-------------|---------------------|
| **Production** | `https://mpesa-expense-tracker-custom-db-production.up.railway.app` | `frontend/.env` |
| **Local Dev** | Same as production or `http://localhost:8000` | `frontend/.env` |
| **Render Deploy** | Same as production | Set in Render dashboard (optional) |

---

## Next Steps

1. ✅ `.env` file created with Railway URL
2. ✅ `env.txt` updated for compatibility
3. ⏭️ **Test locally**: `cd frontend && npm start`
4. ⏭️ **Deploy to Render**: Trigger manual deploy with cache clear
5. ⏭️ **Verify**: Check console logs show Railway URL

---

Need help? Check the console logs - they show exactly which URL is being used and from which source.
