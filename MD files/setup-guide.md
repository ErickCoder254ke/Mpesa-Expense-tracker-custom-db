# M-Pesa Expense Tracker - Installation & Setup Guide

## Prerequisites You Need to Install

### Required Software:
1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Python** (v3.8 or higher) - [Download here](https://python.org/)
3. **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
4. **Expo CLI** - Install after Node.js: `npm install -g @expo/cli`

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
- Motor (async MongoDB driver)
- Pydantic (data validation)
- bcrypt (password hashing)
- python-dateutil (date handling)
- uvicorn (ASGI server)

### 2. Frontend Setup (React Native/Expo)

**⚠️ MISSING: package.json file**

The frontend directory is missing a `package.json` file. You need to create one first:

```bash
cd frontend
npm init -y
```

Then install the required dependencies:

```bash
npm install expo@latest react@18.x react-native@0.71.x
npm install expo-router expo-status-bar expo-secure-store
npm install @react-native-async-storage/async-storage
npm install @expo/vector-icons react-native-safe-area-context
npm install react-hook-form date-fns
npm install @react-native-community/datetimepicker

# Development dependencies
npm install --save-dev typescript @types/react @types/react-native
npm install --save-dev @babel/core
```

**Or install all at once:**
```bash
npm install expo@latest react@18.x react-native@0.71.x expo-router expo-status-bar expo-secure-store @react-native-async-storage/async-storage @expo/vector-icons react-native-safe-area-context react-hook-form date-fns @react-native-community/datetimepicker

npm install --save-dev typescript @types/react @types/react-native @babel/core
```

### 3. Environment Configuration

**Backend Environment:**
1. Create a `.env` file in the `backend` directory:
```bash
cd backend
cp ../env.txt .env
```

2. Update the `.env` file with your MongoDB connection:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=mpesa_tracker
```

**Frontend Environment:**
The environment variables are already configured in `env.txt`. Make sure to update the backend URL if needed.

### 4. Database Setup

**Option A: Local MongoDB**
1. Install and start MongoDB locally
2. Create database: `mpesa_tracker`

**Option B: MongoDB Atlas (Cloud)**
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create cluster and get connection string
3. Update `MONGO_URL` in backend `.env` file

## How to Start the Application

### 1. Start the Backend Server

```bash
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### 2. Start the Frontend App

```bash
cd frontend
npx expo start
```

This will open the Expo DevTools in your browser.

### 3. Run on Device

**Option A: Expo Go App (Easiest)**
1. Install "Expo Go" app on your phone
2. Scan the QR code from the Expo DevTools

**Option B: Simulators**
- Press `i` for iOS simulator (macOS only)
- Press `a` for Android emulator
- Press `w` for web browser

## Project Structure After Setup

```
backend/
├── .env                 # Environment variables
├── requirements.txt     # Python dependencies
├── server.py           # FastAPI app entry point
├── models/             # Data models
├── routes/             # API endpoints
└── services/           # Business logic

frontend/
├── package.json        # Node.js dependencies (you'll create this)
├── app/               # Expo Router app directory
├── contexts/          # React contexts
├── assets/            # Static assets
└── .expo/             # Expo generated files (don't commit)
```

## Troubleshooting

### Common Issues:

1. **"Module not found" errors in frontend:**
   - Make sure you created `package.json` and installed dependencies
   - Run `npm install` in the frontend directory

2. **Backend connection errors:**
   - Check if MongoDB is running
   - Verify `MONGO_URL` in `.env` file
   - Ensure backend server is running on port 8000

3. **Expo app won't start:**
   - Make sure Expo CLI is installed globally: `npm install -g @expo/cli`
   - Clear Expo cache: `npx expo start --clear`

4. **Environment variable issues:**
   - Ensure `.env` file exists in backend directory
   - Restart backend server after changing environment variables

## Development Commands

### Backend:
```bash
# Start development server
python -m uvicorn server:app --reload

# Run tests
python -m pytest

# Format code
black .
```

### Frontend:
```bash
# Start Expo development server
npx expo start

# Start for specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Clear cache
npx expo start --clear
```

## Next Steps

1. Install all prerequisites
2. Follow backend setup steps
3. Create frontend package.json and install dependencies
4. Set up environment variables
5. Start both backend and frontend servers
6. Test the app on your device or simulator

The app should now be running with PIN authentication, transaction management, and dashboard analytics!
