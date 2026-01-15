from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PesaDB configuration (replaces MongoDB)
from config.pesadb import get_client, query_db
from config.pesadb_fallbacks import detect_pesadb_capabilities
from services.pesadb_service import db_service
from services.database_initializer import db_initializer

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
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

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
        # Test database connectivity with PesaDB
        pesadb_api_url = os.environ.get('PESADB_API_URL', 'NOT_SET')
        pesadb_database = os.environ.get('PESADB_DATABASE', 'mpesa_tracker')

        # Try a simple query to test connection and verify tables exist
        user_count = await db_service.get_user_count()
        category_count = await db_service.count_categories()

        # Only count transactions if user exists
        if user_count > 0:
            user_doc = await db_service.get_user()
            transaction_count = await db_service.count_transactions(user_doc["id"]) if user_doc else 0
        else:
            transaction_count = 0

        db_status = "connected"
        db_initialized = user_count > 0 and category_count > 0
    except Exception as e:
        db_status = f"error: {str(e)}"
        db_initialized = False
        transaction_count = 0
        user_count = 0
        category_count = 0

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": {
            "status": db_status,
            "initialized": db_initialized,
            "type": "PesaDB",
            "api_url": pesadb_api_url,
            "database_name": pesadb_database,
            "api_key_configured": os.environ.get('PESADB_API_KEY') is not None,
            "stats": {
                "users": user_count,
                "categories": category_count,
                "transactions": transaction_count
            }
        },
        "message": "M-Pesa Expense Tracker Backend is running (PesaDB)"
    }

@api_router.post("/initialize-database")
async def manual_database_initialization():
    """Manually trigger database initialization - useful for debugging"""
    logger.info("📝 Manual database initialization requested...")
    try:
        result = await db_initializer.initialize_database(
            seed_categories=True,
            create_default_user=True
        )

        return {
            "success": result['success'],
            "message": result['message'],
            "details": {
                "tables_created": result['tables_created'],
                "tables_skipped": result['tables_skipped'],
                "categories_seeded": result['categories_seeded'],
                "user_created": result.get('user_created', False),
                "verified": result['verified'],
                "errors": result.get('errors', [])
            }
        }
    except Exception as e:
        logger.error(f"❌ Manual database initialization failed: {str(e)}", exc_info=True)
        return {
            "success": False,
            "message": f"Initialization failed: {str(e)}",
            "details": {}
        }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.dict())
    status_dict = status_obj.dict()
    await db_service.create_status_check(status_dict)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db_service.get_status_checks(limit=1000)
    # Parse timestamps if they're strings
    for check in status_checks:
        if isinstance(check.get('timestamp'), str):
            check['timestamp'] = check['timestamp']  # Keep as string for now
    return [StatusCheck(**check) for check in status_checks]

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

@app.on_event("startup")
async def startup_db_initialization():
    """Initialize database on startup"""
    logger.info("🚀 Server starting up - checking database...")
    try:
        # Initialize database with default user creation
        result = await db_initializer.initialize_database(
            seed_categories=True,
            create_default_user=True
        )

        if result['success']:
            logger.info(
                f"✅ Database ready: "
                f"{result['tables_created']} tables created, "
                f"{result['tables_skipped']} existed, "
                f"{result['categories_seeded']} categories seeded, "
                f"Default user {'created' if result.get('user_created') else 'already exists'}"
            )
            if result.get('user_created'):
                logger.warning("⚠️  Default user created with PIN '0000' - please change during first login")
        else:
            logger.error(f"❌ Database initialization failed: {result['message']}")
            if result.get('errors'):
                for error in result['errors']:
                    logger.error(f"  - {error}")
            logger.warning("⚠️  The server will continue, but some features may not work properly")
            logger.warning("⚠️  Try restarting the server or check database credentials")
    except Exception as e:
        logger.error(f"❌ Database initialization failed with exception: {str(e)}", exc_info=True)
        logger.warning("The server will continue, but database operations may fail")
        logger.warning("Please check your PESADB_API_KEY environment variable")

    # Detect database capabilities for aggregate functions
    try:
        logger.info("🔍 Detecting database capabilities...")
        caps = await detect_pesadb_capabilities(query_db)

        if not caps['count']:
            logger.warning(
                "⚠️ DATABASE VERSION WARNING: "
                "Your PesaDB instance does not support COUNT aggregates. "
                "Application is using memory-based fallbacks (slower performance). "
                "Please upgrade to PesaDB v2.0.0+ for optimal performance."
            )
        else:
            logger.info("✅ Database supports native aggregates - optimal performance enabled")

        logger.info(f"📊 Database capabilities: {caps}")

    except Exception as e:
        logger.warning(f"Could not detect database capabilities: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close PesaDB client connection"""
    client = get_client()
    await client.close()
    logger.info("PesaDB client connection closed")
