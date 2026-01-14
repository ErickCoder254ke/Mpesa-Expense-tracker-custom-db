# M-Pesa Expense Tracker - Project Documentation

## **Project Architecture Overview**

This is a cross-platform mobile expense tracker specifically designed for M-Pesa transactions with smart categorization, budgeting, and analytics capabilities.

## **Technology Stack**

### **Frontend - React Native (Expo)**
- **Framework**: Expo React Native with TypeScript
- **Navigation**: Expo Router with file-based routing
- **State Management**: React Context (AuthContext) + AsyncStorage for persistence
- **Styling**: StyleSheet with native React Native components
- **Structure**: Tab-based navigation with nested stack navigation

### **Backend - Python FastAPI**
- **Framework**: FastAPI with async/await support
- **Database**: MongoDB with Motor (async MongoDB driver)
- **Authentication**: PIN-based system with bcrypt hashing
- **API**: RESTful endpoints with automatic OpenAPI documentation

## **Key Technologies & Dependencies**

### **Frontend Dependencies:**
- Expo SDK (React Native framework)
- React Navigation (Expo Router)
- AsyncStorage (local data persistence)
- SecureStore (PIN storage)
- Ionicons (vector icons)

### **Backend Dependencies:**
- FastAPI (web framework)
- Motor (async MongoDB driver)
- Pydantic (data validation)
- bcrypt (PIN hashing)
- python-dateutil (date handling)

## **Project Structure & Architecture**

### **File Structure:**
```
backend/
├── models/          # Data models (User, Transaction, Category, Budget)
├── routes/          # API endpoints (auth, transactions, categories)
├── services/        # Business logic (categorization)
├── requirements.txt # Python dependencies
└── server.py        # FastAPI application entry point

frontend/
├── app/
│   ├── (auth)/      # Authentication screens
│   ├── (tabs)/      # Main tab navigation
│   ├── transaction/ # Transaction management
│   └── _layout.tsx  # Root layout
├── contexts/        # React contexts (AuthContext)
└── assets/          # Static assets
```

### **Authentication Flow:**
1. PIN setup → PIN verification → Main app access
2. Local storage tracks authentication state
3. Secure PIN storage with bcrypt hashing

### **Data Models:**
- **User**: PIN authentication + preferences
- **Transaction**: Amount, type, category, M-Pesa details
- **Category**: Name, icon, color, auto-categorization keywords
- **Budget**: Monthly spending limits per category

### **Navigation Structure:**
```
Root Layout
├── Auth Stack (PIN setup/verify)
├── Tab Navigation
│   ├── Dashboard (overview/analytics)
│   ├── Transactions (list/management)
│   ├── Analytics (charts/insights)
│   └── Budget (spending limits)
└── Transaction Stack (add/edit forms)
```

## **Core Features Implemented**

- ✅ PIN-based authentication
- ✅ Manual transaction entry (income/expense)
- ✅ Auto-categorization using keywords
- ✅ Real-time dashboard with spending analytics
- ✅ Category-based transaction organization
- ✅ Recent transactions and top categories display
- ✅ Responsive mobile UI with dark theme

## **Data Flow Architecture**

1. **Frontend** sends requests to FastAPI backend
2. **Backend** processes data and interacts with MongoDB
3. **Analytics** are calculated server-side with aggregation pipelines
4. **UI** updates reactively with real-time data refresh

## **Design Principles**

### **Mobile-First Design:**
- Touch targets: Minimum 44px (iOS) / 48px (Android)
- Thumb navigation: Bottom tabs, swipe gestures
- Keyboard handling: KeyboardAvoidingView for all forms
- Safe areas: Proper insets for notches/dynamic island

### **Visual Design:**
- Color scheme: Green (M-Pesa brand), with expense red/income green
- Typography: Clear hierarchy, readable on mobile
- Charts: Simple, glanceable data visualization
- Icons: Consistent icon system for categories

## **API Endpoints**

### **Authentication:**
- `POST /api/auth/setup-pin` - Initial PIN setup
- `POST /api/auth/verify-pin` - PIN verification
- `GET /api/auth/user-status` - Check user existence

### **Transactions:**
- `GET /api/transactions/` - List transactions with filters
- `POST /api/transactions/` - Create new transaction
- `GET /api/transactions/{id}` - Get specific transaction
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction
- `GET /api/transactions/analytics/summary` - Dashboard analytics

### **Categories:**
- `GET /api/categories/` - List all categories
- `POST /api/categories/` - Create new category

## **Database Schema (MongoDB)**

### **Users Collection:**
```javascript
{
  _id: ObjectId,
  pin_hash: string,
  created_at: Date,
  preferences: {
    default_currency: "KES",
    categories: [...]
  }
}
```

### **Transactions Collection:**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  amount: number,
  type: "expense" | "income",
  category_id: ObjectId,
  description: string,
  date: Date,
  source: "manual" | "sms",
  mpesa_details: {
    recipient: string,
    reference: string,
    transaction_id: string
  },
  created_at: Date
}
```

### **Categories Collection:**
```javascript
{
  _id: ObjectId,
  name: string,
  icon: string,
  color: string,
  keywords: [string], // for auto-categorization
  is_default: boolean
}
```

## **Development Environment**

The project follows a modern development approach with:
- Hot reloading for frontend development
- Automatic API documentation with FastAPI
- MongoDB for flexible document storage
- Local-first approach with optional cloud sync

## **Security Features**

- PIN stored as bcrypt hash
- Sensitive data in secure storage
- No cloud sync by default (local-first)
- Clear data validation on both client/server
- Network connectivity checks
- Form validation with clear error messages
