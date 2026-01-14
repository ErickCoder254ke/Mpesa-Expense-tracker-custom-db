# Database Initialization - Quick Start Guide

## 🚀 Quick Setup (3 Steps)

### 1. Configure Environment

Create `.env` file in the `backend` directory:

```bash
cp .env.example .env
# Edit .env and add your PESADB_API_KEY
```

### 2. Start the Backend

```bash
cd backend
python server.py
```

The database will initialize automatically! Look for these log messages:

```
✅ Database 'mpesa_tracker' already exists
✅ Table 'users' created successfully
✅ Table 'categories' created successfully
... (all 7 tables)
✅ Seeded 11 default categories
✅ Default user created with ID: xxx
✅ Database initialization completed successfully
```

### 3. Verify

Check the health endpoint:

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "initialized": true,
    "stats": {
      "users": 1,
      "categories": 11,
      "transactions": 0
    }
  }
}
```

## ✅ That's it!

Your database is ready. You can now:
- Start the frontend app
- Create your PIN (replaces default "0000")
- Begin tracking expenses

---

## 🧪 Optional: Run Tests

```bash
cd backend
python test_database_init.py
```

This runs comprehensive tests to verify everything works correctly.

---

## 📚 Need More Info?

See `MD files/DATABASE_INITIALIZATION_IMPROVED.md` for complete documentation.

---

## ⚠️ Troubleshooting

### Error: "PESADB_API_KEY environment variable is required"

**Fix:** Add your API key to `.env` file:
```bash
PESADB_API_KEY=your_actual_key_here
```

### Server starts but tables not created

**Fix:** Check backend logs for errors, then try manual initialization:
```bash
python scripts/init_database.py
```

### Want to start fresh?

Delete all tables in PesaDB, then restart the server. Everything will be recreated automatically.
