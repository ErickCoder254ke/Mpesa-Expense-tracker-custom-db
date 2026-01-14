# M-Pesa Expense Tracker - MVP Implementation Plan

## 🎯 Project Overview
Build a cross-platform mobile expense tracker that helps users manage M-Pesa transactions with smart categorization, budgeting, and analytics.

## 📱 MVP Features (Priority Order)

### Phase 1: Core Infrastructure ✅
- [x] Project setup with Expo + FastAPI + MongoDB
- [ ] Data models (User, Transaction, Category, Budget)
- [ ] API endpoints for CRUD operations
- [ ] Navigation structure (Tab + Stack navigation)
- [ ] PIN-based authentication system

### Phase 2: Transaction Management 🚀
- [ ] Manual transaction entry form
- [ ] Transaction list with search/filter
- [ ] Transaction detail view
- [ ] Edit/delete transactions
- [ ] Auto-categorization system
- [ ] Manual category assignment

### Phase 3: Analytics & Dashboard 📊
- [ ] Dashboard with spending summaries
- [ ] Pie chart for category breakdown
- [ ] Line chart for spending trends
- [ ] Daily/Weekly/Monthly views
- [ ] Income vs Expense comparison

### Phase 4: Budgeting 💰
- [ ] Set monthly budgets per category
- [ ] Budget progress indicators
- [ ] Spending alerts and notifications
- [ ] Budget vs Actual comparison

## 🏗️ Technical Architecture

### Frontend (Expo React Native)
```
app/
├── (tabs)/                  # Tab navigator
│   ├── index.tsx           # Dashboard/Home
│   ├── transactions.tsx    # Transaction list
│   ├── analytics.tsx       # Charts & analytics
│   └── budget.tsx          # Budget management
├── (auth)/                 # Auth screens
│   ├── setup-pin.tsx
│   └── verify-pin.tsx
├── transaction/            # Transaction screens
│   ├── add.tsx            # Add transaction
│   └── [id].tsx           # Transaction details
├── components/             # Reusable components
│   ├── TransactionCard.tsx
│   ├── CategoryPicker.tsx
│   └── Charts/
└── hooks/                  # Custom hooks
    ├── useAuth.tsx
    └── useTransactions.tsx
```

### Backend (FastAPI)
```
backend/
├── models/
│   ├── user.py
│   ├── transaction.py
│   ├── category.py
│   └── budget.py
├── routes/
│   ├── auth.py
│   ├── transactions.py
│   ├── categories.py
│   └── budgets.py
└── services/
    ├── categorization.py
    └── analytics.py
```

### Database Schema (MongoDB)
```javascript
// Users Collection
{
  _id: ObjectId,
  pin_hash: string,
  created_at: Date,
  preferences: {
    default_currency: "KES",
    categories: [...]
  }
}

// Transactions Collection
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

// Categories Collection
{
  _id: ObjectId,
  name: string,
  icon: string,
  color: string,
  keywords: [string], // for auto-categorization
  is_default: boolean
}

// Budgets Collection
{
  _id: ObjectId,
  user_id: ObjectId,
  category_id: ObjectId,
  amount: number,
  period: "monthly",
  month: number,
  year: number,
  created_at: Date
}
```

## 📚 Required Dependencies

### Frontend
- **Charts**: `react-native-gifted-charts` or `victory-native`
- **Storage**: `@react-native-async-storage/async-storage`, `expo-secure-store`
- **Forms**: `react-hook-form`
- **Date**: `date-fns`
- **Navigation**: Already available
- **Icons**: `@expo/vector-icons` (already available)

### Backend
- **Security**: `bcrypt` for PIN hashing
- **Validation**: `pydantic` (already available)
- **Date handling**: `python-dateutil`

## 🎨 UI/UX Design Principles

### Mobile-First Design
- **Touch targets**: Minimum 44px (iOS) / 48px (Android)
- **Thumb navigation**: Bottom tabs, swipe gestures
- **Keyboard handling**: KeyboardAvoidingView for all forms
- **Safe areas**: Proper insets for notches/dynamic island

### Visual Design
- **Color scheme**: Green (M-Pesa brand), with expense red/income green
- **Typography**: Clear hierarchy, readable on mobile
- **Charts**: Simple, glanceable data visualization
- **Icons**: Consistent icon system for categories

### Navigation Flow
```
Bottom Tabs:
├── Dashboard (Home)     # Overview, recent transactions
├── Transactions         # Full transaction list
├── Analytics           # Charts and insights  
└── Budget              # Budget management

Stack Navigation:
├── Add Transaction     # Modal presentation
├── Transaction Details # Push navigation
└── Settings           # Drawer or modal
```

## 🧪 Testing Strategy

### MVP Testing Checklist
- [ ] PIN authentication flow
- [ ] Add transaction (all required fields)
- [ ] Transaction list displays correctly
- [ ] Category selection works
- [ ] Basic charts render data
- [ ] Budget creation and tracking
- [ ] Responsive design (phones/tablets)
- [ ] Keyboard handling
- [ ] Navigation flow

### Test Data
- Sample transactions across categories
- Multiple months of data for trends
- Various transaction amounts
- Different categories and budgets

## 🚀 Deployment & Next Steps

### MVP Completion Criteria
1. ✅ User can set PIN and authenticate
2. ✅ User can manually add/edit/delete transactions
3. ✅ Transactions are categorized (manual + auto)
4. ✅ Dashboard shows spending summaries
5. ✅ Basic charts display category and trend data
6. ✅ User can set and track monthly budgets
7. ✅ App works offline (local storage)

### Post-MVP Enhancements
- SMS parsing integration
- Cloud backup/sync
- Advanced analytics with AI insights
- Spending predictions and recommendations
- Export functionality (PDF/Excel)
- Biometric authentication
- Push notifications
- Multiple currency support

## 📋 Implementation Notes

### Performance Considerations
- Use FlatList/FlashList for large transaction lists
- Implement pagination for transactions
- Cache category data locally
- Optimize chart rendering with proper data aggregation

### Security & Privacy
- PIN stored as bcrypt hash
- Sensitive data in secure storage
- No cloud sync by default (local-first)
- Clear data validation on both client/server

### Error Handling
- Network connectivity checks
- Form validation with clear error messages  
- Graceful fallbacks for chart data
- Transaction conflict resolution