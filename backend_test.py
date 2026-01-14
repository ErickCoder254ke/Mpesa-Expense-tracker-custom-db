#!/usr/bin/env python3
"""
M-Pesa Expense Tracker Backend API Tests
Tests all backend endpoints for authentication, categories, and transactions
"""

import requests
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}Testing: {test_name}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

def make_request(method, endpoint, data=None, params=None):
    """Make HTTP request and return response"""
    url = f"{API_BASE}{endpoint}"
    try:
        if method.upper() == 'GET':
            response = requests.get(url, params=params, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=10)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, timeout=10)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        print_error(f"Request failed: {str(e)}")
        return None

def test_basic_connectivity():
    """Test basic API connectivity"""
    print_test_header("Basic API Connectivity")
    
    response = make_request('GET', '/')
    if response and response.status_code == 200:
        print_success(f"API is accessible at {API_BASE}")
        print_info(f"Response: {response.json()}")
        return True
    else:
        print_error(f"API not accessible at {API_BASE}")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
        return False

def test_user_status():
    """Test user status endpoint"""
    print_test_header("User Status Check")
    
    response = make_request('GET', '/auth/user-status')
    if response and response.status_code == 200:
        data = response.json()
        print_success("User status endpoint working")
        print_info(f"Has user: {data.get('has_user')}")
        print_info(f"User ID: {data.get('user_id')}")
        print_info(f"Categories count: {data.get('categories_count')}")
        return data
    else:
        print_error("User status endpoint failed")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
        return None

def test_pin_setup():
    """Test PIN setup"""
    print_test_header("PIN Setup")
    
    # Test with valid PIN
    pin_data = {"pin": "1234"}
    response = make_request('POST', '/auth/setup-pin', data=pin_data)
    
    if response and response.status_code == 200:
        data = response.json()
        print_success("PIN setup successful")
        print_info(f"User ID: {data.get('user_id')}")
        print_info(f"Categories created: {data.get('categories')}")
        return data
    elif response and response.status_code == 400:
        # User might already exist
        print_warning("User already exists (expected if running multiple times)")
        return {"message": "User already exists"}
    else:
        print_error("PIN setup failed")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
        return None

def test_pin_verification():
    """Test PIN verification"""
    print_test_header("PIN Verification")
    
    # Test with correct PIN
    correct_pin = {"pin": "1234"}
    response = make_request('POST', '/auth/verify-pin', data=correct_pin)
    
    if response and response.status_code == 200:
        data = response.json()
        print_success("Correct PIN verification successful")
        print_info(f"User ID: {data.get('user_id')}")
    else:
        print_error("Correct PIN verification failed")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
    
    # Test with incorrect PIN
    incorrect_pin = {"pin": "9999"}
    response = make_request('POST', '/auth/verify-pin', data=incorrect_pin)
    
    if response and response.status_code == 401:
        print_success("Incorrect PIN properly rejected")
    else:
        print_error("Incorrect PIN should be rejected with 401")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")

def test_categories():
    """Test category management"""
    print_test_header("Category Management")
    
    # Get all categories
    response = make_request('GET', '/categories/')
    
    if response and response.status_code == 200:
        categories = response.json()
        print_success(f"Categories fetched successfully: {len(categories)} categories")
        
        # Check if we have the expected default categories
        expected_categories = [
            "Food & Dining", "Transport", "Utilities", "Shopping", 
            "Entertainment", "Health", "Education", "Bills & Fees", 
            "Income", "Other"
        ]
        
        category_names = [cat['name'] for cat in categories]
        missing_categories = [cat for cat in expected_categories if cat not in category_names]
        
        if not missing_categories:
            print_success("All 10 default M-Pesa categories found")
        else:
            print_warning(f"Missing categories: {missing_categories}")
        
        # Print category details
        for cat in categories:
            print_info(f"Category: {cat['name']} (ID: {cat['id']}, Color: {cat['color']})")
        
        return categories
    else:
        print_error("Failed to fetch categories")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
        return []

def test_create_custom_category():
    """Test creating a custom category"""
    print_test_header("Custom Category Creation")
    
    custom_category = {
        "name": "Test Category",
        "icon": "test-icon",
        "color": "#FF0000",
        "keywords": ["test", "custom"]
    }
    
    response = make_request('POST', '/categories/', data=custom_category)
    
    if response and response.status_code == 200:
        data = response.json()
        print_success("Custom category created successfully")
        print_info(f"Category ID: {data.get('id')}")
        return data
    else:
        print_error("Failed to create custom category")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
        return None

def test_transactions(categories):
    """Test transaction management"""
    print_test_header("Transaction Management")
    
    if not categories:
        print_error("No categories available for transaction testing")
        return []
    
    # Create test transactions
    test_transactions = []
    
    # Test expense transaction
    expense_data = {
        "amount": 500.0,
        "type": "expense",
        "category_id": categories[0]['id'],  # Use first category
        "description": "Lunch at restaurant",
        "date": datetime.now().isoformat()
    }
    
    response = make_request('POST', '/transactions/', data=expense_data)
    if response and response.status_code == 200:
        transaction = response.json()
        test_transactions.append(transaction)
        print_success(f"Expense transaction created: ID {transaction['id']}")
    else:
        print_error("Failed to create expense transaction")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
    
    # Test income transaction
    income_data = {
        "amount": 5000.0,
        "type": "income",
        "category_id": categories[-2]['id'] if len(categories) > 1 else categories[0]['id'],  # Use Income category
        "description": "Salary payment",
        "date": datetime.now().isoformat()
    }
    
    response = make_request('POST', '/transactions/', data=income_data)
    if response and response.status_code == 200:
        transaction = response.json()
        test_transactions.append(transaction)
        print_success(f"Income transaction created: ID {transaction['id']}")
    else:
        print_error("Failed to create income transaction")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
    
    # Test auto-categorization
    auto_cat_data = {
        "amount": 200.0,
        "type": "expense",
        "category_id": "auto",
        "description": "Uber ride to town",
        "date": datetime.now().isoformat()
    }
    
    response = make_request('POST', '/transactions/', data=auto_cat_data)
    if response and response.status_code == 200:
        transaction = response.json()
        test_transactions.append(transaction)
        print_success(f"Auto-categorized transaction created: ID {transaction['id']}")
        print_info(f"Auto-assigned category: {transaction['category_id']}")
    else:
        print_error("Failed to create auto-categorized transaction")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
    
    return test_transactions

def test_get_transactions():
    """Test fetching transactions"""
    print_test_header("Fetch Transactions")
    
    # Get all transactions
    response = make_request('GET', '/transactions/')
    
    if response and response.status_code == 200:
        transactions = response.json()
        print_success(f"Transactions fetched successfully: {len(transactions)} transactions")
        
        for txn in transactions:
            print_info(f"Transaction: {txn['description']} - {txn['type']} - KES {txn['amount']}")
        
        return transactions
    else:
        print_error("Failed to fetch transactions")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
        return []

def test_analytics_summary():
    """Test analytics summary endpoint"""
    print_test_header("Analytics Summary")
    
    response = make_request('GET', '/transactions/analytics/summary')
    
    if response and response.status_code == 200:
        analytics = response.json()
        print_success("Analytics summary fetched successfully")
        
        totals = analytics.get('totals', {})
        print_info(f"Total Income: KES {totals.get('income', 0)}")
        print_info(f"Total Expenses: KES {totals.get('expenses', 0)}")
        print_info(f"Balance: KES {totals.get('balance', 0)}")
        
        categories = analytics.get('categories', {})
        print_info(f"Categories with expenses: {len(categories)}")
        
        recent = analytics.get('recent_transactions', [])
        print_info(f"Recent transactions: {len(recent)}")
        
        return analytics
    else:
        print_error("Failed to fetch analytics summary")
        if response:
            print_error(f"Status: {response.status_code}, Response: {response.text}")
        return None

def test_data_validation():
    """Test data validation and error handling"""
    print_test_header("Data Validation & Error Handling")
    
    # Test invalid PIN (too short)
    invalid_pin = {"pin": "12"}
    response = make_request('POST', '/auth/verify-pin', data=invalid_pin)
    if response and response.status_code in [400, 422]:
        print_success("Short PIN properly rejected")
    else:
        print_warning("Short PIN validation might be missing")
    
    # Test negative amount transaction
    negative_amount = {
        "amount": -100.0,
        "type": "expense",
        "category_id": "test-id",
        "description": "Negative amount test",
        "date": datetime.now().isoformat()
    }
    
    response = make_request('POST', '/transactions/', data=negative_amount)
    if response and response.status_code in [400, 422]:
        print_success("Negative amount properly rejected")
    else:
        print_warning("Negative amount validation might be missing")
    
    # Test invalid category ID
    invalid_category = {
        "amount": 100.0,
        "type": "expense",
        "category_id": "non-existent-category",
        "description": "Invalid category test",
        "date": datetime.now().isoformat()
    }
    
    response = make_request('POST', '/transactions/', data=invalid_category)
    if response and response.status_code == 404:
        print_success("Invalid category ID properly rejected")
    else:
        print_warning("Invalid category validation might be missing")

def run_all_tests():
    """Run all backend tests"""
    print(f"{Colors.BOLD}M-Pesa Expense Tracker Backend API Tests{Colors.ENDC}")
    print(f"Testing backend at: {API_BASE}")
    print("="*80)
    
    # Test basic connectivity first
    if not test_basic_connectivity():
        print_error("Cannot proceed with tests - API not accessible")
        return False
    
    # Test authentication system
    user_status = test_user_status()
    test_pin_setup()
    test_pin_verification()
    
    # Test category management
    categories = test_categories()
    test_create_custom_category()
    
    # Test transaction management
    test_transactions(categories)
    test_get_transactions()
    test_analytics_summary()
    
    # Test data validation
    test_data_validation()
    
    print(f"\n{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}Backend API Testing Complete{Colors.ENDC}")
    print(f"{Colors.BOLD}{'='*80}{Colors.ENDC}")
    
    return True

if __name__ == "__main__":
    run_all_tests()