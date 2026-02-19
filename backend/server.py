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

# ==================== PLATE SCANNING ====================

class PlateScanRequest(BaseModel):
    image_base64: str

class PlateScanResponse(BaseModel):
    registration: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
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
                success=False,
                message="Could not identify the vehicle or read the plate. Please try again with a clearer photo."
            )
        
        logger.info(f"Vehicle scan successful: {details_found}")
        
        return PlateScanResponse(
            registration=plate_number,
            make=make,
            model=model,
            color=color,
            year=year,
            success=True,
            message=f"Detected: {', '.join(details_found)}"
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
