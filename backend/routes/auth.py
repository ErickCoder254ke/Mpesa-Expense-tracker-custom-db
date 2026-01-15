from fastapi import APIRouter, HTTPException
from models.user import User, UserSignup, UserLogin, Category
from services.categorization import CategorizationService
from services.pesadb_service import db_service
import bcrypt
import logging
import json

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/signup")
async def signup(user_data: UserSignup):
    """Register a new user"""
    try:
        logger.info(f"Signup request received for email: {user_data.email}")

        # Check if user already exists with this email - using efficient lookup
        existing_user = await db_service.get_user_by_email(user_data.email)
        if existing_user:
            logger.warning(f"Signup failed: Email already exists - {user_data.email}")
            raise HTTPException(status_code=400, detail="User with this email already exists")

        # Hash the password
        password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())

        # Create user
        user = User(
            email=user_data.email.lower(),
            password_hash=password_hash.decode('utf-8'),
            name=user_data.name,
            preferences={"default_currency": "KES"}
        )

        # Insert user
        user_data_dict = user.dict()
        user_data_dict['created_at'] = user_data_dict['created_at'].isoformat()
        await db_service.create_user(user_data_dict)
        user_id = user.id

        # Create default categories for the user (only if none exist yet)
        existing_categories = await db_service.get_categories(limit=10)
        categories_created = 0

        if len(existing_categories) == 0:
            # No categories exist, create default ones
            default_categories = CategorizationService.get_default_categories()
            for cat_data in default_categories:
                try:
                    category = Category(**cat_data)
                    category_dict = category.dict()
                    await db_service.create_category(category_dict)
                    categories_created += 1
                except Exception as cat_error:
                    logger.warning(f"Failed to create category {cat_data.get('name')}: {str(cat_error)}")

            logger.info(f"✅ Created {categories_created} default categories")
        else:
            logger.info(f"✅ Using existing {len(existing_categories)} categories")
            categories_created = len(existing_categories)

        logger.info(f"✅ User created successfully - ID: {user_id}, Email: {user.email}, Categories: {categories_created}")

        return {
            "message": "Signup successful",
            "user_id": user_id,
            "email": user.email,
            "name": user.name,
            "categories": categories_created
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during signup: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error during signup: {str(e)}")

@router.post("/login")
async def login(login_data: UserLogin):
    """Login user with email and password"""
    try:
        logger.info(f"Login request received for email: {login_data.email}")

        # Get user by email - using efficient lookup
        user_doc = await db_service.get_user_by_email(login_data.email)

        if not user_doc:
            logger.warning(f"Login failed: User not found - {login_data.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        stored_hash = user_doc["password_hash"].encode('utf-8')
        is_valid = bcrypt.checkpw(login_data.password.encode('utf-8'), stored_hash)

        if not is_valid:
            logger.warning(f"Login failed: Invalid password for user - {login_data.email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        logger.info(f"✅ Login successful - User ID: {user_doc['id']}, Email: {user_doc['email']}")

        return {
            "message": "Login successful",
            "user_id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc.get("name")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error during login: {str(e)}")

@router.get("/user-status")
async def get_user_status():
    """Check if any user exists"""
    try:
        user_count = await db_service.get_user_count()
        categories_count = await db_service.count_categories()

        return {
            "has_user": user_count > 0,
            "user_count": user_count,
            "categories_count": categories_count
        }
    except Exception as e:
        logger.error(f"Error checking user status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error checking user status: {str(e)}")

@router.get("/me")
async def get_current_user(user_id: str):
    """Get current user details"""
    try:
        user_doc = await db_service.get_user_by_id(user_id)
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "user_id": user_doc["id"],
            "email": user_doc["email"],
            "name": user_doc.get("name"),
            "preferences": user_doc.get("preferences", {})
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")
