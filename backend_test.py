#!/usr/bin/env python3
"""
Backend API Testing Script for Smash Repairs Management App
Testing Customer and Invoice APIs
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "https://repair-flow-app-1.preview.emergentagent.com/api"
TEST_USER = {
    "username": "testshop",
    "email": "testshop@smashrepairs.com",
    "password": "SecurePassword123!"
}

# Global token storage
auth_token = None

def log_test(test_name, status, details=""):
    """Log test results"""
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"{status_symbol} {test_name}: {details}")

def make_request(method, endpoint, data=None, params=None, expect_status=200):
    """Make HTTP request with auth header"""
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=30)
        elif method.upper() == "POST":
            headers["Content-Type"] = "application/json"
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method.upper() == "PUT":
            headers["Content-Type"] = "application/json"
            response = requests.put(url, headers=headers, json=data, timeout=30)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        if response.status_code != expect_status:
            print(f"❌ Expected status {expect_status}, got {response.status_code}")
            print(f"   Response: {response.text}")
            return None
        
        if response.content:
            return response.json()
        return {"success": True}
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_auth():
    """Test authentication endpoints"""
    global auth_token
    
    print("\n🔐 TESTING AUTHENTICATION")
    
    # Register user
    response = make_request("POST", "/auth/register", TEST_USER, expect_status=200)
    if response and response.get("access_token"):
        auth_token = response["access_token"]
        log_test("User Registration", "PASS", f"Token received, user: {response['user']['username']}")
    else:
        # Try login instead (user might exist)
        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        response = make_request("POST", "/auth/login", login_data, expect_status=200)
        if response and response.get("access_token"):
            auth_token = response["access_token"]
            log_test("User Login", "PASS", f"Token received, user: {response['user']['username']}")
        else:
            log_test("Authentication", "FAIL", "Could not register or login")
            return False
    
    # Test token validity
    response = make_request("GET", "/auth/me", expect_status=200)
    if response:
        log_test("Token Validation", "PASS", f"User: {response['username']}")
        return True
    else:
        log_test("Token Validation", "FAIL", "Invalid token")
        return False

def test_customer_apis():
    """Test Customer/Contact CRUD operations"""
    print("\n👥 TESTING CUSTOMER APIS")
    
    # Test data
    customer_data = {
        "name": "John Smith Automotive",
        "phone": "+61-2-9876-5432",
        "email": "john.smith@example.com",
        "address": "123 Sydney Road, Sydney NSW 2000",
        "vehicles": [
            {
                "registration": "ABC123",
                "make": "Toyota",
                "model": "Camry",
                "year": 2020,
                "color": "Silver"
            },
            {
                "registration": "XYZ789",
                "make": "Honda",
                "model": "Civic",
                "year": 2019,
                "color": "Blue"
            }
        ],
        "insurance_company": "NRMA Insurance",
        "insurance_policy": "POL123456",
        "notes": "Regular customer, prefers morning appointments"
    }
    
    # 1. CREATE Customer
    response = make_request("POST", "/customers", customer_data, expect_status=200)
    if not response:
        log_test("Create Customer", "FAIL", "Could not create customer")
        return None
        
    customer_id = response["id"]
    log_test("Create Customer", "PASS", f"Customer created with ID: {customer_id}")
    
    # Validate created customer data
    if (response["name"] == customer_data["name"] and 
        response["phone"] == customer_data["phone"] and
        len(response["vehicles"]) == 2):
        log_test("Customer Data Validation", "PASS", "All fields correctly saved")
    else:
        log_test("Customer Data Validation", "FAIL", "Data mismatch")
    
    # 2. GET All Customers
    response = make_request("GET", "/customers", expect_status=200)
    if response and len(response) > 0:
        log_test("Get All Customers", "PASS", f"Retrieved {len(response)} customers")
    else:
        log_test("Get All Customers", "FAIL", "No customers retrieved")
    
    # 3. GET Single Customer
    response = make_request("GET", f"/customers/{customer_id}", expect_status=200)
    if response and response["id"] == customer_id:
        log_test("Get Single Customer", "PASS", f"Retrieved customer: {response['name']}")
    else:
        log_test("Get Single Customer", "FAIL", "Could not retrieve specific customer")
    
    # 4. SEARCH Customers by name
    response = make_request("GET", "/customers", params={"search": "John"}, expect_status=200)
    if response and len(response) > 0:
        log_test("Search Customers by Name", "PASS", f"Found {len(response)} customers")
    else:
        log_test("Search Customers by Name", "FAIL", "Search returned no results")
    
    # 5. SEARCH Customers by phone
    response = make_request("GET", "/customers", params={"search": "9876"}, expect_status=200)
    if response and len(response) > 0:
        log_test("Search Customers by Phone", "PASS", f"Found {len(response)} customers")
    else:
        log_test("Search Customers by Phone", "FAIL", "Phone search failed")
    
    # 6. UPDATE Customer
    update_data = {
        "name": "John Smith Premium Auto",
        "notes": "VIP customer - priority service"
    }
    response = make_request("PUT", f"/customers/{customer_id}", update_data, expect_status=200)
    if response and response["name"] == update_data["name"]:
        log_test("Update Customer", "PASS", "Customer updated successfully")
    else:
        log_test("Update Customer", "FAIL", "Customer update failed")
    
    # 7. GET Customer Jobs (should be empty initially)
    response = make_request("GET", f"/customers/{customer_id}/jobs", expect_status=200)
    if response is not None:  # Empty list is valid
        log_test("Get Customer Jobs", "PASS", f"Retrieved {len(response)} jobs")
    else:
        log_test("Get Customer Jobs", "FAIL", "Could not retrieve customer jobs")
    
    return customer_id

def create_test_job():
    """Create a test job for invoice testing"""
    job_data = {
        "car_info": {
            "make": "Toyota",
            "model": "Camry",
            "year": 2020,
            "registration": "ABC123",
            "vin": "JT2BF22K9X0123456",
            "color": "Silver"
        },
        "owner_info": {
            "name": "John Smith",
            "phone": "+61-2-9876-5432",
            "email": "john.smith@example.com",
            "address": "123 Sydney Road, Sydney NSW 2000"
        },
        "damage_description": "Front bumper damage, right headlight replacement needed",
        "estimated_cost": 2500.0,
        "cost_items": [
            {"description": "Front bumper repair", "amount": 800.0, "item_type": "labor"},
            {"description": "Right headlight replacement", "amount": 450.0, "item_type": "parts"},
            {"description": "Paint work", "amount": 1250.0, "item_type": "paint"}
        ],
        "notes": "Insurance claim - NRMA approved"
    }
    
    response = make_request("POST", "/jobs", job_data, expect_status=200)
    if response:
        print(f"✅ Test job created with ID: {response['id']}")
        return response['id']
    else:
        print("❌ Failed to create test job")
        return None

def test_invoice_apis():
    """Test Invoice CRUD operations"""
    print("\n🧾 TESTING INVOICE APIS")
    
    # First create a job for invoice testing
    job_id = create_test_job()
    if not job_id:
        log_test("Create Test Job", "FAIL", "Cannot test invoices without a job")
        return None
    
    # 1. CREATE Invoice from Job
    response = make_request("POST", f"/invoices/from-job/{job_id}", expect_status=200)
    if not response:
        log_test("Create Invoice from Job", "FAIL", "Could not create invoice from job")
        return None
    
    invoice_id = response["id"]
    invoice_number = response["invoice_number"]
    log_test("Create Invoice from Job", "PASS", f"Invoice {invoice_number} created from job")
    
    # Validate invoice structure
    required_fields = ["invoice_number", "job_id", "line_items", "subtotal", "gst", "total", "status", "issue_date", "due_date"]
    missing_fields = [field for field in required_fields if field not in response]
    if not missing_fields:
        log_test("Invoice Structure Validation", "PASS", "All required fields present")
    else:
        log_test("Invoice Structure Validation", "FAIL", f"Missing fields: {missing_fields}")
    
    # Validate GST calculation (should be 10%)
    expected_gst = round(response["subtotal"] * 0.1, 2)
    if abs(response["gst"] - expected_gst) < 0.01:
        log_test("GST Calculation", "PASS", f"GST: ${response['gst']} (10% of ${response['subtotal']})")
    else:
        log_test("GST Calculation", "FAIL", f"Expected GST: ${expected_gst}, Got: ${response['gst']}")
    
    # Validate total calculation
    expected_total = response["subtotal"] + response["gst"]
    if abs(response["total"] - expected_total) < 0.01:
        log_test("Total Calculation", "PASS", f"Total: ${response['total']}")
    else:
        log_test("Total Calculation", "FAIL", f"Expected: ${expected_total}, Got: ${response['total']}")
    
    # 2. GET All Invoices
    response = make_request("GET", "/invoices", expect_status=200)
    if response and len(response) > 0:
        log_test("Get All Invoices", "PASS", f"Retrieved {len(response)} invoices")
    else:
        log_test("Get All Invoices", "FAIL", "No invoices retrieved")
    
    # 3. GET Invoices by Status (Draft)
    response = make_request("GET", "/invoices", params={"status": "Draft"}, expect_status=200)
    if response and len(response) > 0:
        log_test("Filter Invoices by Status", "PASS", f"Found {len(response)} Draft invoices")
    else:
        log_test("Filter Invoices by Status", "FAIL", "No Draft invoices found")
    
    # 4. GET Single Invoice
    response = make_request("GET", f"/invoices/{invoice_id}", expect_status=200)
    if response and response["id"] == invoice_id:
        log_test("Get Single Invoice", "PASS", f"Retrieved invoice: {response['invoice_number']}")
        
        # Verify line items are present and structured correctly
        if response.get("line_items") and len(response["line_items"]) > 0:
            line_item = response["line_items"][0]
            item_fields = ["description", "quantity", "unit_price", "total"]
            if all(field in line_item for field in item_fields):
                log_test("Line Items Structure", "PASS", f"{len(response['line_items'])} line items with correct structure")
            else:
                log_test("Line Items Structure", "FAIL", "Line items missing required fields")
        else:
            log_test("Line Items Structure", "FAIL", "No line items found")
    else:
        log_test("Get Single Invoice", "FAIL", "Could not retrieve specific invoice")
    
    # 5. UPDATE Invoice Status to "Sent"
    response = make_request("PUT", f"/invoices/{invoice_id}/status", params={"status": "Sent"}, expect_status=200)
    if response and "updated" in response.get("message", "").lower():
        log_test("Update Status to Sent", "PASS", "Invoice status updated to Sent")
    else:
        log_test("Update Status to Sent", "FAIL", "Could not update status to Sent")
    
    # 6. UPDATE Invoice Status to "Paid" (should auto-set paid_date)
    response = make_request("PUT", f"/invoices/{invoice_id}/status", params={"status": "Paid"}, expect_status=200)
    if response and "updated" in response.get("message", "").lower():
        log_test("Update Status to Paid", "PASS", "Invoice status updated to Paid")
        
        # Verify paid_date was set
        response = make_request("GET", f"/invoices/{invoice_id}", expect_status=200)
        if response and response.get("paid_date"):
            log_test("Auto-set Paid Date", "PASS", f"Paid date set: {response['paid_date']}")
        else:
            log_test("Auto-set Paid Date", "FAIL", "Paid date not automatically set")
    else:
        log_test("Update Status to Paid", "FAIL", "Could not update status to Paid")
    
    # 7. GET Invoice Statistics
    response = make_request("GET", "/invoices/stats/summary", expect_status=200)
    if response:
        required_stats = ["total_invoices", "total_invoiced", "paid_amount", "outstanding", "status_breakdown"]
        missing_stats = [stat for stat in required_stats if stat not in response]
        if not missing_stats:
            log_test("Invoice Statistics", "PASS", 
                   f"Total: {response['total_invoices']}, Invoiced: ${response['total_invoiced']}, "
                   f"Paid: ${response['paid_amount']}, Outstanding: ${response['outstanding']}")
        else:
            log_test("Invoice Statistics", "FAIL", f"Missing stats: {missing_stats}")
    else:
        log_test("Invoice Statistics", "FAIL", "Could not retrieve statistics")
    
    return invoice_id

def test_cleanup(customer_id, invoice_id):
    """Clean up test data"""
    print("\n🧹 CLEANING UP TEST DATA")
    
    # Delete invoice
    if invoice_id:
        response = make_request("DELETE", f"/invoices/{invoice_id}", expect_status=200)
        if response:
            log_test("Delete Invoice", "PASS", "Invoice deleted successfully")
        else:
            log_test("Delete Invoice", "FAIL", "Could not delete invoice")
    
    # Delete customer
    if customer_id:
        response = make_request("DELETE", f"/customers/{customer_id}", expect_status=200)
        if response:
            log_test("Delete Customer", "PASS", "Customer deleted successfully")
        else:
            log_test("Delete Customer", "FAIL", "Could not delete customer")

def test_error_handling():
    """Test error handling scenarios"""
    print("\n⚠️  TESTING ERROR HANDLING")
    
    # Test invalid customer ID
    response = make_request("GET", "/customers/invalid-id", expect_status=400)
    if response is None:  # None means we got expected error status
        log_test("Invalid Customer ID", "PASS", "Correctly rejected invalid ID")
    else:
        log_test("Invalid Customer ID", "FAIL", "Should have rejected invalid ID")
    
    # Test nonexistent customer
    fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
    response = make_request("GET", f"/customers/{fake_id}", expect_status=404)
    if response is None:  # None means we got expected error status
        log_test("Nonexistent Customer", "PASS", "Correctly returned 404 for missing customer")
    else:
        log_test("Nonexistent Customer", "FAIL", "Should have returned 404")
    
    # Test invalid invoice status
    # First create a minimal invoice to test with
    job_id = create_test_job()
    if job_id:
        response = make_request("POST", f"/invoices/from-job/{job_id}", expect_status=200)
        if response:
            invoice_id = response["id"]
            # Try invalid status
            response = make_request("PUT", f"/invoices/{invoice_id}/status", 
                                 params={"status": "InvalidStatus"}, expect_status=400)
            if response is None:
                log_test("Invalid Invoice Status", "PASS", "Correctly rejected invalid status")
            else:
                log_test("Invalid Invoice Status", "FAIL", "Should have rejected invalid status")
            
            # Clean up
            make_request("DELETE", f"/invoices/{invoice_id}", expect_status=200)

def main():
    """Main test execution"""
    print("🚗 SMASH REPAIRS MANAGEMENT - BACKEND API TESTING")
    print("=" * 60)
    print(f"Testing against: {BASE_URL}")
    print("=" * 60)
    
    # Test authentication first
    if not test_auth():
        print("\n❌ AUTHENTICATION FAILED - STOPPING TESTS")
        sys.exit(1)
    
    # Test Customer APIs
    customer_id = test_customer_apis()
    
    # Test Invoice APIs  
    invoice_id = test_invoice_apis()
    
    # Test error handling
    test_error_handling()
    
    # Cleanup
    test_cleanup(customer_id, invoice_id)
    
    print("\n" + "=" * 60)
    print("🎉 BACKEND TESTING COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()