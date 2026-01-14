from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'mpesa_tracker')
db = client[db_name]

# Create the main app without a prefix
app = FastAPI()

# Add CORS middleware FIRST (before routes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:19000",
        "exp://localhost:8081",
        "exp://localhost:19000",
        "exp://localhost:19006",
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Import route modules
from routes import auth, transactions, categories, sms_integration, budgets

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "M-Pesa Expense Tracker API", "status": "running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint to verify backend connectivity"""
    try:
        # Test database connectivity
        await db.admin.command('ping')
        db_status = "connected"
        mongo_uri = os.environ.get('MONGO_URL', 'NOT_SET')
        # Hide password in URI for security
        safe_uri = mongo_uri.replace(mongo_uri.split('@')[0].split('//')[1], '***') if '@' in mongo_uri else mongo_uri
    except Exception as e:
        db_status = f"error: {str(e)}"
        safe_uri = "N/A"

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_status,
        "mongo_url_set": os.environ.get('MONGO_URL') is not None,
        "mongo_url": safe_uri,
        "db_name": db_name,
        "message": "M-Pesa Expense Tracker Backend is running"
    }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include route modules
api_router.include_router(auth.router)
api_router.include_router(transactions.router)
api_router.include_router(categories.router)
api_router.include_router(sms_integration.router)
api_router.include_router(budgets.router)

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
