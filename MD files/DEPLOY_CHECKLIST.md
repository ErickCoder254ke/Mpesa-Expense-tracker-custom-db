# Deployment Checklist - Critical Fixes

## ⚠️ IMPORTANT: You Must Commit and Push Changes!

The fixes have been applied to your local files, but **Render deploys from your Git repository**. You need to commit and push all changes.

---

## Step 1: Verify Files Were Modified

Run this command to see what files were changed:
```bash
git status
```

You should see these files as modified:
- `backend/config/pesadb.py` (syntax error fix)
- `backend/services/pesadb_service.py` (import fix)
- `backend/services/duplicate_detector.py` (import fix)
- `backend/requirements.txt` (aiohttp added)
- `backend/render.yaml` (rootDir added)
- `run-backend.py` (MongoDB references removed)
- `test-backend-connection.py` (MongoDB references removed)

---

## Step 2: Commit All Changes

```bash
# Add all modified files
git add backend/config/pesadb.py
git add backend/services/pesadb_service.py
git add backend/services/duplicate_detector.py
git add backend/requirements.txt
git add backend/render.yaml
git add run-backend.py
git add test-backend-connection.py

# Or add all at once
git add -A

# Commit with a descriptive message
git commit -m "Fix PesaDB syntax errors and complete MongoDB migration

- Fix syntax error in pesadb.py escape_string function
- Fix relative imports in service files
- Add aiohttp dependency for PesaDB HTTP client
- Add rootDir to render.yaml for correct working directory
- Update utility scripts to use PesaDB instead of MongoDB
"
```

---

## Step 3: Push to Repository

```bash
git push origin main
# or
git push origin master
# (use whatever your main branch name is)
```

---

## Step 4: Verify Render Deployment

After pushing, Render will automatically trigger a new deployment:

1. Go to your Render dashboard
2. Check the deployment logs
3. Look for "Build successful" and "Deploy live"

---

## Step 5: Set Environment Variables in Render

Make sure these are set in your Render dashboard (if not already):

1. Go to your service in Render
2. Click "Environment" tab
3. Add these variables:

```
PESADB_API_URL = https://pesacoredb-backend.onrender.com/api
PESADB_API_KEY = <your-actual-api-key>
PESADB_DATABASE = mpesa_tracker
```

**Important:** The `PESADB_API_KEY` must be set as a secret environment variable!

---

## Step 6: Test the Deployment

Once deployed, test the health endpoint:

```bash
curl https://your-app.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "database_type": "PesaDB",
  "message": "M-Pesa Expense Tracker Backend is running (PesaDB)"
}
```

---

## Troubleshooting

### If you still see the syntax error:

1. **Check that you committed the right files:**
   ```bash
   git log -1 --stat
   ```
   You should see `backend/config/pesadb.py` in the list

2. **Verify the fix in Git:**
   ```bash
   git diff HEAD~1 backend/config/pesadb.py
   ```
   You should see the change from:
   ```python
   return f"'{json.dumps(value).replace(\"'\", \"''\")}'"
   ```
   to:
   ```python
   json_str = json.dumps(value).replace("'", "''")
   return f"'{json_str}'"
   ```

3. **Force Render to rebuild:**
   - In Render dashboard, click "Manual Deploy" → "Clear build cache & deploy"

### If you see "Module not found" errors:

Make sure `backend/requirements.txt` includes:
```
aiohttp==3.9.1
```

### If server starts but database fails:

Check that environment variables are set correctly in Render dashboard.

---

## Quick Command Summary

```bash
# 1. Check status
git status

# 2. Add all changes
git add -A

# 3. Commit
git commit -m "Fix PesaDB migration errors and add dependencies"

# 4. Push
git push

# 5. Watch deployment in Render dashboard
```

---

## Critical Files Fixed

| File | Issue | Status |
|------|-------|--------|
| `backend/config/pesadb.py` | Syntax error on line 194 | ✅ Fixed |
| `backend/services/pesadb_service.py` | Relative import issue | ✅ Fixed |
| `backend/services/duplicate_detector.py` | Relative import issue | ✅ Fixed |
| `backend/requirements.txt` | Missing aiohttp | ✅ Added |
| `backend/render.yaml` | Missing rootDir | ✅ Added |

---

**Next Action:** Run the git commands above to commit and push your changes!
