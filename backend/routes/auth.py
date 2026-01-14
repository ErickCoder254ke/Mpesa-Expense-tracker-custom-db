from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.user import User, UserCreate, UserVerify, Category, SecurityAnswerVerify, PINReset
from services.categorization import CategorizationService
import bcrypt
import os

router = APIRouter(prefix="/auth", tags=["auth"])

async def get_db():
    from server import db
    return db

@router.post("/setup-pin")
async def setup_pin(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Setup PIN for new user and create default categories"""
    try:
        # Check if user already exists (for demo, we'll use a single user)
        existing_user = await db.users.find_one({})
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")

        # Hash the PIN
        pin_hash = bcrypt.hashpw(user_data.pin.encode('utf-8'), bcrypt.gensalt())

        # Hash security answer if provided
        security_answer_hash = None
        if user_data.security_answer:
            # Normalize answer: lowercase and strip whitespace
            normalized_answer = user_data.security_answer.lower().strip()
            security_answer_hash = bcrypt.hashpw(normalized_answer.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Create user
        user = User(
            pin_hash=pin_hash.decode('utf-8'),
            security_question=user_data.security_question,
            security_answer_hash=security_answer_hash,
            preferences={"default_currency": "KES"}
        )

        # Insert user
        result = await db.users.insert_one(user.dict())
        user_id = str(result.inserted_id)

        # Create default categories
        default_categories = CategorizationService.get_default_categories()
        categories = []
        for cat_data in default_categories:
            category = Category(**cat_data)
            await db.categories.insert_one(category.dict())
            categories.append(category)

        return {
            "message": "PIN setup successful",
            "user_id": user_id,
            "categories": len(categories)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting up PIN: {str(e)}")

@router.post("/verify-pin")
async def verify_pin(verify_data: UserVerify, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Verify user PIN"""
    try:
        # Get user (for demo, get the first user)
        user_doc = await db.users.find_one({})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found. Please setup PIN first.")
        
        # Verify PIN
        stored_hash = user_doc["pin_hash"].encode('utf-8')
        is_valid = bcrypt.checkpw(verify_data.pin.encode('utf-8'), stored_hash)
        
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid PIN")
        
        return {
            "message": "PIN verified successfully",
            "user_id": str(user_doc["_id"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying PIN: {str(e)}")

@router.get("/user-status")
async def get_user_status(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Check if user exists and has PIN setup"""
    try:
        user_doc = await db.users.find_one({})
        categories_count = await db.categories.count_documents({})

        return {
            "has_user": user_doc is not None,
            "user_id": str(user_doc["_id"]) if user_doc else None,
            "categories_count": categories_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking user status: {str(e)}")

@router.get("/security-question")
async def get_security_question(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get the security question for PIN reset"""
    try:
        user_doc = await db.users.find_one({})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        if not user_doc.get("security_question"):
            raise HTTPException(status_code=404, detail="No security question set for this account")

        return {
            "question": user_doc["security_question"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching security question: {str(e)}")

@router.post("/verify-security-answer")
async def verify_security_answer(verify_data: SecurityAnswerVerify, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Verify the security answer for PIN reset"""
    try:
        user_doc = await db.users.find_one({})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        if not user_doc.get("security_answer_hash"):
            raise HTTPException(status_code=404, detail="No security answer set for this account")

        # Normalize the provided answer
        normalized_answer = verify_data.answer.lower().strip()
        stored_hash = user_doc["security_answer_hash"].encode('utf-8')

        is_valid = bcrypt.checkpw(normalized_answer.encode('utf-8'), stored_hash)

        if not is_valid:
            raise HTTPException(status_code=401, detail="Incorrect security answer")

        return {
            "message": "Security answer verified successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying security answer: {str(e)}")

@router.post("/reset-pin")
async def reset_pin(reset_data: PINReset, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Reset user PIN after security verification"""
    try:
        user_doc = await db.users.find_one({})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify security answer again
        if not user_doc.get("security_answer_hash"):
            raise HTTPException(status_code=400, detail="No security answer set for this account")

        normalized_answer = reset_data.security_answer.lower().strip()
        stored_hash = user_doc["security_answer_hash"].encode('utf-8')

        is_valid = bcrypt.checkpw(normalized_answer.encode('utf-8'), stored_hash)

        if not is_valid:
            raise HTTPException(status_code=401, detail="Incorrect security answer")

        # Hash new PIN
        new_pin_hash = bcrypt.hashpw(reset_data.new_pin.encode('utf-8'), bcrypt.gensalt())

        # Update PIN
        await db.users.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"pin_hash": new_pin_hash.decode('utf-8')}}
        )

        return {
            "message": "PIN reset successful"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting PIN: {str(e)}")
