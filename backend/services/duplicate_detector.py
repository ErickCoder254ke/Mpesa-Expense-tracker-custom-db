from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from services.pesadb_service import db_service
import hashlib

class DuplicateDetector:
    """
    Service to detect and prevent duplicate M-Pesa transactions from SMS parsing
    Migrated to use PesaDBService instead of MongoDB
    """
    
    @staticmethod
    async def is_duplicate_by_hash(message_hash: str) -> bool:
        """
        Check if a transaction with the same message hash already exists
        """
        existing = await db_service.get_transaction_by_message_hash(message_hash)
        return existing is not None
    
    @staticmethod
    async def is_duplicate_by_transaction_id(transaction_id: str) -> bool:
        """
        Check if a transaction with the same M-Pesa transaction ID already exists
        """
        if not transaction_id:
            return False
            
        existing = await db_service.get_transaction_by_mpesa_id(transaction_id)
        return existing is not None
    
    @staticmethod
    async def find_similar_transactions(
        amount: float, 
        user_id: str,
        time_window_hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Find transactions with similar amount within a time window
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=time_window_hours)
        cutoff_str = cutoff_time.isoformat()
        
        # Find transactions with same amount (+/- 1 KSh for rounding)
        similar_transactions = await db_service.get_similar_transactions(
            user_id=user_id,
            amount=amount,
            cutoff_time=cutoff_str,
            limit=50
        )
        
        return similar_transactions
    
    @staticmethod
    async def check_comprehensive_duplicate(
        user_id: str,
        amount: float,
        transaction_id: Optional[str] = None,
        message_hash: Optional[str] = None,
        recipient: Optional[str] = None,
        time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Comprehensive duplicate check using multiple criteria
        """
        duplicate_reasons = []
        confidence = 0.0
        
        # Check by message hash (highest confidence)
        if message_hash and await DuplicateDetector.is_duplicate_by_hash(message_hash):
            duplicate_reasons.append("exact_message_match")
            confidence = 1.0
        
        # Check by transaction ID (high confidence)
        if transaction_id and await DuplicateDetector.is_duplicate_by_transaction_id(transaction_id):
            duplicate_reasons.append("transaction_id_match")
            confidence = max(confidence, 0.9)
        
        # Check for similar transactions (lower confidence)
        similar_transactions = await DuplicateDetector.find_similar_transactions(
            amount, user_id, time_window_hours
        )
        
        if similar_transactions:
            # Check for exact amount and recipient match
            for transaction in similar_transactions:
                mpesa_details = transaction.get("mpesa_details", {})
                if isinstance(mpesa_details, dict):
                    if (transaction.get("amount") == amount and 
                        mpesa_details.get("recipient") == recipient):
                        duplicate_reasons.append("amount_recipient_match")
                        confidence = max(confidence, 0.7)
                        break
            
            # If no exact match, but similar amounts exist
            if not duplicate_reasons and len(similar_transactions) > 0:
                duplicate_reasons.append("similar_amount_recent")
                confidence = max(confidence, 0.3)
        
        return {
            "is_duplicate": len(duplicate_reasons) > 0 and confidence >= 0.7,
            "confidence": confidence,
            "reasons": duplicate_reasons,
            "similar_transactions": similar_transactions[:5]  # Return top 5 for review
        }
    
    @staticmethod
    def calculate_similarity_score(transaction1: Dict[str, Any], transaction2: Dict[str, Any]) -> float:
        """
        Calculate similarity score between two transactions (0.0 - 1.0)
        """
        score = 0.0
        
        # Amount similarity (40% weight)
        amount1 = transaction1.get("amount", 0)
        amount2 = transaction2.get("amount", 0)
        if amount1 > 0 and amount2 > 0:
            amount_diff = abs(amount1 - amount2)
            amount_similarity = max(0, 1 - (amount_diff / max(amount1, amount2)))
            score += amount_similarity * 0.4
        
        # Recipient similarity (30% weight)
        mpesa1 = transaction1.get("mpesa_details", {})
        mpesa2 = transaction2.get("mpesa_details", {})
        recipient1 = mpesa1.get("recipient", "") if isinstance(mpesa1, dict) else ""
        recipient2 = mpesa2.get("recipient", "") if isinstance(mpesa2, dict) else ""
        if recipient1 and recipient2:
            recipient_similarity = DuplicateDetector._string_similarity(recipient1, recipient2)
            score += recipient_similarity * 0.3
        
        # Time proximity (20% weight)
        time1 = transaction1.get("created_at")
        time2 = transaction2.get("created_at")
        if time1 and time2:
            # Convert to datetime if string
            if isinstance(time1, str):
                time1 = datetime.fromisoformat(time1.replace('Z', '+00:00'))
            if isinstance(time2, str):
                time2 = datetime.fromisoformat(time2.replace('Z', '+00:00'))
            
            time_diff = abs((time1 - time2).total_seconds())
            time_similarity = max(0, 1 - (time_diff / (24 * 3600)))  # 24 hour window
            score += time_similarity * 0.2
        
        # Transaction ID similarity (10% weight)
        txn_id1 = mpesa1.get("transaction_id", "") if isinstance(mpesa1, dict) else ""
        txn_id2 = mpesa2.get("transaction_id", "") if isinstance(mpesa2, dict) else ""
        if txn_id1 and txn_id2:
            id_similarity = 1.0 if txn_id1 == txn_id2 else 0.0
            score += id_similarity * 0.1
        
        return score
    
    @staticmethod
    def _string_similarity(str1: str, str2: str) -> float:
        """
        Calculate string similarity using simple character overlap
        """
        if not str1 or not str2:
            return 0.0
        
        str1 = str1.lower().strip()
        str2 = str2.lower().strip()
        
        if str1 == str2:
            return 1.0
        
        # Simple Jaccard similarity
        set1 = set(str1.split())
        set2 = set(str2.split())
        
        if not set1 or not set2:
            return 0.0
        
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        return intersection / union if union > 0 else 0.0
    
    @staticmethod
    async def log_duplicate_attempt(
        user_id: str,
        message_hash: str,
        duplicate_info: Dict[str, Any]
    ):
        """
        Log duplicate detection attempt for analysis
        """
        log_entry = {
            "id": f"dup_{datetime.utcnow().timestamp()}_{message_hash[:8]}",
            "user_id": user_id,
            "message_hash": message_hash,
            "duplicate_confidence": duplicate_info["confidence"],
            "duplicate_reasons": ",".join(duplicate_info["reasons"]),  # Store as comma-separated string
            "detected_at": datetime.utcnow().isoformat(),
            "action_taken": "blocked" if duplicate_info["is_duplicate"] else "allowed"
        }
        
        await db_service.create_duplicate_log(log_entry)
    
    @staticmethod
    async def get_duplicate_statistics(
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get duplicate detection statistics for a user
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        cutoff_str = cutoff_date.isoformat()
        
        # Count duplicates blocked
        duplicates_blocked = await db_service.count_duplicate_logs(user_id)
        
        # Count SMS transactions processed
        from config.pesadb import query_db
        sms_result = await query_db(f"""
        SELECT COUNT(1) as count FROM transactions
        WHERE user_id = '{user_id}'
        AND source = 'sms'
        AND created_at >= '{cutoff_str}'
        """)
        sms_transactions = sms_result[0]['count'] if sms_result else 0
        
        # Get common duplicate reasons
        reasons_result = await query_db(f"""
        SELECT duplicate_reasons, COUNT(1) as count
        FROM duplicate_logs
        WHERE user_id = '{user_id}'
        AND detected_at >= '{cutoff_str}'
        AND action_taken = 'blocked'
        GROUP BY duplicate_reasons
        ORDER BY count DESC
        LIMIT 10
        """)
        
        # Parse comma-separated reasons
        duplicate_reasons = []
        for row in reasons_result:
            reasons_str = row.get('duplicate_reasons', '')
            count = row.get('count', 0)
            if reasons_str:
                for reason in reasons_str.split(','):
                    duplicate_reasons.append({"_id": reason.strip(), "count": count})
        
        return {
            "duplicates_blocked": duplicates_blocked,
            "sms_transactions_processed": sms_transactions,
            "duplicate_rate": duplicates_blocked / max(sms_transactions + duplicates_blocked, 1),
            "common_duplicate_reasons": duplicate_reasons
        }
    
    @staticmethod
    def hash_message(message: str) -> str:
        """
        Create a hash of the message for duplicate detection
        """
        return hashlib.sha256(message.encode()).hexdigest()
