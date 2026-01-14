#!/usr/bin/env python3
"""
Simple script to start the M-Pesa Expense Tracker backend server
"""
import subprocess
import sys
import os
from pathlib import Path

def main():
    # Change to backend directory
    backend_dir = Path(__file__).parent / "backend"
    
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        return 1
    
    os.chdir(backend_dir)
    
    print("🚀 Starting M-Pesa Expense Tracker Backend...")
    print("📁 Working directory:", backend_dir.absolute())
    print("🌐 Server will be available at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    print("\n" + "="*50)
    
    try:
        # Start the uvicorn server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "server:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        return 0
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
