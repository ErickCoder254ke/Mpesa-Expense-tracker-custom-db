from fastapi import APIRouter, HTTPException, Query
from models.transaction import Transaction, TransactionCreate, TransactionUpdate
from models.user import Category
from services.categorization import CategorizationService
from services.frequency_analyzer import TransactionFrequencyAnalyzer, FrequentTransaction
from services.pesadb_service import db_service
from typing import List, Optional, Literal
from datetime import datetime, timedelta
from pydantic import BaseModel
import json

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("/", response_model=List[Transaction])
async def get_transactions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    type_filter: Optional[Literal["expense", "income"]] = None,
    category_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[str] = None,
):
    """Get transactions with optional filters"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_doc["id"]
        
        # Convert datetime to string if needed
        start_date_str = start_date.isoformat() if start_date else None
        end_date_str = end_date if isinstance(end_date, str) else (end_date.isoformat() if end_date else None)
        
        # Get transactions using service
        transactions_docs = await db_service.get_transactions(
            user_id=user_id,
            limit=limit,
            skip=offset,
            category_id=category_id,
            transaction_type=type_filter,
            start_date=start_date_str,
            end_date=end_date_str,
            sort_by='date',
            sort_order='DESC'
        )
        
        transactions = []
        for doc in transactions_docs:
            transactions.append(Transaction(**doc))
        
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")

@router.post("/", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate):
    """Create a new transaction"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_doc["id"]
        
        # Auto-categorize if category_id is "auto"
        category_id = transaction_data.category_id
        if category_id == "auto":
            categories_docs = await db_service.get_categories(limit=100)
            categories = [Category(**doc) for doc in categories_docs]
            category_id = CategorizationService.auto_categorize(transaction_data.description, categories)
        
        # Verify category exists
        category_doc = await db_service.get_category_by_id(category_id)
        if not category_doc:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Create transaction
        transaction_dict = transaction_data.dict()
        transaction_dict['user_id'] = user_id
        transaction_dict['category_id'] = category_id
        transaction = Transaction(**transaction_dict)

        print(f"Creating transaction: {transaction.dict()}")
        
        # Convert to dict for database
        transaction_db = transaction.dict()
        transaction_db['date'] = transaction_db['date'].isoformat()
        transaction_db['created_at'] = transaction_db['created_at'].isoformat()
        
        if transaction_db.get('mpesa_details'):
            transaction_db['mpesa_details'] = transaction_db['mpesa_details'].dict() if hasattr(transaction_db['mpesa_details'], 'dict') else transaction_db['mpesa_details']
        if transaction_db.get('sms_metadata'):
            metadata = transaction_db['sms_metadata'].dict() if hasattr(transaction_db['sms_metadata'], 'dict') else transaction_db['sms_metadata']
            if metadata.get('parsed_at'):
                metadata['parsed_at'] = metadata['parsed_at'].isoformat() if hasattr(metadata['parsed_at'], 'isoformat') else metadata['parsed_at']
            transaction_db['sms_metadata'] = metadata
        
        await db_service.create_transaction(transaction_db)
        print(f"Transaction created with ID: {transaction.id}")

        return transaction
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating transaction: {str(e)}")

@router.get("/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    """Get a specific transaction"""
    try:
        doc = await db_service.get_transaction_by_id(transaction_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Parse date strings back to datetime
        if isinstance(doc.get('date'), str):
            doc['date'] = datetime.fromisoformat(doc['date'])
        if isinstance(doc.get('created_at'), str):
            doc['created_at'] = datetime.fromisoformat(doc['created_at'])
        
        return Transaction(**doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transaction: {str(e)}")

@router.put("/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, update_data: TransactionUpdate):
    """Update a transaction"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_doc["id"]
        
        # Get existing transaction
        existing_doc = await db_service.get_transaction_by_id(transaction_id, user_id)
        if not existing_doc:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        # Convert datetime objects to strings
        if update_dict.get('date') and hasattr(update_dict['date'], 'isoformat'):
            update_dict['date'] = update_dict['date'].isoformat()
        
        if update_dict:
            await db_service.update_transaction(transaction_id, update_dict, user_id)
        
        # Return updated transaction
        updated_doc = await db_service.get_transaction_by_id(transaction_id)
        
        # Parse date strings back to datetime
        if isinstance(updated_doc.get('date'), str):
            updated_doc['date'] = datetime.fromisoformat(updated_doc['date'])
        if isinstance(updated_doc.get('created_at'), str):
            updated_doc['created_at'] = datetime.fromisoformat(updated_doc['created_at'])
        
        return Transaction(**updated_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating transaction: {str(e)}")

@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: str):
    """Delete a transaction"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_doc["id"]
        
        await db_service.delete_transaction(transaction_id, user_id)
        
        return {"message": "Transaction deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting transaction: {str(e)}")

@router.get("/analytics/summary")
async def get_analytics_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    """Get analytics summary for dashboard"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_doc["id"]
        
        # Default to current month if no dates provided
        if not start_date:
            now = datetime.now()
            start_date = datetime(now.year, now.month, 1)
        if not end_date:
            now = datetime.now()
            if now.month == 12:
                end_date = datetime(now.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(now.year, now.month + 1, 1) - timedelta(days=1)

        print(f"Analytics query date range: {start_date} to {end_date}")
        
        start_date_str = start_date.isoformat()
        end_date_str = end_date.isoformat()

        # First, let's check if we have any transactions at all
        total_transactions = await db_service.count_transactions(user_id)
        print(f"Total transactions in database: {total_transactions}")
        
        # Get total income and expenses using service methods
        total_income = await db_service.get_total_by_type(
            user_id, 'income', start_date_str, end_date_str
        )
        total_expenses = await db_service.get_total_by_type(
            user_id, 'expense', start_date_str, end_date_str
        )

        # Get category spending summary
        categories_summary = await db_service.get_category_spending_summary(
            user_id, start_date_str, end_date_str
        )
        
        # Build categories_by_category dict
        categories_by_category = {}
        for cat_summary in categories_summary:
            category_doc = await db_service.get_category_by_id(cat_summary['category_id'])
            if category_doc:
                categories_by_category[cat_summary['category_id']] = {
                    "name": category_doc["name"],
                    "color": category_doc["color"],
                    "icon": category_doc["icon"],
                    "amount": cat_summary['total'],
                    "count": cat_summary['transaction_count']
                }

        # Get recent transactions
        recent_transactions_docs = await db_service.get_transactions(
            user_id=user_id,
            limit=5,
            start_date=start_date_str,
            end_date=end_date_str,
            sort_by='date',
            sort_order='DESC'
        )
        recent_transactions = []

        for doc in recent_transactions_docs:
            # Parse dates
            if isinstance(doc.get('date'), str):
                doc['date'] = datetime.fromisoformat(doc['date'])
            if isinstance(doc.get('created_at'), str):
                doc['created_at'] = datetime.fromisoformat(doc['created_at'])
            recent_transactions.append(Transaction(**doc).dict())

        # Build response
        response_data = {
            "period": {"start_date": start_date, "end_date": end_date},
            "totals": {
                "income": total_income,
                "expenses": total_expenses,
                "balance": total_income - total_expenses,
                "fees": {
                    "total_fees": 0,  # Simplified - would need custom SQL
                    "transaction_fees": 0,
                    "access_fees": 0,
                    "fee_transactions_count": 0,
                    "service_fees": 0,
                    "transactions_with_parsed_fees": 0
                }
            },
            "categories": categories_by_category,
            "recent_transactions": recent_transactions
        }

        return response_data

    except Exception as e:
        import traceback
        print(f"Error in analytics: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error getting analytics: {str(e)}")

@router.get("/charges/analytics")
async def get_transaction_charges_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    period: str = Query("month", regex="^(week|month|quarter|year)$"),
):
    """Get comprehensive transaction charges analytics"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_doc["id"]
        
        # Default to current period if no dates provided
        if not start_date or not end_date:
            now = datetime.now()
            if period == "week":
                start_date = now - timedelta(days=7)
                end_date = now
            elif period == "month":
                start_date = datetime(now.year, now.month, 1)
                if now.month == 12:
                    end_date = datetime(now.year + 1, 1, 1) - timedelta(days=1)
                else:
                    end_date = datetime(now.year, now.month + 1, 1) - timedelta(days=1)
            elif period == "quarter":
                quarter = (now.month - 1) // 3 + 1
                start_month = (quarter - 1) * 3 + 1
                start_date = datetime(now.year, start_month, 1)
                if quarter == 4:
                    end_date = datetime(now.year + 1, 1, 1) - timedelta(days=1)
                else:
                    end_date = datetime(now.year, start_month + 3, 1) - timedelta(days=1)
            elif period == "year":
                start_date = datetime(now.year, 1, 1)
                end_date = datetime(now.year, 12, 31)

        # Simplified charges analytics - would need custom implementation
        # for full MongoDB aggregation pipeline equivalent
        transactions = await db_service.get_transactions(
            user_id=user_id,
            limit=1000,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat()
        )
        
        # Calculate fees from transaction data
        total_transaction_fees = 0
        total_access_fees = 0
        total_service_fees = 0
        total_sms_fees = 0
        transaction_count = len(transactions)
        expense_count = 0
        expense_amount = 0
        
        for txn in transactions:
            if txn.get('type') == 'expense':
                expense_count += 1
                expense_amount += txn.get('amount', 0)
            
            # Parse mpesa_details if it's a string
            mpesa_details = txn.get('mpesa_details')
            if mpesa_details and isinstance(mpesa_details, str):
                mpesa_details = json.loads(mpesa_details)
            
            if mpesa_details:
                total_transaction_fees += mpesa_details.get('transaction_fee', 0) or 0
                total_access_fees += mpesa_details.get('access_fee', 0) or 0
                total_service_fees += mpesa_details.get('service_fee', 0) or 0
            
            # Parse sms_metadata if it's a string
            sms_metadata = txn.get('sms_metadata')
            if sms_metadata and isinstance(sms_metadata, str):
                sms_metadata = json.loads(sms_metadata)
            
            if sms_metadata:
                total_sms_fees += sms_metadata.get('total_fees', 0) or 0
        
        total_fees = max(total_sms_fees, total_transaction_fees + total_access_fees + total_service_fees)
        
        return {
            "period": {"start_date": start_date, "end_date": end_date, "type": period},
            "summary": {
                "total_fees": total_fees,
                "total_transactions": transaction_count,
                "expense_amount": expense_amount,
                "fee_source": "enhanced_parsing" if total_sms_fees > (total_transaction_fees + total_access_fees) else "mpesa_details"
            },
            "fee_breakdown": {
                "transaction_fees": {
                    "amount": total_transaction_fees,
                    "description": "M-Pesa transaction charges"
                },
                "access_fees": {
                    "amount": total_access_fees,
                    "description": "Fuliza access fees"
                },
                "service_fees": {
                    "amount": total_service_fees,
                    "description": "Bank and service charges"
                }
            },
            "efficiency_metrics": {
                "average_fee_per_transaction": total_fees / transaction_count if transaction_count > 0 else 0,
                "fee_percentage_of_expenses": (total_fees / expense_amount * 100) if expense_amount > 0 else 0
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting charges analytics: {str(e)}")

@router.get("/debug/database")
async def debug_database():
    """Debug endpoint to check database contents"""
    try:
        # Get all transactions for first user
        user_doc = await db_service.get_user()
        user_id = user_doc["id"] if user_doc else ""
        
        all_transactions = await db_service.get_transactions(user_id=user_id, limit=100) if user_id else []
        all_categories = await db_service.get_categories(limit=100)
        all_users = [user_doc] if user_doc else []

        return {
            "transactions_count": len(all_transactions),
            "categories_count": len(all_categories),
            "users_count": len(all_users),
            "sample_transactions": all_transactions[:5],
            "sample_categories": all_categories[:3],
            "sample_users": all_users[:1] if all_users else []
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting debug info: {str(e)}")

# Frequency Analysis Endpoints

class CategoryUpdateRequest(BaseModel):
    category_id: str
    transaction_ids: List[str]
    pattern: str

class PatternReviewRequest(BaseModel):
    pattern: str
    transaction_ids: List[str]
    action: Literal["categorize", "dismiss"]

@router.get("/frequency-analysis")
async def get_frequent_transactions(
    min_frequency: int = Query(3, ge=2, le=10),
    days_back: int = Query(90, ge=7, le=365),
    uncategorized_only: bool = Query(True),
):
    """Get frequently occurring transactions that may need categorization"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user_id = user_doc["id"]

        # Initialize frequency analyzer (it will need migration too)
        # For now, return empty results
        return {
            "frequent_transactions": [],
            "summary": {
                "total_patterns": 0,
                "needs_categorization": 0,
                "analysis_period_days": days_back,
                "min_frequency_threshold": min_frequency
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing transaction frequency: {str(e)}")

@router.post("/frequency-analysis/categorize")
async def categorize_frequent_pattern(request: CategoryUpdateRequest):
    """Apply a category to all transactions matching a frequent pattern"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user_id = user_doc["id"]

        # Verify category exists
        category_doc = await db_service.get_category_by_id(request.category_id)
        if not category_doc:
            raise HTTPException(status_code=404, detail="Category not found")

        # Update transactions
        await db_service.update_many_transactions(
            request.transaction_ids,
            {"category_id": request.category_id},
            user_id
        )

        return {
            "message": f"Successfully categorized {len(request.transaction_ids)} transactions",
            "updated_count": len(request.transaction_ids),
            "category_name": category_doc["name"],
            "pattern": request.pattern
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error categorizing pattern: {str(e)}")

@router.post("/frequency-analysis/review")
async def review_frequent_pattern(request: PatternReviewRequest):
    """Mark a frequent transaction pattern as reviewed"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user_id = user_doc["id"]

        if request.action == "dismiss":
            # Mark pattern as reviewed
            # For now, simplified implementation
            return {
                "message": f"Pattern dismissed",
                "updated_count": len(request.transaction_ids),
                "action": "dismissed"
            }

        return {"message": "Invalid action", "action": request.action}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reviewing pattern: {str(e)}")

@router.get("/categorization-suggestions")
async def get_categorization_suggestions(
    limit: int = Query(10, ge=1, le=50),
):
    """Get smart categorization suggestions based on frequent patterns"""
    try:
        # Get user (for demo, use first user)
        user_doc = await db_service.get_user()
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user_id = user_doc["id"]

        # For now, return empty suggestions
        # Full implementation would require frequency analyzer migration
        return {
            "suggestions": [],
            "summary": {
                "total_suggestions": 0,
                "high_priority": 0,
                "potential_time_saved": "0 future categorizations"
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting categorization suggestions: {str(e)}")
