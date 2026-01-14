#!/usr/bin/env python3
"""
Enhanced backend startup script for M-Pesa Expense Tracker
"""
import subprocess
import sys
import os
import time
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    try:
        import uvicorn
        import fastapi
        import motor
        print("✅ Core dependencies found")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("💡 Install dependencies with: pip install -r backend/requirements.txt")
        return False

def check_environment():
    """Check environment variables and configuration"""
    print("🔍 Checking environment configuration...")
    
    # Check for .env file
    env_file = Path("backend/.env")
    if env_file.exists():
        print("✅ .env file found")
    else:
        print("⚠️  No .env file found - using defaults")
    
    # Check MongoDB connection
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    print(f"📊 MongoDB URL: {mongo_url}")
    
    return True

def start_backend():
    """Start the backend server"""
    backend_dir = Path(__file__).parent / "backend"
    
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        return 1
    
    # Change to backend directory
    original_dir = Path.cwd()
    os.chdir(backend_dir)
    
    print("🚀 Starting M-Pesa Expense Tracker Backend...")
    print("📁 Working directory:", backend_dir.absolute())
    print("🌐 Server will be available at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    print("🔄 Auto-reload enabled for development")
    print("\n" + "="*60)
    print("Press Ctrl+C to stop the server")
    print("="*60 + "\n")
    
    try:
        # Start the uvicorn server with better error handling
        result = subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "server:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--log-level", "info"
        ], check=False)
        
        return result.returncode
        
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        return 0
    except FileNotFoundError:
        print("\n❌ uvicorn not found. Install it with: pip install uvicorn[standard]")
        return 1
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        return 1
    finally:
        os.chdir(original_dir)

def main():
    """Main function"""
    print("🎯 M-Pesa Expense Tracker Backend Startup")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        return 1
    
    # Check environment
    if not check_environment():
        return 1
    
    # Start backend
    return start_backend()

if __name__ == "__main__":
    sys.exit(main())
