from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
    owner_info: OwnerInfo
    insurance_info: Optional[InsuranceInfo] = None
    damage_description: str
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
    skip_count = skip if skip else 0
    limit_count = limit if limit else 100
    
    jobs = await db.jobs.find(query).sort("created_at", -1).skip(skip_count).limit(limit_count).to_list(limit_count)
    
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
        "owner_info": job_data.owner_info.dict(),
        "insurance_info": job_data.insurance_info.dict() if job_data.insurance_info else None,
        "damage_description": job_data.damage_description,
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
    
    # Revenue stats (from completed jobs)
    revenue_pipeline = [
        {"$match": {"status": {"$in": ["Completed", "Collected"]}}},
        {"$group": {"_id": None, "total_estimated": {"$sum": "$estimated_cost"}, "total_actual": {"$sum": "$actual_cost"}}}
    ]
    revenue_stats = await db.jobs.aggregate(revenue_pipeline).to_list(1)
    
    total_estimated = revenue_stats[0]["total_estimated"] if revenue_stats and revenue_stats[0].get("total_estimated") else 0
    total_actual = revenue_stats[0]["total_actual"] if revenue_stats and revenue_stats[0].get("total_actual") else 0
    
    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "status_breakdown": status_dict,
        "total_estimated_revenue": total_estimated,
        "total_actual_revenue": total_actual
    }

@api_router.get("/statuses")
async def get_statuses():
    return {"statuses": JOB_STATUSES}

# ==================== PLATE SCANNING ====================

class PlateScanRequest(BaseModel):
    image_base64: str

class PlateScanResponse(BaseModel):
    registration: Optional[str] = None
    success: bool
    message: str

@api_router.post("/scan-plate", response_model=PlateScanResponse)
async def scan_plate(request: PlateScanRequest, current_user: dict = Depends(get_current_user)):
    """Scan a registration plate image and extract the plate number using AI vision."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        # Initialize the chat with vision model
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"plate-scan-{uuid.uuid4()}",
            system_message="""You are a registration plate reader. Your task is to extract the registration/license plate number from vehicle images.

IMPORTANT RULES:
1. Look for the registration plate in the image
2. Extract ONLY the alphanumeric characters on the plate
3. Remove any spaces, dashes, or special characters
4. Return ONLY the plate number in uppercase, nothing else
5. If you cannot find or read a plate, respond with exactly: NO_PLATE_FOUND
6. Do not include any explanation, just the plate number or NO_PLATE_FOUND

Examples of valid responses:
- ABC123
- 1XYZ987
- DEMO999
- NO_PLATE_FOUND"""
        )
        
        # Use GPT-4 Vision for image analysis
        chat.with_model("openai", "gpt-4o")
        
        # Create image content from base64
        image_content = ImageContent(
            image_base64=request.image_base64
        )
        
        # Create message with image
        user_message = UserMessage(
            text="Extract the vehicle registration plate number from this image. Return ONLY the plate number in uppercase with no spaces, or NO_PLATE_FOUND if you cannot read it.",
            file_contents=[image_content]
        )
        
        # Send message and get response
        response = await chat.send_message(user_message)
        
        # Clean up the response
        plate_number = response.strip().upper()
        
        # Remove any common prefixes/suffixes the AI might add
        plate_number = plate_number.replace("PLATE:", "").replace("NUMBER:", "").strip()
        
        # Check if plate was found
        if plate_number == "NO_PLATE_FOUND" or not plate_number:
            return PlateScanResponse(
                registration=None,
                success=False,
                message="Could not read registration plate from image. Please try again with a clearer photo."
            )
        
        # Clean up - keep only alphanumeric characters
        plate_number = re.sub(r'[^A-Z0-9]', '', plate_number)
        
        if len(plate_number) < 2 or len(plate_number) > 10:
            return PlateScanResponse(
                registration=None,
                success=False,
                message="Invalid plate format detected. Please try again."
            )
        
        logger.info(f"Plate scanned successfully: {plate_number}")
        
        return PlateScanResponse(
            registration=plate_number,
            success=True,
            message=f"Registration plate detected: {plate_number}"
        )
        
    except ImportError:
        raise HTTPException(status_code=500, detail="Vision integration not available")
    except Exception as e:
        logger.error(f"Plate scan error: {str(e)}")
        return PlateScanResponse(
            registration=None,
            success=False,
            message=f"Error scanning plate: {str(e)}"
        )

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
