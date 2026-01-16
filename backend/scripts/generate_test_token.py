#!/usr/bin/env python3
"""
JWT Token Generator for Testing

This script generates a JWT token for testing API endpoints.
"""

import jwt
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def generate_test_token(user_id: str = "test-user-123", email: str = "test@example.com", days_valid: int = 7):
    """Generate a test JWT token"""
    
    # JWT Configuration (same as in utils/auth.py)
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')
    ALGORITHM = "HS256"
    
    expire = datetime.utcnow() + timedelta(days=days_valid)
    
    payload = {
        "sub": user_id,  # Subject (user ID)
        "email": email,
        "exp": expire,  # Expiration time
        "iat": datetime.utcnow(),  # Issued at
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def decode_token(token: str):
    """Decode and display token contents"""
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')
    ALGORITHM = "HS256"
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return {"error": "Token has expired"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid token"}


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate JWT tokens for testing')
    parser.add_argument('--user-id', default='test-user-123', help='User ID (default: test-user-123)')
    parser.add_argument('--email', default='test@example.com', help='Email (default: test@example.com)')
    parser.add_argument('--days', type=int, default=7, help='Days valid (default: 7)')
    parser.add_argument('--decode', help='Decode an existing token')
    
    args = parser.parse_args()
    
    print("\n" + "="*80)
    print("JWT TOKEN GENERATOR")
    print("="*80 + "\n")
    
    if args.decode:
        print("🔍 Decoding token...\n")
        payload = decode_token(args.decode)
        
        print("Token Contents:")
        print("-" * 80)
        for key, value in payload.items():
            if key == 'exp' or key == 'iat':
                # Convert timestamp to readable date
                try:
                    dt = datetime.fromtimestamp(value)
                    print(f"{key:20} : {value} ({dt.strftime('%Y-%m-%d %H:%M:%S')})")
                except:
                    print(f"{key:20} : {value}")
            else:
                print(f"{key:20} : {value}")
        print("-" * 80 + "\n")
    else:
        # Generate token
        token = generate_test_token(args.user_id, args.email, args.days)
        
        print("✅ Token Generated Successfully!\n")
        print("Configuration:")
        print("-" * 80)
        print(f"User ID              : {args.user_id}")
        print(f"Email                : {args.email}")
        print(f"Valid for            : {args.days} days")
        print(f"Secret Key           : {os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')[:20]}...")
        print("-" * 80 + "\n")
        
        print("🔑 Your JWT Token:")
        print("-" * 80)
        print(token)
        print("-" * 80 + "\n")
        
        print("📋 Usage Examples:\n")
        print("1. cURL:")
        print(f'   curl -H "Authorization: Bearer {token}" http://localhost:8000/api/transactions\n')
        
        print("2. JavaScript/Fetch:")
        print(f'''   fetch('http://localhost:8000/api/transactions', {{
     headers: {{
       'Authorization': 'Bearer {token}'
     }}
   }})\n''')
        
        print("3. Python Requests:")
        print(f'''   headers = {{'Authorization': 'Bearer {token}'}}
   response = requests.get('http://localhost:8000/api/transactions', headers=headers)\n''')
        
        print("4. Postman/Insomnia:")
        print("   - Add to Headers:")
        print(f"   - Key: Authorization")
        print(f"   - Value: Bearer {token}\n")
        
        # Decode and show contents
        print("📄 Token Contents:")
        print("-" * 80)
        payload = decode_token(token)
        for key, value in payload.items():
            if key == 'exp' or key == 'iat':
                try:
                    dt = datetime.fromtimestamp(value)
                    print(f"{key:20} : {dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
                except:
                    print(f"{key:20} : {value}")
            else:
                print(f"{key:20} : {value}")
        print("-" * 80 + "\n")
        
        print("⚠️  Note: This is a TEST token. For production, users must authenticate via /api/auth/signup or /api/auth/login\n")
    
    print("="*80 + "\n")
