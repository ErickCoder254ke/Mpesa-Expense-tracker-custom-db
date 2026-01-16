# Railway Environment Variables - Quick Reference

## 🎯 Required Variables for Backend

Copy these to your Railway backend service:

```env
# PesaDB Configuration (REQUIRED)
PESADB_API_KEY=pk_your_actual_api_key_from_pesadb_dashboard
PESADB_API_URL=https://your-pesadb-instance.onrender.com/api
PESADB_DATABASE=mpesa_tracker

# Authentication (REQUIRED)
JWT_SECRET_KEY=<generate-with-command-below>
```

## 🔑 Generate JWT Secret

Run this command to generate a secure secret:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Copy the output and use it as `JWT_SECRET_KEY`.

## ⚙️ How to Set in Railway

1. Go to Railway Dashboard
2. Select your backend service
3. Click "Variables" tab
4. Click "New Variable"
5. Add each variable one by one
6. Click "Deploy" to apply changes

## ✅ Verification

After setting variables, check the deployment logs:

```
✅ All required environment variables configured
✅ PesaDB API key configured
✅ Backend starting...
```

## 🌐 Frontend Variable

The frontend also needs the backend URL:

**File: `frontend/.env`**
```env
EXPO_PUBLIC_BACKEND_URL=https://mpesa-expense-tracker-custom-db-production.up.railway.app
```

**⚠️ Important:**
- Use your actual Railway backend URL
- No trailing slash
- No `/api` suffix

## 🔗 URLs to Save

| Service | URL |
|---------|-----|
| **Railway Backend** | `https://mpesa-expense-tracker-custom-db-production.up.railway.app` |
| **Backend API Docs** | `https://mpesa-expense-tracker-custom-db-production.up.railway.app/docs` |
| **Health Check** | `https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/health` |
| **PesaDB Dashboard** | (Your PesaDB instance URL) |

## 🧪 Test Your Configuration

### 1. Test Backend Health

```bash
curl https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/health
```

**Expected:** `"status": "healthy"`

### 2. Test PesaDB Connection

```bash
curl -X POST "YOUR_PESADB_API_URL/query" \
  -H "X-API-Key: YOUR_PESADB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1 as test", "db": "mpesa_tracker"}'
```

**Expected:** `{"success": true, "data": [{"test": 1}]}`

### 3. Test Database Initialization

```bash
curl -X POST https://mpesa-expense-tracker-custom-db-production.up.railway.app/api/initialize-database
```

**Expected:** `"success": true`

## ❌ Common Mistakes

### Wrong PESADB_API_URL
❌ `https://your-pesadb.onrender.com` (missing `/api`)
✅ `https://your-pesadb.onrender.com/api`

### Wrong EXPO_PUBLIC_BACKEND_URL
❌ `https://your-backend.railway.app/api` (has `/api` suffix)
❌ `https://your-backend.railway.app/` (has trailing slash)
✅ `https://your-backend.railway.app`

### Forgotten Database Creation
❌ Expecting the API to create the database
✅ Create database in PesaDB dashboard first

## 🔒 Security Checklist

- [ ] Never commit `.env` files with real secrets
- [ ] Use Railway secrets for `PESADB_API_KEY`
- [ ] Use Railway secrets for `JWT_SECRET_KEY`
- [ ] Rotate keys if exposed
- [ ] Keep API keys private

## 📝 Summary

| Variable | Where to Get It | Example |
|----------|----------------|---------|
| `PESADB_API_KEY` | PesaDB Dashboard → API Keys | `pk_abc123...` |
| `PESADB_API_URL` | PesaDB Dashboard → API Endpoint | `https://xyz.onrender.com/api` |
| `PESADB_DATABASE` | PesaDB Dashboard → Database Name | `mpesa_tracker` |
| `JWT_SECRET_KEY` | Generate with Python command | `<64-char-random>` |

---

**Next Steps:**
1. ✅ Set all 4 variables in Railway
2. ✅ Create database in PesaDB dashboard
3. ✅ Deploy backend
4. ✅ Verify health endpoint
5. ✅ Update frontend `.env`
6. ✅ Test login/signup

**Need Help?** Check `PESADB_DEPLOYMENT_FIXED.md` for detailed troubleshooting.
