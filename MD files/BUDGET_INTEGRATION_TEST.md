# Budget Integration Testing Guide

## Overview
This document outlines the steps to test the budget functionality integration between frontend and backend.

## Prerequisites

### Backend Setup
1. **Database**: MongoDB must be running and accessible
2. **Dependencies**: All Python packages from `backend/requirements.txt` must be installed
3. **Environment**: Backend should be running on the configured URL

### Frontend Setup
1. **React Native**: Expo environment properly configured
2. **Backend URL**: Properly configured in `frontend/config/api.ts`

## Testing Steps

### 1. Backend API Testing

#### Start Backend Server
```bash
cd backend
python run-backend.py
```

#### Test Budget Endpoints Manually
```bash
# Health check
curl http://localhost:8000/api/health

# Get budgets (should return empty array initially)
curl "http://localhost:8000/api/budgets/?month=1&year=2024"

# Create a budget (requires categories and users to exist)
curl -X POST "http://localhost:8000/api/budgets/" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "category_id_here",
    "amount": 1000.00,
    "month": 1,
    "year": 2024
  }'
```

### 2. Frontend Integration Testing

#### Key Areas to Test

1. **Budget Loading**
   - App should load categories from backend
   - Budget list should load from `/api/budgets/` endpoint
   - Proper error handling for connection issues

2. **Budget Creation**
   - Creating new budgets should call `POST /api/budgets/`
   - Success should refresh the budget list
   - Validation errors should be handled properly

3. **Budget Editing**
   - Editing should call `PUT /api/budgets/{id}`
   - Changes should be reflected in the UI

4. **Budget Deletion**
   - Deletion should call `DELETE /api/budgets/{id}`
   - Budget should be removed from the list

5. **Progress Calculation**
   - Budget progress should be calculated based on transactions
   - Spending should be fetched from transactions API

### 3. Error Scenarios to Test

1. **Network Connectivity**
   - App behavior when backend is unreachable
   - Proper error messages displayed to user

2. **Invalid Data**
   - Backend validation errors should be shown to user
   - Frontend should handle malformed responses

3. **Missing Dependencies**
   - App should handle missing categories gracefully
   - Empty budget states should be handled properly

### 4. Performance Testing

1. **Load Times**
   - Budget screen should load within 2-3 seconds
   - Progress calculations should be efficient

2. **Data Consistency**
   - UI should remain consistent during operations
   - Refresh should update all relevant data

## Expected Backend Endpoints

### Budget Endpoints
- `GET /api/budgets/?month={month}&year={year}` - Get budgets with progress
- `POST /api/budgets/` - Create new budget
- `PUT /api/budgets/{id}` - Update budget
- `DELETE /api/budgets/{id}` - Delete budget
- `GET /api/budgets/summary` - Get budget summary
- `GET /api/budgets/alerts` - Get budget alerts

### Supporting Endpoints
- `GET /api/categories/` - Get expense categories
- `GET /api/transactions/` - Get transactions for progress calculation
- `GET /api/health` - Backend health check

## Success Criteria

✅ **Backend**
- All budget endpoints return proper responses
- Data validation works correctly
- Database operations are successful

✅ **Frontend**
- Budget screen loads without errors
- All CRUD operations work properly
- Error handling provides meaningful feedback
- UI updates reflect backend changes

✅ **Integration**
- No fallback/demo logic is used
- Real-time data synchronization works
- Performance is acceptable

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS is configured for frontend domain
   - Check browser developer tools for errors

2. **Database Connection**
   - Verify MongoDB is running
   - Check connection string in backend environment

3. **API URL Configuration**
   - Verify `BACKEND_URL` in frontend config
   - Ensure URL is accessible from frontend device

4. **Import Errors**
   - Ensure `backend/routes/__init__.py` exists
   - Check Python path and imports

### Debug Commands

```bash
# Check backend logs
cd backend && python server.py

# Check frontend logs
cd frontend && npx expo start

# Test API connectivity
curl http://your-backend-url/api/health
```

## Notes

- Remove all fallback logic from frontend
- Ensure proper error handling throughout
- Test on both development and production environments
- Verify data persistence across app restarts
