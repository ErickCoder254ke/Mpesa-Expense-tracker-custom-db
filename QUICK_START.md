# Quick Start Guide - Updated System

## ✅ What Was Fixed

### 1. Automatic Database Initialization
- **Backend now automatically creates database tables on startup**
- **No manual setup required**
- Default categories are seeded automatically

### 2. PIN Prompt on Startup
- **Fixed authentication flow**
- **Better error handling and retries**
- **Improved loading states**

## 🚀 How to Start

### Step 1: Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# backend/.env
PESADB_API_KEY=your_pesadb_api_key_here
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_DATABASE=mpesa_tracker
```

**Check your configuration:**
```bash
cd backend
python check_environment.py
```

### Step 2: Start the Backend

```bash
cd backend
python server.py
```

**You should see:**
```
🚀 Server starting up - checking database...
📝 Creating table 'users'...
✅ Table 'users' created successfully
📦 Seeding default categories...
✅ Database ready: 7 tables created, 11 categories seeded
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 3: Start the Frontend

```bash
cd frontend
npm start
```

### Step 4: Use the App

1. **First Launch:**
   - App will check for existing user
   - Navigate to "Setup PIN" screen
   - Create your 4-digit PIN
   - Set up security question
   - You're ready to go!

2. **Subsequent Launches:**
   - App will detect existing user
   - Navigate to "Verify PIN" screen
   - Enter your PIN
   - Access your expense tracker

## 🧪 Test Everything

### Test 1: Verify Backend is Running

```bash
curl http://localhost:8000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "initialized": true,
    "stats": {
      "categories": 11
    }
  }
}
```

### Test 2: Check User Status

```bash
curl http://localhost:8000/api/auth/user-status
```

**Before PIN setup:**
```json
{
  "has_user": false,
  "user_id": null,
  "categories_count": 11
}
```

**After PIN setup:**
```json
{
  "has_user": true,
  "user_id": "some-uuid",
  "categories_count": 11
}
```

### Test 3: App Navigation Flow

1. **Close app completely**
2. **Clear app from background**
3. **Reopen app**
4. **Observe:**
   - Shows splash screen
   - Checks backend
   - Navigates to PIN verification (if user exists)
   - Or navigates to PIN setup (if no user)

## 📊 Understanding the Database

### Tables Created Automatically:

| Table | Purpose |
|-------|---------|
| `users` | User authentication |
| `categories` | Transaction categories |
| `transactions` | M-Pesa transactions |
| `budgets` | Monthly budgets |
| `sms_import_logs` | SMS import history |
| `duplicate_logs` | Duplicate detection |
| `status_checks` | Health monitoring |

### Default Categories:

The system automatically creates 11 default categories:
- 🍔 Food & Dining
- 🚗 Transport
- 🛍️ Shopping
- 📱 Bills & Utilities
- 🎬 Entertainment
- ⚕️ Health & Fitness
- 📚 Education
- 📞 Airtime & Data
- 💸 Money Transfer
- 💰 Savings & Investments
- 📌 Other

## 🔧 Troubleshooting

### Backend won't start?
1. Check `.env` file exists in `backend/` directory
2. Run `python check_environment.py`
3. Verify PesaDB API key is correct

### Frontend shows blank screen?
1. Check if backend is running: `curl http://localhost:8000/api/health`
2. Check console logs in app for errors
3. Ensure `EXPO_PUBLIC_BACKEND_URL` is set correctly in `frontend/app.json`

### App goes to wrong screen?
1. Check backend logs for errors
2. Test user status endpoint: `curl http://localhost:8000/api/auth/user-status`
3. Clear app data and try again

### Database tables not created?
1. Check backend startup logs
2. Verify PesaDB credentials
3. Check network connectivity to PesaDB API

## 💡 Key Features

### ✅ Automatic Database Setup
- No manual SQL scripts needed
- Tables created on first run
- Safe to restart - won't duplicate data

### ✅ Smart Authentication Flow
- Detects if user exists
- Routes to correct screen
- Handles errors gracefully
- Retries on failures

### ✅ Comprehensive Health Monitoring
- `/api/health` endpoint shows database status
- Real-time stats (users, categories, transactions)
- Helps debug issues quickly

## 📝 Manual Database Operations (Optional)

### Add Custom Category:

```sql
INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default) 
VALUES (
  'cat-groceries', 
  NULL, 
  'Groceries', 
  '🛒', 
  '#4CAF50', 
  '["groceries", "supermarket", "carrefour", "naivas"]', 
  FALSE
);
```

### Check Existing Categories:

```sql
SELECT name, icon, color FROM categories;
```

### View User Info:

```sql
SELECT id, created_at FROM users;
```

## 🎯 What's Next?

Now that your database is set up automatically:

1. ✅ Start the backend
2. ✅ Start the frontend  
3. ✅ Create your PIN
4. ✅ Start tracking M-Pesa expenses!

The app will:
- Parse M-Pesa SMS messages
- Auto-categorize transactions
- Track budgets
- Provide analytics
- Detect duplicates
- Export data

## 📚 More Information

- **Full Guide:** See `DATABASE_AUTO_INIT_GUIDE.md`
- **API Documentation:** Visit `http://localhost:8000/docs` when server is running
- **Environment Setup:** Run `python check_environment.py`

---

**Everything is now automated! Just start the servers and use the app.** 🎉
