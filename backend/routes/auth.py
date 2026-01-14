from fastapi import APIRouter, HTTPException
from models.user import User, UserCreate, UserVerify, Category, SecurityAnswerVerify, PINReset
from services.categorization import CategorizationService
from services.pesadb_service import db_service
import bcrypt
import os

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/setup-pin")
async def setup_pin(user_data: UserCreate):
    """Setup PIN for new user and create default categories"""
    import logging
    import json
    logger = logging.getLogger(__name__)

    try:
        logger.info(f"Setup PIN request received")

        # Check if user already exists (for demo, we'll use a single user)
        logger.info("Checking for existing user...")
        user_count = await db_service.get_user_count()
        logger.info(f"Existing user check complete: {user_count > 0}")

        if user_count > 0:
            # Check if the existing user is a default user (has is_default preference)
            existing_user = await db_service.get_user()
            if existing_user:
                preferences = existing_user.get('preferences', '{}')
                if isinstance(preferences, str):
                    preferences = json.loads(preferences)

                # If it's a default user, allow updating the PIN
                if preferences.get('is_default'):
                    logger.info("Updating default user with new PIN...")

                    # Hash the new PIN
                    pin_hash = bcrypt.hashpw(user_data.pin.encode('utf-8'), bcrypt.gensalt())

                    # Hash security answer if provided
                    security_answer_hash = None
                    if user_data.security_answer:
                        normalized_answer = user_data.security_answer.lower().strip()
                        security_answer_hash = bcrypt.hashpw(normalized_answer.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

                    # Update user PIN and remove default flag
                    await db_service.update_user_pin(existing_user['id'], pin_hash.decode('utf-8'))

                    # Update preferences to remove default flag
                    from config.pesadb import build_update, execute_db
                    update_data = {
                        'security_question': user_data.security_question,
                        'security_answer_hash': security_answer_hash,
                        'preferences': json.dumps({"default_currency": "KES", "is_default": False})
                    }
                    sql = build_update('users', update_data, f"id = '{existing_user['id']}'")
                    await execute_db(sql)

                    logger.info("Default user updated successfully")

                    return {
                        "message": "PIN setup successful (default user updated)",
                        "user_id": existing_user['id'],
                        "categories": await db_service.count_categories()
                    }
                else:
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
        user_data_dict = user.dict()
        user_data_dict['created_at'] = user_data_dict['created_at'].isoformat()
        await db_service.create_user(user_data_dict)
        user_id = user.id

        # Create default categories
        default_categories = CategorizationService.get_default_categories()
        categories = []
        for cat_data in default_categories:
            category = Category(**cat_data)
            category_dict = category.dict()
            await db_service.create_category(category_dict)
            categories.append(category)

        return {
            "message": "PIN setup successful",
            "user_id": user_id,
            "categories": len(categories)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting up PIN: {str(e)}", exc_info=True)
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error setting up PIN: {str(e)}")

@router.post("/verify-pin")
async def verify_pin(verify_data: UserVerify):
    """Verify user PIN"""
    try:
        # Get user (for demo, get the first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found. Please setup PIN first.")
        
        # Verify PIN
        stored_hash = user_doc["pin_hash"].encode('utf-8')
        is_valid = bcrypt.checkpw(verify_data.pin.encode('utf-8'), stored_hash)
        
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid PIN")
        
        return {
            "message": "PIN verified successfully",
            "user_id": user_doc["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying PIN: {str(e)}")

@router.get("/user-status")
async def get_user_status():
    """Check if user exists and has PIN setup"""
    try:
        user_doc = await db_service.get_user()
        categories_count = await db_service.count_categories()

        return {
            "has_user": user_doc is not None,
            "user_id": user_doc["id"] if user_doc else None,
            "categories_count": categories_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking user status: {str(e)}")

@router.get("/security-question")
async def get_security_question():
    """Get the security question for PIN reset"""
    try:
        user_doc = await db_service.get_user()
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
async def verify_security_answer(verify_data: SecurityAnswerVerify):
    """Verify the security answer for PIN reset"""
    try:
        user_doc = await db_service.get_user()
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
async def reset_pin(reset_data: PINReset):
    """Reset user PIN after security verification"""
    try:
        user_doc = await db_service.get_user()
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
        await db_service.update_user_pin(
            user_doc["id"],
            new_pin_hash.decode('utf-8')
        )

        return {
            "message": "PIN reset successful"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting PIN: {str(e)}")
