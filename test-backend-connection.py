#!/usr/bin/env python3
"""
Backend Connection Test Script for M-Pesa Expense Tracker
Tests all major endpoints to identify connection issues
"""
import requests
import json
import time
from datetime import datetime
from typing import Dict, List

# Configuration
BASE_URL = "http://localhost:8000"  # Change this to your backend URL
TIMEOUT = 10  # seconds

def colored_print(message: str, color: str = "white"):
    """Print colored messages"""
    colors = {
        "red": "\033[91m",
        "green": "\033[92m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "magenta": "\033[95m",
        "cyan": "\033[96m",
        "white": "\033[97m",
        "reset": "\033[0m"
    }
    
    print(f"{colors.get(color, colors['white'])}{message}{colors['reset']}")

def test_endpoint(endpoint: str, method: str = "GET", data: Dict = None) -> Dict:
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=TIMEOUT)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=TIMEOUT)
        else:
            return {"success": False, "error": f"Unsupported method: {method}"}
        
        return {
            "success": response.status_code < 400,
            "status_code": response.status_code,
            "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
            "response_time": response.elapsed.total_seconds()
        }
    
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Connection refused - backend not running"}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Request error: {str(e)}"}
    except json.JSONDecodeError:
        return {"success": False, "error": "Invalid JSON response"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

def run_comprehensive_tests():
    """Run comprehensive backend tests"""
    
    colored_print("🎯 M-Pesa Expense Tracker Backend Test Suite", "cyan")
    colored_print("=" * 60, "cyan")
    
    # Test endpoints
    test_cases = [
        # Basic connectivity
        {"name": "Root Endpoint", "endpoint": "/api/", "critical": True},
        {"name": "Health Check", "endpoint": "/api/health", "critical": True},
        
        # Core functionality
        {"name": "Analytics Summary", "endpoint": "/api/transactions/analytics/summary", "critical": True},
        {"name": "Categories List", "endpoint": "/api/categories/", "critical": True},
        {"name": "Transactions List", "endpoint": "/api/transactions/", "critical": False},
        
        # Budget endpoints
        {"name": "Budget Summary", "endpoint": "/api/budgets/summary?month=12&year=2024", "critical": False},
        {"name": "Budget Alerts", "endpoint": "/api/budgets/alerts", "critical": False},
        {"name": "Budget Monitoring", "endpoint": "/api/budgets/monitoring/analysis?month=12&year=2024", "critical": False},
        {"name": "Budget Goals", "endpoint": "/api/budgets/monitoring/goals?month=12&year=2024", "critical": False},
        
        # Additional endpoints
        {"name": "Charges Analytics", "endpoint": "/api/transactions/charges/analytics?period=month", "critical": False},
        {"name": "Debug Database", "endpoint": "/api/transactions/debug/database", "critical": False},
    ]
    
    results = []
    critical_failures = 0
    
    colored_print(f"🌐 Testing backend at: {BASE_URL}", "blue")
    colored_print(f"⏱️  Timeout: {TIMEOUT}s per request\n", "blue")
    
    for i, test_case in enumerate(test_cases, 1):
        endpoint = test_case["endpoint"]
        name = test_case["name"]
        critical = test_case.get("critical", False)
        
        colored_print(f"[{i:2d}/{len(test_cases)}] Testing {name}...", "white")
        
        result = test_endpoint(endpoint)
        results.append({"name": name, "endpoint": endpoint, "critical": critical, **result})
        
        if result["success"]:
            response_time = result.get("response_time", 0)
            colored_print(f"      ✅ SUCCESS ({response_time:.2f}s)", "green")
            
            # Show some response data for key endpoints
            if "analytics" in endpoint.lower() or "health" in endpoint.lower():
                response_data = result.get("response", {})
                if isinstance(response_data, dict):
                    if "status" in response_data:
                        colored_print(f"         Status: {response_data['status']}", "green")
                    if "totals" in response_data:
                        totals = response_data["totals"]
                        colored_print(f"         Income: KSh {totals.get('income', 0):,.2f}, Expenses: KSh {totals.get('expenses', 0):,.2f}", "green")
        else:
            error = result.get("error", "Unknown error")
            status_code = result.get("status_code")
            
            if critical:
                critical_failures += 1
                colored_print(f"      ❌ CRITICAL FAILURE: {error}", "red")
                if status_code:
                    colored_print(f"         Status Code: {status_code}", "red")
            else:
                colored_print(f"      ⚠️  FAILURE: {error}", "yellow")
                if status_code:
                    colored_print(f"         Status Code: {status_code}", "yellow")
        
        print()  # Empty line for spacing
    
    # Summary
    colored_print("📊 TEST SUMMARY", "cyan")
    colored_print("=" * 60, "cyan")
    
    total_tests = len(results)
    successful_tests = len([r for r in results if r["success"]])
    failed_tests = total_tests - successful_tests
    
    colored_print(f"Total Tests: {total_tests}", "white")
    colored_print(f"Successful: {successful_tests}", "green")
    colored_print(f"Failed: {failed_tests}", "red" if failed_tests > 0 else "white")
    colored_print(f"Critical Failures: {critical_failures}", "red" if critical_failures > 0 else "white")
    
    # Recommendations
    colored_print("\n💡 RECOMMENDATIONS", "cyan")
    colored_print("=" * 60, "cyan")
    
    if critical_failures > 0:
        colored_print("🚨 CRITICAL ISSUES DETECTED:", "red")
        for result in results:
            if result["critical"] and not result["success"]:
                colored_print(f"   • {result['name']}: {result.get('error', 'Unknown error')}", "red")
        
        colored_print("\n🔧 IMMEDIATE ACTIONS NEEDED:", "yellow")
        colored_print("   1. Ensure backend server is running (python run-backend.py)", "yellow")
        colored_print("   2. Check PesaDB connection and API key", "yellow")
        colored_print("   3. Verify all dependencies are installed", "yellow")
        colored_print("   4. Check backend logs for errors", "yellow")
    
    elif failed_tests > 0:
        colored_print("⚠️  Some non-critical endpoints failed. This may indicate:", "yellow")
        colored_print("   • Missing data in database", "yellow")
        colored_print("   • Configuration issues", "yellow")
        colored_print("   • Backend functionality not fully implemented", "yellow")
    
    else:
        colored_print("🎉 ALL TESTS PASSED! Backend is fully functional.", "green")
        colored_print("   Frontend should be able to connect successfully.", "green")
    
    # Configuration help
    colored_print("\n🔧 FRONTEND CONFIGURATION", "cyan")
    colored_print("=" * 60, "cyan")
    colored_print("Make sure your frontend is configured to use the correct backend URL:", "white")
    colored_print(f"   • Current test URL: {BASE_URL}", "blue")
    colored_print("   • Set EXPO_PUBLIC_BACKEND_URL environment variable", "blue")
    colored_print("   • Or update app.json extra.EXPO_PUBLIC_BACKEND_URL", "blue")
    
    return critical_failures == 0 and failed_tests == 0

def main():
    """Main function"""
    try:
        success = run_comprehensive_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        colored_print("\n\n🛑 Tests interrupted by user", "yellow")
        return 1
    except Exception as e:
        colored_print(f"\n❌ Unexpected error: {e}", "red")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
