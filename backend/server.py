from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'smash-repairs-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Smash Repairs Management API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Job Status Enum
JOB_STATUSES = [
    "Received",
    "Awaiting Parts",
    "Awaiting Approval",
    "In Progress",
    "Ready for Payment",
    "Completed",
    "Collected"
]

# User Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Car Info Model
class CarInfo(BaseModel):
    make: str
    model: str
    year: int
    registration: str
    vin: Optional[str] = None
    color: Optional[str] = None

# Owner Info Model
class OwnerInfo(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

# Insurance Info Model
class InsuranceInfo(BaseModel):
    company: Optional[str] = None
    policy_number: Optional[str] = None
    claim_number: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None

# ==================== CUSTOMER/CONTACT MODELS ====================

class VehicleRecord(BaseModel):
    registration: str
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    vehicles: Optional[List[VehicleRecord]] = []
    insurance_company: Optional[str] = None
    insurance_policy: Optional[str] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    vehicles: Optional[List[VehicleRecord]] = None
    insurance_company: Optional[str] = None
    insurance_policy: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    vehicles: List[VehicleRecord] = []
    insurance_company: Optional[str] = None
    insurance_policy: Optional[str] = None
    notes: Optional[str] = None
    jobs_count: int = 0
    created_at: datetime
    updated_at: datetime

# ==================== INVOICE MODELS ====================

INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"]

class InvoiceLineItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    total: float

class InvoiceCreate(BaseModel):
    job_id: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    line_items: List[InvoiceLineItem] = []
    subtotal: float
    gst: float = 0
    total: float
    notes: Optional[str] = None
    due_days: int = 14

class InvoiceUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    line_items: Optional[List[InvoiceLineItem]] = None
    subtotal: Optional[float] = None
    gst: Optional[float] = None
    total: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    paid_date: Optional[datetime] = None

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    job_id: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    line_items: List[InvoiceLineItem] = []
    subtotal: float
    gst: float
    total: float
    notes: Optional[str] = None
    status: str
    issue_date: datetime
    due_date: datetime
    paid_date: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

# Photo Model
class Photo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    base64_data: str
    caption: Optional[str] = None
    photo_type: str = "damage"  # damage, repair, before, after
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Cost Item Model
class CostItem(BaseModel):
    description: str
    amount: float
    item_type: str = "labor"  # labor, parts, paint, other

# Job Models
class JobCreate(BaseModel):
    car_info: CarInfo
    owner_info: Optional[OwnerInfo] = None  # Now optional - can add later
    insurance_info: Optional[InsuranceInfo] = None
    damage_description: Optional[str] = None  # Now optional - can add later
    estimated_cost: Optional[float] = None
    cost_items: Optional[List[CostItem]] = []
    notes: Optional[str] = None

class JobUpdate(BaseModel):
    car_info: Optional[CarInfo] = None
    owner_info: Optional[OwnerInfo] = None
    insurance_info: Optional[InsuranceInfo] = None
    damage_description: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    cost_items: Optional[List[CostItem]] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class PhotoAdd(BaseModel):
    base64_data: str
    caption: Optional[str] = None
    photo_type: str = "damage"

class JobResponse(BaseModel):
    id: str
    car_info: CarInfo
    owner_info: OwnerInfo
    insurance_info: Optional[InsuranceInfo] = None
    damage_description: str
    status: str
    photos: List[Photo] = []
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    cost_items: List[CostItem] = []
    notes: Optional[str] = None
    status_history: List[dict] = []
    created_at: datetime
    updated_at: datetime
    created_by: str

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "role": "staff",
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Generate token
    token = create_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            username=user_data.username,
            email=user_data.email,
            role="staff",
            created_at=user_doc["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    token = create_token(user_id, login_data.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            username=user["username"],
            email=user["email"],
            role=user.get("role", "staff"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        role=current_user.get("role", "staff"),
        created_at=current_user["created_at"]
    )

# ==================== JOB ENDPOINTS ====================

@api_router.get("/jobs", response_model=List[JobResponse])
async def get_jobs(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if status and status != "All":
        query["status"] = status
    
    if search:
        query["$or"] = [
            {"car_info.registration": {"$regex": search, "$options": "i"}},
            {"car_info.make": {"$regex": search, "$options": "i"}},
            {"car_info.model": {"$regex": search, "$options": "i"}},
            {"owner_info.name": {"$regex": search, "$options": "i"}},
            {"owner_info.phone": {"$regex": search, "$options": "i"}}
        ]
    
    # Apply pagination
    jobs = await db.jobs.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for job in jobs:
        job["id"] = str(job["_id"])
        del job["_id"]
        result.append(JobResponse(**job))
    
    return result

@api_router.post("/jobs", response_model=JobResponse)
async def create_job(job_data: JobCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.utcnow()
    
    job_doc = {
        "car_info": job_data.car_info.dict(),
        "owner_info": job_data.owner_info.dict() if job_data.owner_info else None,
        "insurance_info": job_data.insurance_info.dict() if job_data.insurance_info else None,
        "damage_description": job_data.damage_description or "To be assessed",
        "status": "Received",
        "photos": [],
        "estimated_cost": job_data.estimated_cost,
        "actual_cost": None,
        "cost_items": [item.dict() for item in job_data.cost_items] if job_data.cost_items else [],
        "notes": job_data.notes,
        "status_history": [{
            "status": "Received",
            "timestamp": now.isoformat(),
            "changed_by": current_user["username"],
            "notes": "Job created"
        }],
        "created_at": now,
        "updated_at": now,
        "created_by": current_user["username"]
    }
    
    result = await db.jobs.insert_one(job_doc)
    job_doc["id"] = str(result.inserted_id)
    
    return JobResponse(**job_doc)

@api_router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job["id"] = str(job["_id"])
    del job["_id"]
    return JobResponse(**job)

@api_router.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, job_update: JobUpdate, current_user: dict = Depends(get_current_user)):
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = {}
    update_dict = job_update.dict(exclude_unset=True)
    
    for key, value in update_dict.items():
        if value is not None:
            if key in ["car_info", "owner_info", "insurance_info"]:
                update_data[key] = value
            elif key == "cost_items":
                update_data[key] = value
            elif key == "status" and value != job.get("status"):
                update_data[key] = value
                # Add to status history
                status_entry = {
                    "status": value,
                    "timestamp": datetime.utcnow().isoformat(),
                    "changed_by": current_user["username"],
                    "notes": job_update.notes or f"Status changed to {value}"
                }
                await db.jobs.update_one(
                    {"_id": ObjectId(job_id)},
                    {"$push": {"status_history": status_entry}}
                )
            else:
                update_data[key] = value
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": update_data}
    )
    
    updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    updated_job["id"] = str(updated_job["_id"])
    del updated_job["_id"]
    
    return JobResponse(**updated_job)

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await db.jobs.delete_one({"_id": ObjectId(job_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job deleted successfully"}

@api_router.put("/jobs/{job_id}/status", response_model=JobResponse)
async def update_job_status(job_id: str, status_update: StatusUpdate, current_user: dict = Depends(get_current_user)):
    if status_update.status not in JOB_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {JOB_STATUSES}")
    
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    now = datetime.utcnow()
    status_entry = {
        "status": status_update.status,
        "timestamp": now.isoformat(),
        "changed_by": current_user["username"],
        "notes": status_update.notes or f"Status changed to {status_update.status}"
    }
    
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$set": {"status": status_update.status, "updated_at": now},
            "$push": {"status_history": status_entry}
        }
    )
    
    updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    updated_job["id"] = str(updated_job["_id"])
    del updated_job["_id"]
    
    return JobResponse(**updated_job)

@api_router.post("/jobs/{job_id}/photos", response_model=JobResponse)
async def add_photo(job_id: str, photo_data: PhotoAdd, current_user: dict = Depends(get_current_user)):
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    photo = Photo(
        base64_data=photo_data.base64_data,
        caption=photo_data.caption,
        photo_type=photo_data.photo_type
    )
    
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$push": {"photos": photo.dict()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    updated_job["id"] = str(updated_job["_id"])
    del updated_job["_id"]
    
    return JobResponse(**updated_job)

@api_router.delete("/jobs/{job_id}/photos/{photo_id}", response_model=JobResponse)
async def delete_photo(job_id: str, photo_id: str, current_user: dict = Depends(get_current_user)):
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {
            "$pull": {"photos": {"id": photo_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    updated_job["id"] = str(updated_job["_id"])
    del updated_job["_id"]
    
    return JobResponse(**updated_job)

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Count jobs by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.jobs.aggregate(pipeline).to_list(100)
    
    status_dict = {item["_id"]: item["count"] for item in status_counts}
    
    # Calculate totals
    total_jobs = sum(status_dict.values())
    active_jobs = sum(status_dict.get(s, 0) for s in ["Received", "Awaiting Parts", "Awaiting Approval", "In Progress", "Ready for Payment"])
    completed_jobs = status_dict.get("Completed", 0) + status_dict.get("Collected", 0)
    
    # Total estimated revenue from ALL jobs
    all_revenue_pipeline = [
        {"$group": {"_id": None, "total_estimated": {"$sum": "$estimated_cost"}, "total_actual": {"$sum": "$actual_cost"}}}
    ]
    all_revenue_stats = await db.jobs.aggregate(all_revenue_pipeline).to_list(1)
    
    total_estimated = all_revenue_stats[0]["total_estimated"] if all_revenue_stats and all_revenue_stats[0].get("total_estimated") else 0
    total_actual = all_revenue_stats[0]["total_actual"] if all_revenue_stats and all_revenue_stats[0].get("total_actual") else 0
    
    # Revenue from active jobs (pending)
    active_revenue_pipeline = [
        {"$match": {"status": {"$in": ["Received", "Awaiting Parts", "Awaiting Approval", "In Progress", "Ready for Payment"]}}},
        {"$group": {"_id": None, "pending_estimated": {"$sum": "$estimated_cost"}}}
    ]
    active_revenue_stats = await db.jobs.aggregate(active_revenue_pipeline).to_list(1)
    pending_estimated = active_revenue_stats[0]["pending_estimated"] if active_revenue_stats and active_revenue_stats[0].get("pending_estimated") else 0
    
    # Revenue from completed jobs
    completed_revenue_pipeline = [
        {"$match": {"status": {"$in": ["Completed", "Collected"]}}},
        {"$group": {"_id": None, "completed_estimated": {"$sum": "$estimated_cost"}, "completed_actual": {"$sum": "$actual_cost"}}}
    ]
    completed_revenue_stats = await db.jobs.aggregate(completed_revenue_pipeline).to_list(1)
    completed_estimated = completed_revenue_stats[0]["completed_estimated"] if completed_revenue_stats and completed_revenue_stats[0].get("completed_estimated") else 0
    completed_actual = completed_revenue_stats[0]["completed_actual"] if completed_revenue_stats and completed_revenue_stats[0].get("completed_actual") else 0
    
    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "status_breakdown": status_dict,
        "total_estimated_revenue": total_estimated,
        "total_actual_revenue": total_actual,
        "pending_revenue": pending_estimated,
        "completed_revenue": completed_actual or completed_estimated
    }

@api_router.get("/statuses")
async def get_statuses():
    return {"statuses": JOB_STATUSES}

# ==================== CUSTOMER/CONTACT ENDPOINTS ====================

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all customers with optional search."""
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"vehicles.registration": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for customer in customers:
        customer["id"] = str(customer["_id"])
        del customer["_id"]
        
        # Count jobs for this customer (by phone or by vehicle registrations)
        jobs_count = 0
        if customer.get("vehicles"):
            regos = [v.get("registration") for v in customer.get("vehicles", []) if v.get("registration")]
            if regos:
                jobs_count = await db.jobs.count_documents({
                    "car_info.registration": {"$in": regos}
                })
        
        customer["jobs_count"] = jobs_count
        result.append(CustomerResponse(**customer))
    
    return result

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer_data: CustomerCreate, current_user: dict = Depends(get_current_user)):
    """Create a new customer."""
    now = datetime.utcnow()
    
    customer_doc = {
        "name": customer_data.name,
        "phone": customer_data.phone,
        "email": customer_data.email,
        "address": customer_data.address,
        "vehicles": [v.dict() for v in customer_data.vehicles] if customer_data.vehicles else [],
        "insurance_company": customer_data.insurance_company,
        "insurance_policy": customer_data.insurance_policy,
        "notes": customer_data.notes,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.customers.insert_one(customer_doc)
    customer_doc["id"] = str(result.inserted_id)
    customer_doc["jobs_count"] = 0
    
    return CustomerResponse(**customer_doc)

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single customer by ID."""
    try:
        customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer["id"] = str(customer["_id"])
    del customer["_id"]
    
    # Count jobs
    jobs_count = 0
    if customer.get("vehicles"):
        regos = [v.get("registration") for v in customer.get("vehicles", []) if v.get("registration")]
        if regos:
            jobs_count = await db.jobs.count_documents({
                "car_info.registration": {"$in": regos}
            })
    customer["jobs_count"] = jobs_count
    
    return CustomerResponse(**customer)

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer_update: CustomerUpdate, current_user: dict = Depends(get_current_user)):
    """Update a customer."""
    try:
        customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {}
    update_dict = customer_update.dict(exclude_unset=True)
    
    for key, value in update_dict.items():
        if value is not None:
            if key == "vehicles":
                update_data[key] = value
            else:
                update_data[key] = value
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.customers.update_one(
        {"_id": ObjectId(customer_id)},
        {"$set": update_data}
    )
    
    updated_customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    updated_customer["id"] = str(updated_customer["_id"])
    del updated_customer["_id"]
    
    # Count jobs
    jobs_count = 0
    if updated_customer.get("vehicles"):
        regos = [v.get("registration") for v in updated_customer.get("vehicles", []) if v.get("registration")]
        if regos:
            jobs_count = await db.jobs.count_documents({
                "car_info.registration": {"$in": regos}
            })
    updated_customer["jobs_count"] = jobs_count
    
    return CustomerResponse(**updated_customer)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a customer."""
    try:
        result = await db.customers.delete_one({"_id": ObjectId(customer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"message": "Customer deleted successfully"}

@api_router.get("/customers/{customer_id}/jobs")
async def get_customer_jobs(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get all jobs for a customer."""
    try:
        customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get jobs by vehicle registrations
    regos = [v.get("registration") for v in customer.get("vehicles", []) if v.get("registration")]
    
    if not regos:
        return []
    
    jobs = await db.jobs.find({
        "car_info.registration": {"$in": regos}
    }).sort("created_at", -1).to_list(100)
    
    result = []
    for job in jobs:
        job["id"] = str(job["_id"])
        del job["_id"]
        result.append(job)
    
    return result

# ==================== INVOICE ENDPOINTS ====================

async def generate_invoice_number():
    """Generate a unique invoice number."""
    # Get count of invoices
    count = await db.invoices.count_documents({})
    return f"INV-{str(count + 1).zfill(5)}"

@api_router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices with optional filtering."""
    query = {}
    
    if status and status != "All":
        query["status"] = status
    
    if search:
        query["$or"] = [
            {"invoice_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_email": {"$regex": search, "$options": "i"}}
        ]
    
    invoices = await db.invoices.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for invoice in invoices:
        invoice["id"] = str(invoice["_id"])
        del invoice["_id"]
        result.append(InvoiceResponse(**invoice))
    
    return result

@api_router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(invoice_data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    """Create a new invoice."""
    now = datetime.utcnow()
    invoice_number = await generate_invoice_number()
    
    # Calculate due date
    due_date = now + timedelta(days=invoice_data.due_days)
    
    invoice_doc = {
        "invoice_number": invoice_number,
        "job_id": invoice_data.job_id,
        "customer_name": invoice_data.customer_name,
        "customer_email": invoice_data.customer_email,
        "customer_phone": invoice_data.customer_phone,
        "customer_address": invoice_data.customer_address,
        "line_items": [item.dict() for item in invoice_data.line_items],
        "subtotal": invoice_data.subtotal,
        "gst": invoice_data.gst,
        "total": invoice_data.total,
        "notes": invoice_data.notes,
        "status": "Draft",
        "issue_date": now,
        "due_date": due_date,
        "paid_date": None,
        "created_by": current_user["username"],
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.invoices.insert_one(invoice_doc)
    invoice_doc["id"] = str(result.inserted_id)
    
    return InvoiceResponse(**invoice_doc)

@api_router.post("/invoices/from-job/{job_id}", response_model=InvoiceResponse)
async def create_invoice_from_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Create an invoice from an existing job."""
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    now = datetime.utcnow()
    invoice_number = await generate_invoice_number()
    
    # Build line items from job
    line_items = []
    
    # Add cost items if present
    if job.get("cost_items"):
        for item in job["cost_items"]:
            line_items.append({
                "description": item.get("description", "Service"),
                "quantity": 1,
                "unit_price": item.get("amount", 0),
                "total": item.get("amount", 0)
            })
    
    # If no cost items, use estimated or actual cost
    if not line_items:
        amount = job.get("actual_cost") or job.get("estimated_cost") or 0
        line_items.append({
            "description": f"Repair work - {job.get('damage_description', 'Vehicle repair')}",
            "quantity": 1,
            "unit_price": amount,
            "total": amount
        })
    
    # Calculate totals
    subtotal = sum(item["total"] for item in line_items)
    gst = round(subtotal * 0.1, 2)  # 10% GST
    total = subtotal + gst
    
    # Get customer details from job
    owner_info = job.get("owner_info") or {}
    car_info = job.get("car_info") or {}
    
    invoice_doc = {
        "invoice_number": invoice_number,
        "job_id": job_id,
        "customer_name": owner_info.get("name", "Unknown"),
        "customer_email": owner_info.get("email"),
        "customer_phone": owner_info.get("phone"),
        "customer_address": owner_info.get("address"),
        "line_items": line_items,
        "subtotal": subtotal,
        "gst": gst,
        "total": total,
        "notes": f"Vehicle: {car_info.get('year', '')} {car_info.get('make', '')} {car_info.get('model', '')} - {car_info.get('registration', '')}",
        "status": "Draft",
        "issue_date": now,
        "due_date": now + timedelta(days=14),
        "paid_date": None,
        "created_by": current_user["username"],
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.invoices.insert_one(invoice_doc)
    invoice_doc["id"] = str(result.inserted_id)
    
    return InvoiceResponse(**invoice_doc)

@api_router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single invoice."""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice["id"] = str(invoice["_id"])
    del invoice["_id"]
    return InvoiceResponse(**invoice)

@api_router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(invoice_id: str, invoice_update: InvoiceUpdate, current_user: dict = Depends(get_current_user)):
    """Update an invoice."""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {}
    update_dict = invoice_update.dict(exclude_unset=True)
    
    for key, value in update_dict.items():
        if value is not None:
            if key == "line_items":
                update_data[key] = value
            else:
                update_data[key] = value
    
    update_data["updated_at"] = datetime.utcnow()
    
    # If marking as paid, set paid_date
    if update_data.get("status") == "Paid" and not invoice.get("paid_date"):
        update_data["paid_date"] = datetime.utcnow()
    
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": update_data}
    )
    
    updated_invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    updated_invoice["id"] = str(updated_invoice["_id"])
    del updated_invoice["_id"]
    
    return InvoiceResponse(**updated_invoice)

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str = Query(...), current_user: dict = Depends(get_current_user)):
    """Update invoice status."""
    if status not in INVOICE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {INVOICE_STATUSES}")
    
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {"status": status, "updated_at": datetime.utcnow()}
    
    if status == "Paid":
        update_data["paid_date"] = datetime.utcnow()
    
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": update_data}
    )
    
    return {"message": f"Invoice status updated to {status}"}

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an invoice."""
    try:
        result = await db.invoices.delete_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice deleted successfully"}

@api_router.get("/invoices/stats/summary")
async def get_invoice_stats(current_user: dict = Depends(get_current_user)):
    """Get invoice statistics."""
    # Count by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "total": {"$sum": "$total"}}}
    ]
    stats = await db.invoices.aggregate(pipeline).to_list(100)
    
    status_breakdown = {item["_id"]: {"count": item["count"], "total": item["total"]} for item in stats}
    
    total_invoiced = sum(item.get("total", 0) for item in stats)
    paid_amount = status_breakdown.get("Paid", {}).get("total", 0)
    outstanding = total_invoiced - paid_amount
    
    return {
        "total_invoices": sum(item["count"] for item in stats),
        "total_invoiced": total_invoiced,
        "paid_amount": paid_amount,
        "outstanding": outstanding,
        "status_breakdown": status_breakdown
    }

# ==================== RETURNING CUSTOMER LOOKUP ====================

class CustomerLookupResponse(BaseModel):
    found: bool
    registration: Optional[str] = None
    car_info: Optional[dict] = None
    owner_info: Optional[dict] = None
    insurance_info: Optional[dict] = None
    previous_jobs_count: int = 0
    message: str

@api_router.get("/lookup-rego/{registration}", response_model=CustomerLookupResponse)
async def lookup_registration(registration: str, current_user: dict = Depends(get_current_user)):
    """Look up a registration plate to find returning customer details from previous jobs."""
    try:
        # Clean up registration - uppercase, no spaces
        clean_rego = registration.upper().replace(" ", "").replace("-", "")
        
        # Search for previous jobs with this registration
        jobs = await db.jobs.find({
            "car_info.registration": {"$regex": f"^{clean_rego}$", "$options": "i"}
        }).sort("created_at", -1).to_list(100)
        
        if not jobs:
            return CustomerLookupResponse(
                found=False,
                registration=clean_rego,
                previous_jobs_count=0,
                message="No previous records found for this registration"
            )
        
        # Get the most recent job with complete owner info
        latest_job = jobs[0]
        owner_info = latest_job.get("owner_info")
        
        # Find the best owner info (most complete)
        for job in jobs:
            job_owner = job.get("owner_info")
            if job_owner and job_owner.get("name") and job_owner.get("phone"):
                owner_info = job_owner
                break
        
        # Get car info from latest
        car_info = latest_job.get("car_info")
        
        # Get insurance info if available
        insurance_info = None
        for job in jobs:
            if job.get("insurance_info") and job.get("insurance_info", {}).get("company"):
                insurance_info = job.get("insurance_info")
                break
        
        return CustomerLookupResponse(
            found=True,
            registration=clean_rego,
            car_info=car_info,
            owner_info=owner_info,
            insurance_info=insurance_info,
            previous_jobs_count=len(jobs),
            message=f"Returning customer! {len(jobs)} previous job(s) found"
        )
        
    except Exception as e:
        logger.error(f"Registration lookup error: {str(e)}")
        return CustomerLookupResponse(
            found=False,
            registration=registration,
            previous_jobs_count=0,
            message=f"Error looking up registration: {str(e)}"
        )

# ==================== PLATE SCANNING ====================

class PlateScanRequest(BaseModel):
    image_base64: str

class PlateScanResponse(BaseModel):
    registration: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    # Returning customer data
    returning_customer: bool = False
    owner_info: Optional[dict] = None
    insurance_info: Optional[dict] = None
    previous_jobs_count: int = 0
    success: bool
    message: str

@api_router.post("/scan-plate", response_model=PlateScanResponse)
async def scan_plate(request: PlateScanRequest, current_user: dict = Depends(get_current_user)):
    """Scan a registration plate image and extract plate number + vehicle details using AI vision."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        import json
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        # Initialize the chat with vision model
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"plate-scan-{uuid.uuid4()}",
            system_message="""You are an expert vehicle identification system. Your task is to analyze vehicle images and extract:
1. The registration/license plate number
2. The vehicle make (manufacturer)
3. The vehicle model
4. The vehicle color
5. The approximate year (based on model generation)

You MUST respond with ONLY a valid JSON object in this exact format, no other text:
{
    "plate": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "color": "Silver",
    "year": 2020
}

RULES:
- For "plate": Extract alphanumeric characters only, uppercase, no spaces/dashes. Use null if not visible.
- For "make": The manufacturer brand (Toyota, Ford, Holden, Mazda, etc). Use null if uncertain.
- For "model": The specific model name (Camry, Ranger, Commodore, CX-5, etc). Use null if uncertain.
- For "color": The main body color in simple terms (Silver, White, Black, Red, Blue, Grey, etc). Use null if not visible.
- For "year": Your best estimate of the manufacturing year based on the model generation. Use null if very uncertain.

Be confident in your guesses based on visual features like grille design, headlight shape, body style, badges, and emblems.
ONLY output the JSON object, nothing else."""
        )
        
        # Use GPT-4 Vision for image analysis
        chat.with_model("openai", "gpt-4o")
        
        # Create image content from base64
        image_content = ImageContent(
            image_base64=request.image_base64
        )
        
        # Create message with image
        user_message = UserMessage(
            text="Analyze this vehicle image. Extract the registration plate number and identify the vehicle make, model, color, and approximate year. Respond with ONLY a JSON object.",
            file_contents=[image_content]
        )
        
        # Send message and get response
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        try:
            # Clean up response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
                clean_response = clean_response.strip()
            
            data = json.loads(clean_response)
        except json.JSONDecodeError:
            # Fallback: try to extract plate number the old way
            plate_number = response.strip().upper()
            plate_number = re.sub(r'[^A-Z0-9]', '', plate_number)
            
            if len(plate_number) >= 2 and len(plate_number) <= 10:
                return PlateScanResponse(
                    registration=plate_number,
                    make=None,
                    model=None,
                    color=None,
                    year=None,
                    success=True,
                    message=f"Registration detected: {plate_number}. Could not identify vehicle details."
                )
            else:
                return PlateScanResponse(
                    registration=None,
                    make=None,
                    model=None,
                    color=None,
                    year=None,
                    success=False,
                    message="Could not analyze the image. Please try again with a clearer photo."
                )
        
        # Extract and clean plate number
        plate_number = data.get("plate")
        if plate_number:
            plate_number = re.sub(r'[^A-Z0-9]', '', str(plate_number).upper())
            if len(plate_number) < 2 or len(plate_number) > 10:
                plate_number = None
        
        # Extract vehicle details
        make = data.get("make")
        model = data.get("model")
        color = data.get("color")
        year = data.get("year")
        
        # Validate year
        if year:
            try:
                year = int(year)
                if year < 1900 or year > 2026:
                    year = None
            except (ValueError, TypeError):
                year = None
        
        # Check for returning customer
        returning_customer = False
        owner_info = None
        insurance_info = None
        previous_jobs_count = 0
        
        if plate_number:
            # Search for previous jobs with this registration
            previous_jobs = await db.jobs.find({
                "car_info.registration": {"$regex": f"^{plate_number}$", "$options": "i"}
            }).sort("created_at", -1).to_list(100)
            
            if previous_jobs:
                returning_customer = True
                previous_jobs_count = len(previous_jobs)
                
                # Get owner info from previous jobs (find most complete)
                for job in previous_jobs:
                    job_owner = job.get("owner_info")
                    if job_owner and job_owner.get("name") and job_owner.get("phone"):
                        owner_info = job_owner
                        break
                
                # Get insurance info if available
                for job in previous_jobs:
                    if job.get("insurance_info") and job.get("insurance_info", {}).get("company"):
                        insurance_info = job.get("insurance_info")
                        break
                
                # Also get car info from previous records if AI couldn't identify
                if not make or not model:
                    prev_car = previous_jobs[0].get("car_info", {})
                    if not make:
                        make = prev_car.get("make")
                    if not model:
                        model = prev_car.get("model")
                    if not year:
                        year = prev_car.get("year")
                    if not color:
                        color = prev_car.get("color")
        
        # Build response message
        details_found = []
        if plate_number:
            details_found.append(f"Rego: {plate_number}")
        if make and model:
            details_found.append(f"{make} {model}")
        elif make:
            details_found.append(make)
        if year:
            details_found.append(str(year))
        if color:
            details_found.append(color)
        
        if not plate_number and not make:
            return PlateScanResponse(
                registration=None,
                make=None,
                model=None,
                color=None,
                year=None,
                returning_customer=False,
                owner_info=None,
                insurance_info=None,
                previous_jobs_count=0,
                success=False,
                message="Could not identify the vehicle or read the plate. Please try again with a clearer photo."
            )
        
        # Build message
        message = f"Detected: {', '.join(details_found)}"
        if returning_customer:
            message = f"🔄 Returning Customer! {previous_jobs_count} previous job(s). " + message
        
        logger.info(f"Vehicle scan successful: {details_found}, returning_customer={returning_customer}")
        
        return PlateScanResponse(
            registration=plate_number,
            make=make,
            model=model,
            color=color,
            year=year,
            returning_customer=returning_customer,
            owner_info=owner_info,
            insurance_info=insurance_info,
            previous_jobs_count=previous_jobs_count,
            success=True,
            message=message
        )
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Vision integration not available")
    except Exception as e:
        logger.error(f"Plate scan error: {str(e)}")
        return PlateScanResponse(
            registration=None,
            make=None,
            model=None,
            color=None,
            year=None,
            success=False,
            message=f"Error scanning plate: {str(e)}"
        )

# ==================== DAMAGE ANALYSIS ====================

# Standard panel numbering for smash repairs
PANEL_MAP = {
    1: "Right Front Guard",
    2: "Right Front Door", 
    3: "Right Rear Door",
    4: "Right Rear Quarter",
    5: "Rear Bumper (Right)",
    6: "Rear Bumper (Left)",
    7: "Left Rear Quarter",
    8: "Left Rear Door",
    9: "Left Front Door",
    10: "Left Front Guard",
    11: "Bonnet/Hood",
    12: "Roof",
    13: "Boot/Trunk Lid",
    14: "Front Bumper (Centre)",
    15: "Front Bumper (Left)",
    16: "Front Bumper (Right)",
    17: "Windscreen",
    18: "Rear Window",
    19: "Right Front Wheel",
    20: "Right Rear Wheel",
    21: "Left Front Wheel",
    22: "Left Rear Wheel",
}

# Repair types and base costs (AUD)
REPAIR_COSTS = {
    "pdr": {"name": "Paintless Dent Repair", "min": 150, "max": 350},
    "minor_repair": {"name": "Minor Panel Repair & Respray", "min": 350, "max": 650},
    "major_repair": {"name": "Major Panel Repair & Respray", "min": 650, "max": 1200},
    "panel_replacement": {"name": "Panel Replacement", "min": 800, "max": 2500},
    "bumper_repair": {"name": "Bumper Repair", "min": 250, "max": 600},
    "bumper_replacement": {"name": "Bumper Replacement", "min": 500, "max": 1500},
    "scratch_repair": {"name": "Scratch Repair & Touch-up", "min": 150, "max": 400},
    "glass_replacement": {"name": "Glass Replacement", "min": 300, "max": 800},
}

class DamageItem(BaseModel):
    panel_number: int
    panel_name: str
    damage_type: str
    severity: str
    repair_method: str
    estimated_cost_min: float
    estimated_cost_max: float
    description: str

class DamageAnalysisResponse(BaseModel):
    success: bool
    damages: List[DamageItem]
    total_min: float
    total_max: float
    summary: str
    message: str

class DamageAnalysisRequest(BaseModel):
    image_base64: str

@api_router.post("/analyze-damage", response_model=DamageAnalysisResponse)
async def analyze_damage(request: DamageAnalysisRequest, current_user: dict = Depends(get_current_user)):
    """Analyze damage photo and identify affected panels with cost estimates."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, SystemMessage, ImageContent
        
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            model="gpt-4o"
        )
        
        # Build the prompt for damage analysis
        panel_list = "\n".join([f"{num}: {name}" for num, name in PANEL_MAP.items()])
        
        system_prompt = f"""You are an expert automotive damage assessor for a smash repairs business in Australia.

Analyze the vehicle damage in the image and identify ALL damaged panels using this standard numbering system:

{panel_list}

For each damaged area, provide:
1. Panel number (from the list above)
2. Damage type (dent, scratch, crack, crease, hole, paint damage, glass damage)
3. Severity (minor, moderate, severe)
4. Recommended repair method (pdr, minor_repair, major_repair, panel_replacement, bumper_repair, bumper_replacement, scratch_repair, glass_replacement)

Respond in this exact JSON format:
{{
  "damages": [
    {{
      "panel_number": 1,
      "damage_type": "dent",
      "severity": "moderate",
      "repair_method": "minor_repair",
      "notes": "30cm dent with minor paint cracking"
    }}
  ],
  "summary": "Brief overall damage summary"
}}

Be thorough - identify ALL visible damage. If you cannot see clear damage, return an empty damages array."""

        # Create the message with image
        image_data = request.image_base64
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        messages = [
            SystemMessage(content=system_prompt),
            UserMessage(content=[
                ImageContent(
                    image_type="base64",
                    image=image_data,
                    media_type="image/jpeg"
                ),
                "Analyze this vehicle damage photo and identify all damaged panels with their panel numbers."
            ])
        ]
        
        response = await chat.send_async(messages=messages, max_tokens=2000)
        response_text = response.content
        
        # Clean the response to extract JSON
        import json
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            return DamageAnalysisResponse(
                success=False,
                damages=[],
                total_min=0,
                total_max=0,
                summary="",
                message="Could not analyze the image. Please try with a clearer photo."
            )
        
        analysis = json.loads(json_match.group())
        
        # Process the damages
        damage_items = []
        total_min = 0
        total_max = 0
        
        for dmg in analysis.get("damages", []):
            panel_num = dmg.get("panel_number", 0)
            panel_name = PANEL_MAP.get(panel_num, f"Panel {panel_num}")
            damage_type = dmg.get("damage_type", "damage")
            severity = dmg.get("severity", "moderate")
            repair_method = dmg.get("repair_method", "minor_repair")
            notes = dmg.get("notes", "")
            
            # Get cost range
            cost_info = REPAIR_COSTS.get(repair_method, REPAIR_COSTS["minor_repair"])
            
            # Adjust cost based on severity
            severity_multiplier = {"minor": 0.7, "moderate": 1.0, "severe": 1.4}.get(severity, 1.0)
            cost_min = cost_info["min"] * severity_multiplier
            cost_max = cost_info["max"] * severity_multiplier
            
            total_min += cost_min
            total_max += cost_max
            
            # Build description
            description = f"{panel_num} - {panel_name}: {severity.capitalize()} {damage_type}"
            if notes:
                description += f" - {notes}"
            
            damage_items.append(DamageItem(
                panel_number=panel_num,
                panel_name=panel_name,
                damage_type=damage_type,
                severity=severity,
                repair_method=cost_info["name"],
                estimated_cost_min=round(cost_min, 2),
                estimated_cost_max=round(cost_max, 2),
                description=description
            ))
        
        summary = analysis.get("summary", f"Identified {len(damage_items)} damaged panel(s)")
        
        if not damage_items:
            return DamageAnalysisResponse(
                success=True,
                damages=[],
                total_min=0,
                total_max=0,
                summary="No visible damage detected",
                message="No damage was identified in this photo. Try taking a photo closer to the damaged area."
            )
        
        return DamageAnalysisResponse(
            success=True,
            damages=damage_items,
            total_min=round(total_min, 2),
            total_max=round(total_max, 2),
            summary=summary,
            message=f"Identified {len(damage_items)} damaged area(s). Estimated repair: ${total_min:,.0f} - ${total_max:,.0f}"
        )
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Vision integration not available")
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        return DamageAnalysisResponse(
            success=False,
            damages=[],
            total_min=0,
            total_max=0,
            summary="",
            message="Could not parse damage analysis. Please try again."
        )
    except Exception as e:
        logger.error(f"Damage analysis error: {str(e)}")
        return DamageAnalysisResponse(
            success=False,
            damages=[],
            total_min=0,
            total_max=0,
            summary="",
            message=f"Error analyzing damage: {str(e)}"
        )

# ==================== QUOTES ====================

class QuoteLineItem(BaseModel):
    panel_number: int
    panel_name: str
    description: str
    repair_method: str
    cost_min: float
    cost_max: float
    final_cost: Optional[float] = None

class QuoteCreate(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    vehicle_registration: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    line_items: List[QuoteLineItem]
    notes: Optional[str] = None
    photos: List[str] = []

@api_router.post("/quotes")
async def create_quote(quote: QuoteCreate, current_user: dict = Depends(get_current_user)):
    """Create a new quote."""
    # Calculate totals
    total_min = sum(item.cost_min for item in quote.line_items)
    total_max = sum(item.cost_max for item in quote.line_items)
    
    # Generate quote number
    count = await db.quotes.count_documents({})
    quote_number = f"Q-{count + 1:05d}"
    
    quote_doc = {
        "quote_number": quote_number,
        "customer_name": quote.customer_name,
        "customer_phone": quote.customer_phone,
        "customer_email": quote.customer_email,
        "vehicle_registration": quote.vehicle_registration,
        "vehicle_make": quote.vehicle_make,
        "vehicle_model": quote.vehicle_model,
        "vehicle_year": quote.vehicle_year,
        "vehicle_color": quote.vehicle_color,
        "line_items": [item.dict() for item in quote.line_items],
        "total_min": total_min,
        "total_max": total_max,
        "final_total": None,
        "notes": quote.notes,
        "photos": quote.photos,
        "status": "Draft",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": current_user["username"]
    }
    
    result = await db.quotes.insert_one(quote_doc)
    quote_doc["id"] = str(result.inserted_id)
    quote_doc["_id"] = str(result.inserted_id)
    
    return quote_doc

@api_router.get("/quotes")
async def get_quotes(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all quotes."""
    query = {}
    if status and status != "All":
        query["status"] = status
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"vehicle_registration": {"$regex": search, "$options": "i"}},
            {"quote_number": {"$regex": search, "$options": "i"}}
        ]
    
    quotes = await db.quotes.find(query).sort("created_at", -1).to_list(100)
    for quote in quotes:
        quote["id"] = str(quote["_id"])
        del quote["_id"]
    return quotes

@api_router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single quote."""
    try:
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid quote ID")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    quote["id"] = str(quote["_id"])
    del quote["_id"]
    return quote

@api_router.put("/quotes/{quote_id}")
async def update_quote(quote_id: str, quote: QuoteCreate, current_user: dict = Depends(get_current_user)):
    """Update a quote."""
    try:
        existing = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid quote ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    total_min = sum(item.cost_min for item in quote.line_items)
    total_max = sum(item.cost_max for item in quote.line_items)
    
    update_data = {
        "customer_name": quote.customer_name,
        "customer_phone": quote.customer_phone,
        "customer_email": quote.customer_email,
        "vehicle_registration": quote.vehicle_registration,
        "vehicle_make": quote.vehicle_make,
        "vehicle_model": quote.vehicle_model,
        "vehicle_year": quote.vehicle_year,
        "vehicle_color": quote.vehicle_color,
        "line_items": [item.dict() for item in quote.line_items],
        "total_min": total_min,
        "total_max": total_max,
        "notes": quote.notes,
        "photos": quote.photos,
        "updated_at": datetime.utcnow()
    }
    
    await db.quotes.update_one({"_id": ObjectId(quote_id)}, {"$set": update_data})
    
    updated = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    updated["id"] = str(updated["_id"])
    del updated["_id"]
    return updated

@api_router.put("/quotes/{quote_id}/status")
async def update_quote_status(
    quote_id: str,
    status: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Update quote status."""
    valid_statuses = ["Draft", "Sent", "Accepted", "Declined", "Expired"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    try:
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid quote ID")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    update_data = {"status": status, "updated_at": datetime.utcnow()}
    
    await db.quotes.update_one({"_id": ObjectId(quote_id)}, {"$set": update_data})
    
    return {"success": True, "message": f"Quote status updated to {status}"}

@api_router.post("/quotes/{quote_id}/convert-to-job")
async def convert_quote_to_job(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Convert an accepted quote to a job."""
    try:
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid quote ID")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Build damage description from line items
    damage_descriptions = [item["description"] for item in quote.get("line_items", [])]
    description = "\n".join(damage_descriptions)
    
    # Calculate estimate from line items
    estimate = sum(item.get("final_cost") or item.get("cost_max", 0) for item in quote.get("line_items", []))
    
    # Create job
    job_doc = {
        "registration": quote.get("vehicle_registration"),
        "make": quote.get("vehicle_make"),
        "model": quote.get("vehicle_model"),
        "year": quote.get("vehicle_year"),
        "color": quote.get("vehicle_color"),
        "vin": None,
        "owner_name": quote.get("customer_name"),
        "owner_phone": quote.get("customer_phone"),
        "owner_email": quote.get("customer_email"),
        "insurance_company": None,
        "policy_number": None,
        "claim_number": None,
        "description": description,
        "status": "Received",
        "estimate": estimate,
        "photos": quote.get("photos", []),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": current_user["username"],
        "quote_id": str(quote["_id"])
    }
    
    result = await db.jobs.insert_one(job_doc)
    
    # Update quote status
    await db.quotes.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": {"status": "Accepted", "job_id": str(result.inserted_id), "updated_at": datetime.utcnow()}}
    )
    
    job_doc["id"] = str(result.inserted_id)
    return {"success": True, "job_id": str(result.inserted_id), "message": "Quote converted to job successfully"}

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a quote."""
    try:
        result = await db.quotes.delete_one({"_id": ObjectId(quote_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid quote ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return {"success": True, "message": "Quote deleted"}

# ==================== XERO INTEGRATION ====================

import httpx
import secrets

# Xero OAuth2 Configuration
XERO_CLIENT_ID = os.environ.get('XERO_CLIENT_ID', '')
XERO_CLIENT_SECRET = os.environ.get('XERO_CLIENT_SECRET', '')
XERO_REDIRECT_URI = os.environ.get('XERO_REDIRECT_URI', '')
XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize"
XERO_TOKEN_URL = "https://identity.xero.com/connect/token"
XERO_API_BASE = "https://api.xero.com"
XERO_SCOPES = "offline_access accounting.transactions accounting.contacts openid profile email"

# In-memory token storage (in production, use database)
xero_tokens_store = {}
xero_states_store = {}

class XeroTokens(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: datetime
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None

@api_router.get("/xero/status")
async def get_xero_status(current_user: dict = Depends(get_current_user)):
    """Check if Xero is connected."""
    user_id = str(current_user["_id"])
    tokens = xero_tokens_store.get(user_id)
    
    if not tokens:
        return {
            "connected": False,
            "message": "Not connected to Xero"
        }
    
    # Check if token is expired
    if datetime.utcnow() > tokens.expires_at:
        # Try to refresh
        try:
            await refresh_xero_token(user_id)
            tokens = xero_tokens_store.get(user_id)
        except:
            return {
                "connected": False,
                "message": "Token expired, please reconnect"
            }
    
    return {
        "connected": True,
        "tenant_name": tokens.tenant_name,
        "tenant_id": tokens.tenant_id,
        "message": f"Connected to {tokens.tenant_name}"
    }

@api_router.get("/xero/authorize")
async def xero_authorize(current_user: dict = Depends(get_current_user)):
    """Start Xero OAuth2 authorization flow."""
    if not XERO_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Xero not configured")
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    user_id = str(current_user["_id"])
    xero_states_store[state] = {
        "user_id": user_id,
        "created_at": datetime.utcnow()
    }
    
    # Build authorization URL
    auth_params = {
        "response_type": "code",
        "client_id": XERO_CLIENT_ID,
        "redirect_uri": XERO_REDIRECT_URI,
        "scope": XERO_SCOPES,
        "state": state,
    }
    
    auth_url = f"{XERO_AUTH_URL}?" + "&".join([f"{k}={v}" for k, v in auth_params.items()])
    
    return {
        "auth_url": auth_url,
        "message": "Redirect user to this URL to authorize"
    }

@api_router.get("/xero/callback")
async def xero_callback(code: str = None, state: str = None, error: str = None):
    """Handle Xero OAuth2 callback."""
    from fastapi.responses import HTMLResponse
    
    if error:
        return HTMLResponse(content=f"""
            <html><body>
            <h2>Xero Connection Failed</h2>
            <p>Error: {error}</p>
            <p>You can close this window.</p>
            </body></html>
        """)
    
    if not state or state not in xero_states_store:
        return HTMLResponse(content="""
            <html><body>
            <h2>Invalid Request</h2>
            <p>Invalid or expired state parameter.</p>
            </body></html>
        """)
    
    state_data = xero_states_store.pop(state)
    user_id = state_data["user_id"]
    
    # Exchange code for tokens
    try:
        async with httpx.AsyncClient() as client:
            token_data = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": XERO_REDIRECT_URI,
                "client_id": XERO_CLIENT_ID,
                "client_secret": XERO_CLIENT_SECRET,
            }
            
            response = await client.post(
                XERO_TOKEN_URL,
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            tokens = response.json()
            
            access_token = tokens.get("access_token")
            refresh_token = tokens.get("refresh_token")
            expires_in = tokens.get("expires_in", 1800)
            
            # Get tenant information
            connections_response = await client.get(
                f"{XERO_API_BASE}/connections",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            connections = connections_response.json()
            
            if connections and len(connections) > 0:
                tenant = connections[0]
                tenant_id = tenant.get("tenantId")
                tenant_name = tenant.get("tenantName")
            else:
                tenant_id = None
                tenant_name = "Unknown"
            
            # Store tokens
            xero_tokens_store[user_id] = XeroTokens(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
                tenant_id=tenant_id,
                tenant_name=tenant_name
            )
            
            logger.info(f"Xero connected for user {user_id}, tenant: {tenant_name}")
            
            return HTMLResponse(content=f"""
                <html><body>
                <h2>Successfully Connected to Xero!</h2>
                <p>Connected to: <strong>{tenant_name}</strong></p>
                <p>You can close this window and return to the app.</p>
                <script>
                    setTimeout(function() {{
                        window.close();
                    }}, 3000);
                </script>
                </body></html>
            """)
            
    except Exception as e:
        logger.error(f"Xero callback error: {str(e)}")
        return HTMLResponse(content=f"""
            <html><body>
            <h2>Connection Failed</h2>
            <p>Error: {str(e)}</p>
            <p>Please try again.</p>
            </body></html>
        """)

async def refresh_xero_token(user_id: str):
    """Refresh Xero access token."""
    tokens = xero_tokens_store.get(user_id)
    if not tokens:
        raise ValueError("No tokens found")
    
    async with httpx.AsyncClient() as client:
        token_data = {
            "grant_type": "refresh_token",
            "refresh_token": tokens.refresh_token,
            "client_id": XERO_CLIENT_ID,
            "client_secret": XERO_CLIENT_SECRET,
        }
        
        response = await client.post(
            XERO_TOKEN_URL,
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        response.raise_for_status()
        new_tokens = response.json()
        
        xero_tokens_store[user_id] = XeroTokens(
            access_token=new_tokens.get("access_token"),
            refresh_token=new_tokens.get("refresh_token"),
            expires_at=datetime.utcnow() + timedelta(seconds=new_tokens.get("expires_in", 1800)),
            tenant_id=tokens.tenant_id,
            tenant_name=tokens.tenant_name
        )

async def get_valid_xero_token(user_id: str) -> str:
    """Get a valid Xero access token, refreshing if necessary."""
    tokens = xero_tokens_store.get(user_id)
    if not tokens:
        raise ValueError("Not connected to Xero")
    
    # Refresh if expiring within 5 minutes
    if datetime.utcnow() > tokens.expires_at - timedelta(minutes=5):
        await refresh_xero_token(user_id)
        tokens = xero_tokens_store.get(user_id)
    
    return tokens.access_token, tokens.tenant_id

class XeroInvoiceSync(BaseModel):
    invoice_id: str

@api_router.post("/xero/sync-invoice/{invoice_id}")
async def sync_invoice_to_xero(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Sync an invoice to Xero."""
    user_id = str(current_user["_id"])
    
    # Check Xero connection
    tokens = xero_tokens_store.get(user_id)
    if not tokens or not tokens.tenant_id:
        raise HTTPException(status_code=400, detail="Not connected to Xero. Please connect first.")
    
    # Get the invoice
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    try:
        access_token, tenant_id = await get_valid_xero_token(user_id)
        
        # First, check if contact exists in Xero or create one
        contact_name = invoice.get("customer_name", "Unknown Customer")
        
        async with httpx.AsyncClient() as client:
            # Search for existing contact
            search_response = await client.get(
                f"{XERO_API_BASE}/api.xro/2.0/Contacts",
                params={"where": f'Name=="{contact_name}"'},
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Xero-tenant-id": tenant_id,
                    "Accept": "application/json"
                }
            )
            
            contacts_data = search_response.json()
            contacts = contacts_data.get("Contacts", [])
            
            if contacts:
                contact_id = contacts[0].get("ContactID")
            else:
                # Create new contact
                new_contact = {
                    "Contacts": [{
                        "Name": contact_name,
                        "EmailAddress": invoice.get("customer_email"),
                        "Phones": [{"PhoneType": "DEFAULT", "PhoneNumber": invoice.get("customer_phone")}] if invoice.get("customer_phone") else []
                    }]
                }
                
                create_response = await client.post(
                    f"{XERO_API_BASE}/api.xro/2.0/Contacts",
                    json=new_contact,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Xero-tenant-id": tenant_id,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                )
                created_contact = create_response.json()
                contact_id = created_contact.get("Contacts", [{}])[0].get("ContactID")
            
            # Build line items for Xero
            xero_line_items = []
            for item in invoice.get("line_items", []):
                xero_line_items.append({
                    "Description": item.get("description", "Service"),
                    "Quantity": item.get("quantity", 1),
                    "UnitAmount": item.get("unit_price", 0),
                    "AccountCode": "200",  # Default sales account
                    "TaxType": "OUTPUT"  # GST on sales
                })
            
            # Create invoice in Xero
            xero_invoice = {
                "Invoices": [{
                    "Type": "ACCREC",  # Accounts Receivable (sales invoice)
                    "Contact": {"ContactID": contact_id},
                    "LineItems": xero_line_items,
                    "InvoiceNumber": invoice.get("invoice_number"),
                    "Reference": f"Job ID: {invoice.get('job_id')}",
                    "DueDate": invoice.get("due_date").strftime("%Y-%m-%d") if invoice.get("due_date") else None,
                    "Status": "DRAFT",  # Create as draft first
                    "LineAmountTypes": "Exclusive"  # Amounts are exclusive of GST
                }]
            }
            
            invoice_response = await client.post(
                f"{XERO_API_BASE}/api.xro/2.0/Invoices",
                json=xero_invoice,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Xero-tenant-id": tenant_id,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            
            if invoice_response.status_code != 200:
                error_detail = invoice_response.text
                logger.error(f"Xero invoice creation failed: {error_detail}")
                raise HTTPException(status_code=400, detail=f"Xero error: {error_detail}")
            
            xero_result = invoice_response.json()
            xero_invoice_id = xero_result.get("Invoices", [{}])[0].get("InvoiceID")
            xero_invoice_number = xero_result.get("Invoices", [{}])[0].get("InvoiceNumber")
            
            # Update our invoice with Xero reference
            await db.invoices.update_one(
                {"_id": ObjectId(invoice_id)},
                {"$set": {
                    "xero_invoice_id": xero_invoice_id,
                    "xero_synced_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }}
            )
            
            logger.info(f"Invoice {invoice_id} synced to Xero as {xero_invoice_id}")
            
            return {
                "success": True,
                "xero_invoice_id": xero_invoice_id,
                "xero_invoice_number": xero_invoice_number,
                "message": f"Invoice synced to Xero successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Xero sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync to Xero: {str(e)}")

@api_router.post("/xero/sync-contact/{customer_id}")
async def sync_contact_to_xero(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Sync a customer/contact to Xero."""
    user_id = str(current_user["_id"])
    
    tokens = xero_tokens_store.get(user_id)
    if not tokens or not tokens.tenant_id:
        raise HTTPException(status_code=400, detail="Not connected to Xero. Please connect first.")
    
    try:
        customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    try:
        access_token, tenant_id = await get_valid_xero_token(user_id)
        
        async with httpx.AsyncClient() as client:
            new_contact = {
                "Contacts": [{
                    "Name": customer.get("name"),
                    "EmailAddress": customer.get("email"),
                    "Phones": [{"PhoneType": "DEFAULT", "PhoneNumber": customer.get("phone")}] if customer.get("phone") else [],
                    "Addresses": [{
                        "AddressType": "STREET",
                        "AddressLine1": customer.get("address")
                    }] if customer.get("address") else []
                }]
            }
            
            response = await client.post(
                f"{XERO_API_BASE}/api.xro/2.0/Contacts",
                json=new_contact,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Xero-tenant-id": tenant_id,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Xero error: {response.text}")
            
            result = response.json()
            xero_contact_id = result.get("Contacts", [{}])[0].get("ContactID")
            
            # Update customer with Xero reference
            await db.customers.update_one(
                {"_id": ObjectId(customer_id)},
                {"$set": {
                    "xero_contact_id": xero_contact_id,
                    "xero_synced_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }}
            )
            
            return {
                "success": True,
                "xero_contact_id": xero_contact_id,
                "message": f"Contact synced to Xero successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Xero contact sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sync contact: {str(e)}")

@api_router.delete("/xero/disconnect")
async def disconnect_xero(current_user: dict = Depends(get_current_user)):
    """Disconnect from Xero."""
    user_id = str(current_user["_id"])
    
    if user_id in xero_tokens_store:
        del xero_tokens_store[user_id]
    
    return {"success": True, "message": "Disconnected from Xero"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Smash Repairs Management API", "version": "1.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
