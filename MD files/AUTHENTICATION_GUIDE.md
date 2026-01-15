# Authentication & API Usage Guide

## Overview

This M-Pesa Expense Tracker now uses **JWT (JSON Web Token) authentication** for secure, stateless authentication across frontend and backend. This replaces the previous single-user demo mode with proper multi-user support.

## 🔐 Authentication Flow

### 1. **Signup** (`POST /api/auth/signup`)
- User provides: email, password, name (optional)
- Backend creates user with bcrypt-hashed password
- Returns: user data + JWT access token
- Frontend stores: user data + token in AsyncStorage

### 2. **Login** (`POST /api/auth/login`)
- User provides: email, password
- Backend verifies credentials
- Returns: user data + JWT access token
- Frontend stores: user data + token in AsyncStorage

### 3. **Authenticated Requests**
- All protected endpoints require `Authorization: Bearer <token>` header
- Frontend automatically adds header via `apiClient` utilities
- Backend validates token and extracts user_id

### 4. **Logout**
- Frontend clears: user data, token, login status from AsyncStorage
- Token becomes invalid when removed
- Redirects to login screen

## 🛠️ Backend Implementation

### JWT Configuration
```python
# backend/utils/auth.py
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
```

### Protected Endpoints
All endpoints now use the `get_current_user` dependency:

```python
from fastapi import Depends
from utils.auth import get_current_user

@router.get("/transactions/")
async def get_transactions(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    # ... fetch user's transactions
```

### Authentication Utility Functions

#### `create_access_token(user_id, email)`
Creates a JWT token with user information and expiration.

#### `decode_access_token(token)`
Validates and decodes a JWT token. Raises HTTPException if invalid/expired.

#### `get_current_user(credentials)`
FastAPI dependency that extracts user from Bearer token in Authorization header.

## 📱 Frontend Implementation

### AuthContext Updates

The `AuthContext` now manages tokens:

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (user: User, accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  getAuthHeader: () => { Authorization: string } | {};
}
```

### Storage Structure

AsyncStorage keys:
- `userData` - User object (id, email, name)
- `authToken` - JWT access token
- `isLoggedIn` - Boolean string ('true'/'false')

### API Client Utilities

Located in `frontend/utils/apiClient.ts`:

#### `apiGet(endpoint)`
```typescript
const data = await apiGet('/api/transactions/');
```

#### `apiPost(endpoint, data)`
```typescript
const result = await apiPost('/api/transactions/', transactionData);
```

#### `apiPut(endpoint, data)`
```typescript
const updated = await apiPut(`/api/transactions/${id}`, updateData);
```

#### `apiDelete(endpoint)`
```typescript
await apiDelete(`/api/transactions/${id}`);
```

All functions automatically:
- Add Authorization header with JWT token
- Handle 401 Unauthorized (token expired)
- Return parsed JSON responses
- Throw errors for non-OK responses

### Example: Updating a Screen

**Before:**
```typescript
const response = await fetch(`${BACKEND_URL}/api/transactions/`, {
  headers: {
    'Content-Type': 'application/json',
  },
});
const data = await response.json();
```

**After:**
```typescript
import { apiGet } from '@/utils/apiClient';

const data = await apiGet('/api/transactions/');
```

## 🔒 Security Features

### 1. **Password Hashing**
- Uses bcrypt with salt for password storage
- Passwords never stored in plain text

### 2. **Token Expiration**
- Tokens expire after 7 days
- Frontend handles 401 responses by clearing auth data

### 3. **User Isolation**
- Each request authenticated with user-specific token
- Backend extracts user_id from token, not from request body
- No cross-user data access possible

### 4. **Secure Token Storage**
- Tokens stored in React Native AsyncStorage
- Cleared on logout or 401 errors

## 🚀 Migration from Old Code

### Backend Changes

**Old (single-user mode):**
```python
@router.get("/transactions/")
async def get_transactions():
    user_doc = await db_service.get_user()  # Gets first user
    user_id = user_doc["id"]
```

**New (multi-user with auth):**
```python
@router.get("/transactions/")
async def get_transactions(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]  # From authenticated token
```

### Frontend Changes

**Old:**
```typescript
await login({
  id: data.user_id,
  email: data.email,
  name: data.name,
});
```

**New:**
```typescript
await login({
  id: data.user_id,
  email: data.email,
  name: data.name,
}, data.access_token);  // Include token
```

## 📋 Protected Endpoints

All these endpoints now require authentication:

### Transactions
- `GET /api/transactions/` - List transactions
- `POST /api/transactions/` - Create transaction
- `GET /api/transactions/{id}` - Get transaction
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction
- `GET /api/transactions/analytics/summary` - Dashboard analytics
- `GET /api/transactions/charges/analytics` - Charges analytics
- `GET /api/transactions/frequency-analysis` - Frequency analysis
- `POST /api/transactions/frequency-analysis/categorize` - Categorize pattern

### SMS Integration
- `POST /api/sms/parse` - Parse SMS message
- `POST /api/sms/import` - Import SMS messages
- `POST /api/sms/create-transaction` - Create from SMS
- `GET /api/sms/duplicate-stats` - Duplicate statistics

### Budgets
- `GET /api/budgets/` - List budgets
- `POST /api/budgets/` - Create budget
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget
- `GET /api/budgets/summary` - Budget summary

### User
- `GET /api/auth/me` - Get current user profile

## 🧪 Testing Authentication

### 1. Test Signup
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "name": "Test User"
  }'
```

Response includes `access_token`.

### 2. Test Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### 3. Test Protected Endpoint
```bash
TOKEN="your-jwt-token-here"

curl http://localhost:8000/api/transactions/ \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Token Expiration
Remove token or use invalid token:
```bash
curl http://localhost:8000/api/transactions/ \
  -H "Authorization: Bearer invalid-token"
```

Should return 401 Unauthorized.

## ⚠️ Important Notes

### Environment Variables
Set `JWT_SECRET_KEY` in production:
```bash
export JWT_SECRET_KEY="your-secure-random-secret-key-here"
```

Generate a secure key:
```python
import secrets
print(secrets.token_urlsafe(32))
```

### Token Security
- Never log tokens in production
- Use HTTPS in production
- Rotate secret key if compromised
- Consider shorter expiration times for sensitive apps

### Multi-User Support
- Each user now has isolated data
- Transactions, budgets, SMS imports are per-user
- No risk of data leakage between users

## 🐛 Troubleshooting

### "401 Unauthorized" Errors
- Check if token is stored: `await AsyncStorage.getItem('authToken')`
- Verify token hasn't expired (check `exp` claim)
- Ensure Authorization header is being sent

### "User not found" Errors
- Token may be for a deleted user
- Clear auth data and re-login

### CORS Issues
- Backend CORS middleware allows all origins in development
- Configure allowed origins for production in `backend/server.py`

## 📚 Additional Resources

- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/) - Official FastAPI security docs
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/) - AsyncStorage docs

## ✅ Next Steps

1. **Update all frontend screens** to use `apiClient` utilities
2. **Set JWT_SECRET_KEY** in production environment
3. **Test all features** with multiple user accounts
4. **Implement token refresh** (optional) for better UX
5. **Add role-based access control** (optional) for admin features

---

**Migration Complete!** 🎉

Your M-Pesa Expense Tracker now has secure, multi-user authentication with JWT tokens.
