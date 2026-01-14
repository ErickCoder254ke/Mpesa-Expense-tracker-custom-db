from fastapi import APIRouter, HTTPException
from models.user import Category, CategoryCreate
from services.pesadb_service import db_service
from typing import List

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=List[Category])
async def get_categories():
    """Get all categories"""
    try:
        categories_docs = await db_service.get_categories(limit=100)
        categories = []
        for doc in categories_docs:
            categories.append(Category(**doc))
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")

@router.post("/", response_model=Category)
async def create_category(category_data: CategoryCreate):
    """Create a new category"""
    try:
        category = Category(**category_data.dict(), is_default=False)
        category_dict = category.dict()
        await db_service.create_category(category_dict)
        return category
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating category: {str(e)}")

@router.delete("/{category_id}")
async def delete_category(category_id: str):
    """Delete a category (only non-default categories)"""
    try:
        # Check if category exists and is not default
        category_doc = await db_service.get_category_by_id(category_id)
        if not category_doc:
            raise HTTPException(status_code=404, detail="Category not found")
        
        if category_doc.get("is_default", True):
            raise HTTPException(status_code=400, detail="Cannot delete default category")
        
        # Check if category is being used by transactions
        # Note: We need to get user_id, but for single-user app we can check all transactions
        transaction_count = await db_service.count_transactions(user_id="", category_id=category_id)
        if transaction_count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete category with existing transactions")
        
        # Delete category
        await db_service.delete_category(category_id)
        
        return {"message": "Category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting category: {str(e)}")
