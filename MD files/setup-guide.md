# M-Pesa Expense Tracker - Installation & Setup Guide

## Prerequisites You Need to Install

### Required Software:
1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Python** (v3.8 or higher) - [Download here](https://python.org/)
3. **Expo CLI** - Install after Node.js: `npm install -g @expo/cli`

### Database:
- **PesaDB** - Custom SQL database for transaction management
  - Contact PesaDB support to get API access credentials
  - No local database installation required

### Mobile Development (Optional):
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Expo Go App** on your phone (easiest option for testing)

## Installation Steps

### 1. Backend Setup (Python FastAPI)

Navigate to the backend directory and install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

**Backend Dependencies Included:**
- FastAPI (web framework)
- Pydantic (data validation)
- bcrypt (password hashing)
- python-dateutil (date handling)
- uvicorn (ASGI server)
- aiohttp (async HTTP client for PesaDB)
- python-dotenv (environment variable management)

### 2. Frontend Setup (React Native/Expo)

The frontend already has a complete `package.json` file. Simply install dependencies:

```bash
cd frontend
npm install
```

**Key Frontend Dependencies:**
- Expo & React Native
- Expo Router (file-based routing)
- React Hook Form (form management)
- Date-fns (date utilities)
- AsyncStorage & SecureStore (local storage)
- Custom chart components

### 3. Environment Configuration

**Backend Environment:**
1. Copy the environment template:
```bash
cd backend
cp ../env.txt .env
```

2. Update the `.env` file with your PesaDB credentials:
```env
# PesaDB Configuration (Required)
PESADB_API_URL=https://pesacoredb-backend.onrender.com/api
PESADB_API_KEY=your_pesadb_api_key_here
PESADB_DATABASE=mpesa_tracker

# Optional: Custom backend port
PORT=8000
```

**Important:** Replace `your_pesadb_api_key_here` with your actual PesaDB API key.

**Frontend Environment:**
The frontend automatically connects to the backend URL configured in `app.json`. For development:
- The app uses the Render backend URL by default
- For local development, set `EXPO_PUBLIC_BACKEND_URL` in your environment

### 4. Database Setup

**Initialize PesaDB Schema:**

Run the database initialization script to create all tables and seed data:

```bash
cd backend
python scripts/init_database.py
```

This will:
- Create all necessary tables (users, categories, transactions, budgets, etc.)
- Add indexes for performance
- Seed default expense/income categories
- Verify the database connection

**Database Schema Includes:**
- `users` - User accounts with PIN authentication
- `categories` - Expense and income categories
- `transactions` - All transactions (manual and SMS-imported)
- `budgets` - Monthly budget allocations
- `sms_import_logs` - SMS import tracking
- `duplicate_logs` - Duplicate detection logs
- `status_checks` - System health checks

## How to Start the Application

### 1. Start the Backend Server

```bash
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- Local: `http://localhost:8000`
- Network: `http://YOUR_IP:8000` (for testing on physical devices)
- API Docs: `http://localhost:8000/docs`

**Verify Backend:**
```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "status": "healthy",
  "message": "M-Pesa Expense Tracker API is running",
  "database_type": "PesaDB",
  "version": "2.0.0"
}
```

### 2. Start the Frontend App

```bash
cd frontend
npx expo start
```

This will open the Expo DevTools in your browser with a QR code.

### 3. Run on Device

**Option A: Expo Go App (Easiest)**
1. Install "Expo Go" app from App Store or Play Store
2. Scan the QR code from the Expo DevTools
3. App will load on your phone

**Option B: Simulators**
- Press `i` for iOS simulator (macOS only)
- Press `a` for Android emulator (requires Android Studio)
- Press `w` for web browser

**Option C: Development Build**
For production-like testing:
```bash
npx expo run:android
npx expo run:ios
```

## Project Structure

```
backend/
├── .env                    # Environment variables (create this)
├── requirements.txt        # Python dependencies
├── server.py              # FastAPI app entry point
├── config/
│   └── pesadb.py          # PesaDB client configuration
├── models/                # Data models (Transaction, User, etc.)
├── routes/                # API endpoints
│   ├── auth.py           # User authentication
│   ├── transactions.py   # Transaction management
│   ├── categories.py     # Category management
│   ├── budgets.py        # Budget management
│   └── sms_integration.py # SMS parsing
├── services/
│   ├── pesadb_service.py  # PesaDB data access layer
│   ├── mpesa_parser.py    # M-Pesa SMS parser
│   ├── duplicate_detector.py # Duplicate detection
│   └── categorization.py  # Auto-categorization
└── scripts/
    ├── init_database.py   # Database initialization
    └── init_pesadb.sql    # SQL schema

frontend/
├── package.json           # Node.js dependencies
├── app.json              # Expo configuration
├── app/                  # Expo Router pages
│   ├── (auth)/          # PIN setup/verification
│   ├── (tabs)/          # Main app tabs
│   └── transaction/     # Transaction screens
├── components/           # Reusable components
├── services/            # API clients
├── contexts/            # React contexts
├── types/               # TypeScript types
└── assets/              # Images, fonts, etc.
```

## Features Overview

### 1. User Authentication
- PIN-based authentication (4-6 digit PIN)
- Secure PIN storage with bcrypt hashing
- Biometric authentication support (optional)

### 2. Transaction Management
- Manual transaction entry
- SMS import from M-Pesa messages
- Transaction categorization (auto and manual)
- Edit and delete transactions
- Search and filter capabilities

### 3. Budget Tracking
- Set monthly budgets per category
- Real-time budget progress tracking
- Overspending alerts
- Budget vs. actual comparison

### 4. Analytics Dashboard
- Spending by category (pie charts)
- Spending trends over time (line charts)
- Income vs. expense comparison
- Daily, weekly, monthly views

### 5. SMS Integration
- Parse M-Pesa transaction SMS
- Bulk import multiple messages
- Automatic duplicate detection
- Smart categorization

## API Endpoints Reference

### Authentication
- `POST /api/users/` - Create user and set PIN
- `POST /api/users/verify-pin` - Verify PIN
- `GET /api/users/status` - Check if user exists

### Transactions
- `GET /api/transactions/` - List transactions (supports filters)
- `POST /api/transactions/` - Create new transaction
- `GET /api/transactions/{id}` - Get transaction details
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Categories
- `GET /api/categories/` - List all categories
- `POST /api/categories/` - Create custom category
- `DELETE /api/categories/{id}` - Delete category

### Budgets
- `GET /api/budgets/` - List budgets with spending progress
- `POST /api/budgets/` - Create new budget
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget

### SMS Integration
- `POST /api/sms/parse` - Parse single SMS message
- `POST /api/sms/import` - Bulk import SMS messages
- `GET /api/sms/import-status/{id}` - Check import status
- `POST /api/sms/create-transaction` - Create from parsed SMS
- `GET /api/sms/test-parser` - Test parser with samples

## Troubleshooting

### Common Issues:

**1. "PESADB_API_KEY environment variable is required"**
- Ensure `.env` file exists in the `backend` directory
- Check that `PESADB_API_KEY` is set in the file
- Restart the backend server after updating `.env`

**2. Backend database connection errors:**
- Verify `PESADB_API_URL` is correct and accessible
- Check your API key is valid
- Ensure PesaDB service is running
- Test connection: `curl -X POST $PESADB_API_URL/query -H "X-API-Key: $PESADB_API_KEY"`

**3. Frontend can't connect to backend:**
- Check if backend is running on port 8000
- For physical devices, use your computer's IP address instead of localhost
- Update `EXPO_PUBLIC_BACKEND_URL` if needed
- Check firewall settings

**4. Expo app won't start:**
- Clear Expo cache: `npx expo start --clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Update Expo CLI: `npm install -g @expo/cli@latest`

**5. SMS parsing failures:**
- Ensure categories are initialized: `python scripts/init_database.py`
- Check SMS message format matches M-Pesa patterns
- Test with sample messages: `GET /api/sms/test-parser`

**6. Database initialization fails:**
- Verify PesaDB API credentials
- Check network connectivity to PesaDB server
- Review error messages in console output

## Development Commands

### Backend:
```bash
# Start development server with auto-reload
python -m uvicorn server:app --reload

# Start on specific port
python -m uvicorn server:app --reload --port 8080

# Initialize database
python scripts/init_database.py

# Run tests (if configured)
python -m pytest

# Format code
black .

# Check types
mypy .
```

### Frontend:
```bash
# Start Expo development server
npx expo start

# Start with cache cleared
npx expo start --clear

# Start for specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Run on device
npx expo run:android
npx expo run:ios

# Update dependencies
npx expo install --check

# Build for production
eas build --platform android
eas build --platform ios
```

## Testing the Application

### 1. Test Backend Health
```bash
curl http://localhost:8000/
curl http://localhost:8000/health
```

### 2. Create Test User
```bash
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

### 3. Add Test Transaction
```bash
curl -X POST http://localhost:8000/api/transactions/ \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "type": "expense",
    "description": "Test grocery purchase",
    "date": "2025-01-14T12:00:00Z"
  }'
```

### 4. Test SMS Parser
```bash
curl -X POST http://localhost:8000/api/sms/parse \
  -H "Content-Type: application/json" \
  -d '{
    "message": "TJ6CF6NDST Confirmed.Ksh30.00 sent to SIMON NDERITU on 6/10/25 at 7:43 AM."
  }'
```

## Deployment

### Deploy to Render.com

1. **Create Render Account**
   - Sign up at [render.com](https://render.com)

2. **Connect Repository**
   - Link your GitHub repository
   - Select the backend directory

3. **Configure Environment Variables**
   - Add `PESADB_API_URL`
   - Add `PESADB_API_KEY` (as secret)
   - Add `PESADB_DATABASE`

4. **Deploy**
   - Render will automatically build and deploy
   - Your API will be available at `https://your-app.onrender.com`

5. **Update Frontend**
   - Update `EXPO_PUBLIC_BACKEND_URL` in `app.json`
   - Rebuild and publish the app

### Mobile App Distribution

**Development:**
- Share via Expo Go QR code
- Use development builds

**Production:**
```bash
# Configure EAS
eas build:configure

# Build for stores
eas build --platform android
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## Next Steps

1. ✅ Install all prerequisites
2. ✅ Set up backend with PesaDB credentials
3. ✅ Initialize database schema
4. ✅ Install frontend dependencies
5. ✅ Start both servers
6. ✅ Test on your device

The app is now ready for:
- PIN-based authentication
- Manual transaction entry
- SMS transaction import
- Budget tracking
- Analytics and insights

## Additional Resources

- **PesaDB Migration Guide:** See `PESADB_MIGRATION_GUIDE.md` for technical details
- **API Documentation:** Available at `http://localhost:8000/docs`
- **Expo Documentation:** [docs.expo.dev](https://docs.expo.dev)
- **FastAPI Documentation:** [fastapi.tiangolo.com](https://fastapi.tiangolo.com)

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the PesaDB Migration Guide
- Check backend logs for error details
- Review Expo DevTools for frontend issues

---

**Ready to track your M-Pesa expenses!** 🎉
