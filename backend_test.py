#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Smash Repairs Management System
Tests all endpoints according to the review requirements
"""

import requests
import json
import base64
from datetime import datetime
import sys
import traceback

# Backend URL from environment configuration
BACKEND_URL = "https://repair-flow-app-1.preview.emergentagent.com/api"

class SmashRepairsAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_id = None
        self.test_job_id = None
        self.test_photo_id = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        
    def log_result(self, test_name, success, details=None):
        """Log test results"""
        if success:
            print(f"✅ {test_name}")
            self.results["passed"] += 1
        else:
            print(f"❌ {test_name}")
            if details:
                print(f"   Error: {details}")
                self.results["errors"].append(f"{test_name}: {details}")
            self.results["failed"] += 1
            
    def make_request(self, method, endpoint, **kwargs):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = kwargs.get('headers', {})
        
        if self.auth_token:
            headers['Authorization'] = f"Bearer {self.auth_token}"
            kwargs['headers'] = headers
            
        try:
            response = self.session.request(method, url, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            return None, str(e)
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        print("\n=== Testing Root Endpoint ===")
        
        response = self.make_request('GET', '/')
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "Smash Repairs" in data["message"]:
                self.log_result("Root endpoint", True)
                return True
            else:
                self.log_result("Root endpoint", False, f"Unexpected response: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Root endpoint", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_register_user(self):
        """Test user registration"""
        print("\n=== Testing User Registration ===")
        
        # Use realistic test data
        test_user_data = {
            "username": "john_smith",
            "email": "john.smith@email.com",
            "password": "SecurePass123!"
        }
        
        response = self.make_request('POST', '/auth/register', json=test_user_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.auth_token = data["access_token"]
                self.test_user_id = data["user"]["id"]
                self.log_result("User registration", True)
                return True
            else:
                self.log_result("User registration", False, f"Missing fields in response: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("User registration", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_duplicate_registration(self):
        """Test duplicate registration handling"""
        print("\n=== Testing Duplicate Registration ===")
        
        # Try to register same user again
        test_user_data = {
            "username": "john_smith",
            "email": "john.smith@email.com", 
            "password": "SecurePass123!"
        }
        
        response = self.make_request('POST', '/auth/register', json=test_user_data)
        
        if response and response.status_code == 400:
            data = response.json()
            if "already" in data.get("detail", "").lower():
                self.log_result("Duplicate registration prevention", True)
                return True
            else:
                self.log_result("Duplicate registration prevention", False, f"Wrong error message: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Duplicate registration prevention", False, f"Expected 400, got {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_login(self):
        """Test user login"""
        print("\n=== Testing User Login ===")
        
        login_data = {
            "email": "john.smith@email.com",
            "password": "SecurePass123!"
        }
        
        response = self.make_request('POST', '/auth/login', json=login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.auth_token = data["access_token"]  # Update token
                self.log_result("User login", True)
                return True
            else:
                self.log_result("User login", False, f"Missing fields in response: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("User login", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_invalid_login(self):
        """Test invalid login credentials"""
        print("\n=== Testing Invalid Login ===")
        
        invalid_login_data = {
            "email": "john.smith@email.com",
            "password": "WrongPassword123!"
        }
        
        response = self.make_request('POST', '/auth/login', json=invalid_login_data)
        
        if response and response.status_code == 401:
            self.log_result("Invalid login handling", True)
            return True
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Invalid login handling", False, f"Expected 401, got {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_get_current_user(self):
        """Test getting current user info"""
        print("\n=== Testing Get Current User ===")
        
        if not self.auth_token:
            self.log_result("Get current user", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/auth/me')
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "username" in data and "email" in data:
                self.log_result("Get current user", True)
                return True
            else:
                self.log_result("Get current user", False, f"Missing fields in response: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Get current user", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        print("\n=== Testing Unauthorized Access ===")
        
        # Temporarily remove token
        original_token = self.auth_token
        self.auth_token = None
        
        response = self.make_request('GET', '/auth/me')
        
        # Restore token
        self.auth_token = original_token
        
        if response and response.status_code == 403:
            self.log_result("Unauthorized access prevention", True)
            return True
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Unauthorized access prevention", False, f"Expected 403, got {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_create_job(self):
        """Test job creation"""
        print("\n=== Testing Job Creation ===")
        
        if not self.auth_token:
            self.log_result("Create job", False, "No auth token available")
            return False
        
        # Realistic job data
        job_data = {
            "car_info": {
                "make": "Toyota",
                "model": "Camry",
                "year": 2020,
                "registration": "ABC123",
                "vin": "JT2SK12E6S0123456",
                "color": "Silver"
            },
            "owner_info": {
                "name": "Sarah Johnson",
                "phone": "+61 400 123 456",
                "email": "sarah.johnson@email.com",
                "address": "123 Main Street, Melbourne VIC 3000"
            },
            "insurance_info": {
                "company": "RACV Insurance",
                "policy_number": "POL123456789",
                "claim_number": "CLM987654321",
                "contact_person": "Mark Thompson",
                "contact_phone": "+61 1800 123 456"
            },
            "damage_description": "Front bumper damaged from parking collision. Minor scratches on right door. Headlight cracked.",
            "estimated_cost": 2500.00,
            "cost_items": [
                {
                    "description": "Front bumper replacement",
                    "amount": 800.00,
                    "item_type": "parts"
                },
                {
                    "description": "Headlight replacement", 
                    "amount": 450.00,
                    "item_type": "parts"
                },
                {
                    "description": "Paint and labor",
                    "amount": 1250.00,
                    "item_type": "labor"
                }
            ],
            "notes": "Customer prefers OEM parts. Available for pickup after 5pm weekdays."
        }
        
        response = self.make_request('POST', '/jobs', json=job_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data.get("status") == "Received":
                self.test_job_id = data["id"]
                self.log_result("Create job", True)
                return True
            else:
                self.log_result("Create job", False, f"Missing/incorrect fields in response: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Create job", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_get_all_jobs(self):
        """Test getting all jobs"""
        print("\n=== Testing Get All Jobs ===")
        
        if not self.auth_token:
            self.log_result("Get all jobs", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/jobs')
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get all jobs", True)
                return True
            else:
                self.log_result("Get all jobs", False, f"Response not a list: {type(data)}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Get all jobs", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_get_jobs_with_filters(self):
        """Test getting jobs with status and search filters"""
        print("\n=== Testing Jobs with Filters ===")
        
        if not self.auth_token:
            self.log_result("Get jobs with filters", False, "No auth token available")
            return False
        
        # Test status filter
        response = self.make_request('GET', '/jobs?status=Received')
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                # Test search filter
                response2 = self.make_request('GET', '/jobs?search=Toyota')
                if response2 and response2.status_code == 200:
                    search_data = response2.json()
                    if isinstance(search_data, list):
                        self.log_result("Get jobs with filters", True)
                        return True
                    else:
                        self.log_result("Get jobs with filters", False, f"Search response not a list: {type(search_data)}")
                else:
                    error_msg = response2.text if response2 else "Connection failed"
                    self.log_result("Get jobs with filters", False, f"Search failed - Status {response2.status_code if response2 else 'N/A'}: {error_msg}")
            else:
                self.log_result("Get jobs with filters", False, f"Status filter response not a list: {type(data)}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Get jobs with filters", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_get_single_job(self):
        """Test getting single job by ID"""
        print("\n=== Testing Get Single Job ===")
        
        if not self.auth_token or not self.test_job_id:
            self.log_result("Get single job", False, "No auth token or job ID available")
            return False
            
        response = self.make_request('GET', f'/jobs/{self.test_job_id}')
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and data["id"] == self.test_job_id:
                self.log_result("Get single job", True)
                return True
            else:
                self.log_result("Get single job", False, f"Wrong job returned: {data.get('id')}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Get single job", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_update_job_status(self):
        """Test updating job status"""
        print("\n=== Testing Update Job Status ===")
        
        if not self.auth_token or not self.test_job_id:
            self.log_result("Update job status", False, "No auth token or job ID available")
            return False
        
        status_update = {
            "status": "In Progress",
            "notes": "Started repair work on front bumper and headlight assembly"
        }
        
        response = self.make_request('PUT', f'/jobs/{self.test_job_id}/status', json=status_update)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("status") == "In Progress":
                self.log_result("Update job status", True)
                return True
            else:
                self.log_result("Update job status", False, f"Status not updated: {data.get('status')}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Update job status", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_invalid_status_update(self):
        """Test updating job with invalid status"""
        print("\n=== Testing Invalid Status Update ===")
        
        if not self.auth_token or not self.test_job_id:
            self.log_result("Invalid status update", False, "No auth token or job ID available")
            return False
        
        invalid_status = {
            "status": "InvalidStatus",
            "notes": "This should fail"
        }
        
        response = self.make_request('PUT', f'/jobs/{self.test_job_id}/status', json=invalid_status)
        
        if response and response.status_code == 400:
            self.log_result("Invalid status update prevention", True)
            return True
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Invalid status update prevention", False, f"Expected 400, got {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_add_photo_to_job(self):
        """Test adding photo to job"""
        print("\n=== Testing Add Photo to Job ===")
        
        if not self.auth_token or not self.test_job_id:
            self.log_result("Add photo to job", False, "No auth token or job ID available")
            return False
        
        # Create small test image (1x1 pixel red)
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        photo_data = {
            "base64_data": test_image_base64,
            "caption": "Front bumper damage assessment",
            "photo_type": "damage"
        }
        
        response = self.make_request('POST', f'/jobs/{self.test_job_id}/photos', json=photo_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "photos" in data and len(data["photos"]) > 0:
                # Store photo ID for deletion test
                self.test_photo_id = data["photos"][0]["id"]
                self.log_result("Add photo to job", True)
                return True
            else:
                self.log_result("Add photo to job", False, f"Photo not added to job: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Add photo to job", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_update_job(self):
        """Test updating job details"""
        print("\n=== Testing Update Job ===")
        
        if not self.auth_token or not self.test_job_id:
            self.log_result("Update job", False, "No auth token or job ID available")
            return False
        
        update_data = {
            "actual_cost": 2300.00,
            "notes": "Completed repair work. Used high-quality aftermarket parts as requested by customer."
        }
        
        response = self.make_request('PUT', f'/jobs/{self.test_job_id}', json=update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("actual_cost") == 2300.00:
                self.log_result("Update job", True)
                return True
            else:
                self.log_result("Update job", False, f"Job not updated correctly: {data.get('actual_cost')}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Update job", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n=== Testing Dashboard Stats ===")
        
        if not self.auth_token:
            self.log_result("Dashboard stats", False, "No auth token available")
            return False
            
        response = self.make_request('GET', '/dashboard/stats')
        
        if response and response.status_code == 200:
            data = response.json()
            expected_fields = ["total_jobs", "active_jobs", "completed_jobs", "status_breakdown"]
            if all(field in data for field in expected_fields):
                self.log_result("Dashboard stats", True)
                return True
            else:
                missing = [f for f in expected_fields if f not in data]
                self.log_result("Dashboard stats", False, f"Missing fields: {missing}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Dashboard stats", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_get_statuses(self):
        """Test getting valid job statuses"""
        print("\n=== Testing Get Statuses ===")
        
        response = self.make_request('GET', '/statuses')
        
        if response and response.status_code == 200:
            data = response.json()
            if "statuses" in data and isinstance(data["statuses"], list):
                expected_statuses = ["Received", "In Progress", "Completed"]
                if any(status in data["statuses"] for status in expected_statuses):
                    self.log_result("Get statuses", True)
                    return True
                else:
                    self.log_result("Get statuses", False, f"Missing expected statuses: {data}")
            else:
                self.log_result("Get statuses", False, f"Invalid statuses response: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Get statuses", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_delete_photo(self):
        """Test deleting photo from job"""
        print("\n=== Testing Delete Photo ===")
        
        if not self.auth_token or not self.test_job_id or not self.test_photo_id:
            self.log_result("Delete photo", False, "Missing auth token, job ID, or photo ID")
            return False
        
        response = self.make_request('DELETE', f'/jobs/{self.test_job_id}/photos/{self.test_photo_id}')
        
        if response and response.status_code == 200:
            data = response.json()
            # Check that photo was removed
            photo_ids = [p["id"] for p in data.get("photos", [])]
            if self.test_photo_id not in photo_ids:
                self.log_result("Delete photo", True)
                return True
            else:
                self.log_result("Delete photo", False, f"Photo not deleted: {photo_ids}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Delete photo", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_delete_job(self):
        """Test deleting job"""
        print("\n=== Testing Delete Job ===")
        
        if not self.auth_token or not self.test_job_id:
            self.log_result("Delete job", False, "No auth token or job ID available")
            return False
            
        response = self.make_request('DELETE', f'/jobs/{self.test_job_id}')
        
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data and "deleted" in data["message"].lower():
                self.log_result("Delete job", True)
                return True
            else:
                self.log_result("Delete job", False, f"Unexpected response: {data}")
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Delete job", False, f"Status {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def test_get_deleted_job(self):
        """Test that deleted job cannot be retrieved"""
        print("\n=== Testing Get Deleted Job ===")
        
        if not self.auth_token or not self.test_job_id:
            self.log_result("Get deleted job", False, "No auth token or job ID available")
            return False
            
        response = self.make_request('GET', f'/jobs/{self.test_job_id}')
        
        if response and response.status_code == 404:
            self.log_result("Get deleted job prevention", True)
            return True
        else:
            error_msg = response.text if response else "Connection failed"
            self.log_result("Get deleted job prevention", False, f"Expected 404, got {response.status_code if response else 'N/A'}: {error_msg}")
        return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🚀 Starting Smash Repairs API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        try:
            # Basic connectivity
            if not self.test_root_endpoint():
                print("\n❌ CRITICAL: Cannot connect to API root. Stopping tests.")
                return False
            
            # Authentication flow
            if not self.test_register_user():
                print("\n❌ CRITICAL: User registration failed. Stopping tests.")
                return False
            
            self.test_duplicate_registration()
            
            if not self.test_login():
                print("\n❌ CRITICAL: User login failed. Stopping tests.")
                return False
                
            self.test_invalid_login()
            self.test_get_current_user()
            self.test_unauthorized_access()
            
            # Jobs CRUD flow
            if not self.test_create_job():
                print("\n❌ CRITICAL: Job creation failed. Skipping job-related tests.")
            else:
                self.test_get_all_jobs()
                self.test_get_jobs_with_filters()
                self.test_get_single_job()
                self.test_update_job_status()
                self.test_invalid_status_update()
                self.test_add_photo_to_job()
                self.test_update_job()
                
                # Dashboard and utility endpoints
                self.test_dashboard_stats()
                self.test_get_statuses()
                
                # Cleanup tests
                if self.test_photo_id:
                    self.test_delete_photo()
                self.test_delete_job()
                self.test_get_deleted_job()
            
            return True
            
        except Exception as e:
            print(f"\n💥 UNEXPECTED ERROR: {str(e)}")
            traceback.print_exc()
            return False
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📈 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"  • {error}")
        
        print("\n" + "=" * 60)

def main():
    """Main test execution"""
    tester = SmashRepairsAPITester()
    
    print("🧪 Smash Repairs Management API Test Suite")
    print(f"Testing backend at: {BACKEND_URL}")
    
    success = tester.run_all_tests()
    tester.print_summary()
    
    if not success or tester.results['failed'] > 0:
        sys.exit(1)
    else:
        print("🎉 All tests completed successfully!")

if __name__ == "__main__":
    main()