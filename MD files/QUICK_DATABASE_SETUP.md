# Quick Database Setup Guide

## ❌ Current Error
```
Failed to load categories: 500
{detail: "Error fetching categories: PesaDB Query Error: PesaDB Error: 
An error occurred: 404: Database 'mpesa_tracker' does not exist"}
```

**This means your database hasn't been created yet. Follow the steps below to set it up.**

---

## ✅ Solution: 3 Simple Steps

### Step 1: Configure Environment Variables

You need to create a `.env` file with your PesaDB credentials.

#### 1.1 Create the `.env` file

```bash
cd backend
```

Create a new file named `.env` in the `backend` directory with this content:

```bash
# backend/.env
PESADB_API_KEY=your_pesadb_api_key_here
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_DATABASE=mpesa_tracker
```

#### 1.2 Get Your PesaDB API Key

If you don't have a PesaDB API key yet:

1. Go to [PesaDB](https://pesacoredb-backend.onrender.com) or your PesaDB provider
2. Sign up or log in
3. Create a new database project
4. Copy your API key
5. Replace `your_pesadb_api_key_here` in the `.env` file with your actual key

---

### Step 2: Run the Database Setup Script

The setup script will:
- ✅ Check your environment configuration
- ✅ Create the database
- ✅ Create all tables (users, categories, transactions, budgets)
- ✅ Seed default categories
- ✅ Verify everything works

```bash
# Make sure you're in the backend directory
cd backend

# Run the setup script
python setup_database.py
```

**Expected Output:**
```
======================================================================
  🚀 M-Pesa Expense Tracker - Database Setup
======================================================================

============================================================
  Step 1: Checking Environment Configuration
============================================================

📍 API URL: https://pesacoredb-backend.onrender.com/api
📦 Database: mpesa_tracker
🔑 API Key: abc12345...

✅ Environment configuration looks good!

============================================================
  Step 2: Creating Database
============================================================

🔍 Checking if database 'mpesa_tracker' exists...
📦 Database 'mpesa_tracker' does not exist. Creating...
✅ Database 'mpesa_tracker' created successfully!

============================================================
  Step 3: Initializing Schema
============================================================

📝 Found 19 SQL statements to execute

⏳ [1/19] CREATE TABLE users...
   ✅ Success
⏳ [2/19] CREATE TABLE categories...
   ✅ Success
...

✅ Successful: 19
❌ Errors: 0

✅ Schema initialized successfully!

============================================================
  Step 4: Verifying Setup
============================================================

✅ Table 'users' exists (0 rows)
✅ Table 'categories' exists (12 rows)
✅ Table 'transactions' exists (0 rows)
✅ Table 'budgets' exists (0 rows)

📋 Sample categories (12 default categories):
   - Food & Dining: restaurant
   - Transport: car
   - Shopping: shopping-bag
   ... and 9 more

======================================================================
  ✅ Database Setup Complete!
======================================================================

🎉 Your database is ready to use!
```

---

### Step 3: Restart Your Servers

Now that the database is set up, restart both servers:

#### 3.1 Start Backend
```bash
cd backend
python server.py
```

You should see:
```
✅ PesaDB Configuration Valid
✅ Database 'mpesa_tracker' is accessible
✅ Database initialized successfully
```

#### 3.2 Start Frontend (in a new terminal)
```bash
cd frontend
npm start
```

---

## 🎉 Done!

Your app should now work! Try:
1. **Sign up** for a new account
2. **Create a transaction** (income or expense)
3. **View your dashboard**

---

## 🔧 Troubleshooting

### Issue 1: "PESADB_API_KEY environment variable is required"

**Problem**: The `.env` file is missing or not being loaded.

**Solution**:
1. Make sure `.env` file exists in `backend/` directory
2. Check the file content has the correct format (no quotes needed)
3. Restart the backend server

```bash
# Check if .env exists
ls backend/.env

# View content (should show your variables)
cat backend/.env
```

---

### Issue 2: "Database creation failed" or "Invalid API key"

**Problem**: Your PesaDB API key is incorrect or expired.

**Solution**:
1. Double-check your API key is copied correctly (no extra spaces)
2. Test your API key manually:

```bash
# Test connection (replace YOUR_KEY with your actual key)
curl -X GET https://pesacoredb-backend.onrender.com/api/databases \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json"
```

If this returns an error, your API key is invalid.

---

### Issue 3: Tables already exist

**Problem**: Running the setup script again when database already exists.

**Solution**: This is usually fine! The script will skip existing tables. You should see:
```
⚠️  Already exists (skipping)
```

If you want to start fresh, you can:
1. Delete the database from your PesaDB dashboard
2. Run the setup script again

---

### Issue 4: "Error fetching categories" still appears

**Problem**: Old backend server is still running, or cache issue.

**Solution**:
1. **Stop all running servers** (Ctrl+C)
2. **Clear Metro cache**:
   ```bash
   cd frontend
   npm run clear-cache
   ```
3. **Restart backend**:
   ```bash
   cd backend
   python server.py
   ```
4. **Restart frontend**:
   ```bash
   cd frontend
   npm start
   ```

---

## 📝 What the Setup Script Does

### Tables Created:
1. **users** - User accounts with email/password
2. **categories** - Expense/income categories (12 default categories)
3. **transactions** - All financial transactions
4. **budgets** - Monthly budget limits
5. **sms_import_logs** - SMS import history
6. **duplicate_logs** - Duplicate detection tracking
7. **status_checks** - System health checks

### Default Categories Created:
- 🍽️ Food & Dining (`restaurant`)
- 🚗 Transport (`car`)
- 🛍️ Shopping (`shopping-bag`)
- 📄 Bills & Utilities (`receipt`)
- 🎬 Entertainment (`film`)
- ⚕️ Health & Fitness (`medical`)
- 📚 Education (`book`)
- 📞 Airtime & Data (`call`)
- 💸 Money Transfer (`swap-horizontal`)
- 💰 Savings & Investments (`wallet`)
- 💵 Income (`cash`)
- 📌 Other (`ellipsis-horizontal`)

---

## 🚀 Quick Reference

### One-Time Setup
```bash
# 1. Create .env file
cd backend
echo "PESADB_API_KEY=your_key_here" > .env
echo "PESADB_API_URL=https://pesacoredb-backend.onrender.com/api" >> .env
echo "PESADB_DATABASE=mpesa_tracker" >> .env

# 2. Run setup
python setup_database.py

# 3. Start servers
python server.py  # Terminal 1

cd ../frontend
npm start  # Terminal 2
```

### Daily Usage
```bash
# Terminal 1: Backend
cd backend
python server.py

# Terminal 2: Frontend
cd frontend
npm start
```

---

## ❓ Still Having Issues?

If you're still experiencing problems:

1. **Check backend logs** - Look for specific error messages
2. **Verify .env file** - Make sure it's in the correct location (`backend/.env`)
3. **Test database connection**:
   ```bash
   cd backend
   python test_database_connection.py
   ```
4. **Check environment**:
   ```bash
   cd backend
   python check_environment.py
   ```

---

**Need more help?** Check the detailed logs from the setup script or backend server for specific error messages.
