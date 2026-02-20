#!/usr/bin/env python3
"""
Test Additional Critical Backend Features
"""

import requests
import json

BACKEND_URL = "https://repair-flow-app-1.preview.emergentagent.com/api"

def test_complete_flow():
    """Test complete user and job flow"""
    print("🔄 Testing Complete Backend Flow")
    print("=" * 40)
    
    # 1. Register user
    user_data = {
        "username": "flowtest_user",
        "email": "flowtest@email.com", 
        "password": "FlowTest123!"
    }
    
    reg_response = requests.post(f"{BACKEND_URL}/auth/register", json=user_data)
    print(f"1. User Registration: {reg_response.status_code}")
    
    if reg_response.status_code != 200:
        print("❌ Registration failed")
        return False
    
    token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test get statuses
    status_response = requests.get(f"{BACKEND_URL}/statuses")
    print(f"2. Get Statuses: {status_response.status_code}")
    
    if status_response.status_code != 200:
        print("❌ Get statuses failed")
        return False
    
    statuses = status_response.json()["statuses"]
    print(f"   Available statuses: {len(statuses)} statuses")
    
    # 3. Create job
    job_data = {
        "car_info": {
            "make": "Honda",
            "model": "Civic", 
            "year": 2019,
            "registration": "TEST123"
        },
        "owner_info": {
            "name": "Test Owner",
            "phone": "+61 400 000 000"
        },
        "damage_description": "Test damage for flow testing",
        "estimated_cost": 1500.00
    }
    
    job_response = requests.post(f"{BACKEND_URL}/jobs", json=job_data, headers=headers)
    print(f"3. Create Job: {job_response.status_code}")
    
    if job_response.status_code != 200:
        print("❌ Job creation failed")
        return False
    
    job_id = job_response.json()["id"]
    print(f"   Created job ID: {job_id}")
    
    # 4. Update job status
    status_update = {
        "status": "In Progress",
        "notes": "Flow test - changing status"
    }
    
    status_update_response = requests.put(
        f"{BACKEND_URL}/jobs/{job_id}/status", 
        json=status_update, 
        headers=headers
    )
    print(f"4. Update Job Status: {status_update_response.status_code}")
    
    if status_update_response.status_code != 200:
        print("❌ Status update failed")
        return False
    
    # 5. Get dashboard stats
    stats_response = requests.get(f"{BACKEND_URL}/dashboard/stats", headers=headers)
    print(f"5. Dashboard Stats: {stats_response.status_code}")
    
    if stats_response.status_code != 200:
        print("❌ Dashboard stats failed")
        return False
    
    stats = stats_response.json()
    print(f"   Total jobs: {stats.get('total_jobs', 0)}")
    print(f"   Active jobs: {stats.get('active_jobs', 0)}")
    
    # 6. Test job search
    search_response = requests.get(f"{BACKEND_URL}/jobs?search=Honda", headers=headers)
    print(f"6. Job Search: {search_response.status_code}")
    
    if search_response.status_code != 200:
        print("❌ Job search failed")
        return False
    
    found_jobs = search_response.json()
    print(f"   Found {len(found_jobs)} jobs matching 'Honda'")
    
    # 7. Add photo to job
    test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    
    photo_data = {
        "base64_data": test_image,
        "caption": "Flow test photo",
        "photo_type": "damage"
    }
    
    photo_response = requests.post(
        f"{BACKEND_URL}/jobs/{job_id}/photos", 
        json=photo_data, 
        headers=headers
    )
    print(f"7. Add Photo: {photo_response.status_code}")
    
    if photo_response.status_code != 200:
        print("❌ Photo upload failed")
        return False
    
    photo_count = len(photo_response.json().get("photos", []))
    print(f"   Job now has {photo_count} photo(s)")
    
    # 8. Delete job (cleanup)
    delete_response = requests.delete(f"{BACKEND_URL}/jobs/{job_id}", headers=headers)
    print(f"8. Delete Job: {delete_response.status_code}")
    
    if delete_response.status_code != 200:
        print("❌ Job deletion failed")
        return False
    
    print("✅ Complete flow test passed!")
    return True

def main():
    success = test_complete_flow()
    
    if success:
        print("\n🎉 All flow tests completed successfully!")
    else:
        print("\n❌ Some flow tests failed")

if __name__ == "__main__":
    main()