#!/usr/bin/env python3
"""
Simple Backend API Test for Key Error Scenarios
"""

import requests
import json

BACKEND_URL = "https://workshop-flow-19.preview.emergentagent.com/api"

def test_duplicate_registration():
    """Test duplicate registration handling"""
    print("Testing duplicate registration...")
    
    # First register a user
    user_data = {
        "username": "testuser_simple",
        "email": "testuser.simple@email.com",
        "password": "TestPass123!"
    }
    
    response1 = requests.post(f"{BACKEND_URL}/auth/register", json=user_data)
    print(f"First registration: {response1.status_code}")
    
    # Try to register same user again
    response2 = requests.post(f"{BACKEND_URL}/auth/register", json=user_data)
    print(f"Duplicate registration: {response2.status_code}")
    print(f"Response: {response2.text}")
    
    if response2.status_code == 400:
        print("✅ Duplicate registration correctly prevented")
        return True
    else:
        print("❌ Duplicate registration not handled correctly")
        return False

def test_invalid_login():
    """Test invalid login credentials"""
    print("\nTesting invalid login...")
    
    invalid_login = {
        "email": "testuser.simple@email.com",
        "password": "WrongPassword!"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=invalid_login)
    print(f"Invalid login: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 401:
        print("✅ Invalid login correctly rejected")
        return True
    else:
        print("❌ Invalid login not handled correctly") 
        return False

def test_unauthorized_access():
    """Test accessing protected endpoint without token"""
    print("\nTesting unauthorized access...")
    
    response = requests.get(f"{BACKEND_URL}/auth/me")
    print(f"Unauthorized access: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 403:
        print("✅ Unauthorized access correctly blocked")
        return True
    else:
        print("❌ Unauthorized access not handled correctly")
        return False

def main():
    print("🔍 Simple Backend API Error Handling Tests")
    print("=" * 50)
    
    results = []
    results.append(test_duplicate_registration())
    results.append(test_invalid_login()) 
    results.append(test_unauthorized_access())
    
    print("\n" + "=" * 50)
    print(f"Results: {sum(results)}/3 tests passed")
    
    if all(results):
        print("🎉 All error handling tests passed!")
    else:
        print("⚠️  Some error handling tests failed")

if __name__ == "__main__":
    main()