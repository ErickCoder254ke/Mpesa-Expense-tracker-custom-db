"""
PesaDB Service Layer

This module provides a service layer for all database operations,
replacing MongoDB operations with PesaDB SQL queries.
"""

import json
import hashlib
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
from config.pesadb import query_db, execute_db, escape_string, build_insert, build_update, build_delete
from config.pesadb_fallbacks import count_rows_safe, sum_safe, avg_safe, aggregate_safe


def is_table_not_found_error(error: Exception) -> bool:
    """Check if an error is related to a missing table"""
    error_msg = str(error).lower()
    return (
        "table" in error_msg and "does not exist" in error_msg
    ) or "tablenotfound" in error_msg or "no such table" in error_msg


class PesaDBService:
    """Service class for PesaDB operations"""
    
    # ==================== USER OPERATIONS ====================
    
    @staticmethod
    async def get_user_count() -> int:
        """Get total number of users"""
        try:
            # Use safe count with automatic fallback
            return await count_rows_safe('users', query_func=query_db)
        except Exception as e:
            if is_table_not_found_error(e):
                return 0
            raise

    @staticmethod
    async def get_user() -> Optional[Dict[str, Any]]:
        """Get the first user (single-user app)"""
        try:
            result = await query_db("SELECT * FROM users LIMIT 1")
            return result[0] if result else None
        except Exception as e:
            if is_table_not_found_error(e):
                # Table doesn't exist yet - return None
                return None
            raise

    @staticmethod
    async def get_all_users() -> List[Dict[str, Any]]:
        """Get all users"""
        try:
            result = await query_db("SELECT * FROM users")
            return result if result else []
        except Exception as e:
            if is_table_not_found_error(e):
                return []
            raise

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            result = await query_db(f"SELECT * FROM users WHERE id = '{user_id}' LIMIT 1")
            return result[0] if result else None
        except Exception as e:
            if is_table_not_found_error(e):
                return None
            raise

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email address

        Note: Emails are stored in lowercase, so we normalize the query email to lowercase.
        PesaDB doesn't support LOWER() function, so we rely on lowercase storage.
        """
        try:
            # Normalize email to lowercase (emails are stored lowercase)
            normalized_email = email.lower()
            email_escaped = escape_string(normalized_email)

            # Simple equality check (no LOWER function needed since stored lowercase)
            result = await query_db(f"SELECT * FROM users WHERE email = {email_escaped} LIMIT 1")
            return result[0] if result else None
        except Exception as e:
            if is_table_not_found_error(e):
                return None
            raise
    
    @staticmethod
    async def create_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        sql = build_insert('users', user_data)
        await execute_db(sql)
        return user_data
    
    @staticmethod
    async def update_user_password(user_id: str, new_password_hash: str) -> bool:
        """Update user's password hash"""
        sql = build_update('users', {'password_hash': new_password_hash}, f"id = '{user_id}'")
        await execute_db(sql)
        return True
    
    # ==================== CATEGORY OPERATIONS ====================
    
    @staticmethod
    async def get_categories(limit: int = 100) -> List[Dict[str, Any]]:
        """Get all categories"""
        result = await query_db(f"SELECT * FROM categories LIMIT {limit}")
        # Parse JSON fields
        for cat in result:
            if 'keywords' in cat and isinstance(cat['keywords'], str):
                cat['keywords'] = json.loads(cat['keywords'])
        return result
    
    @staticmethod
    async def get_category_by_id(category_id: str) -> Optional[Dict[str, Any]]:
        """Get a category by ID"""
        result = await query_db(f"SELECT * FROM categories WHERE id = '{category_id}' LIMIT 1")
        if result:
            cat = result[0]
            if 'keywords' in cat and isinstance(cat['keywords'], str):
                cat['keywords'] = json.loads(cat['keywords'])
            return cat
        return None
    
    @staticmethod
    async def create_category(category_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new category"""
        # Ensure keywords is JSON string
        if 'keywords' in category_data and isinstance(category_data['keywords'], list):
            category_data['keywords'] = json.dumps(category_data['keywords'])
        
        sql = build_insert('categories', category_data)
        await execute_db(sql)
        return category_data
    
    @staticmethod
    async def delete_category(category_id: str) -> bool:
        """Delete a category"""
        sql = build_delete('categories', f"id = '{category_id}'")
        await execute_db(sql)
        return True
    
    @staticmethod
    async def count_categories() -> int:
        """Count total categories"""
        try:
            return await count_rows_safe('categories', query_func=query_db)
        except Exception as e:
            if is_table_not_found_error(e):
                return 0
            raise
    
    # ==================== TRANSACTION OPERATIONS ====================
    
    @staticmethod
    async def get_transactions(
        user_id: str,
        limit: int = 100,
        skip: int = 0,
        category_id: Optional[str] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        sort_by: str = 'date',
        sort_order: str = 'DESC'
    ) -> List[Dict[str, Any]]:
        """Get transactions with filters"""
        
        where_clauses = [f"user_id = '{user_id}'"]
        
        if category_id:
            where_clauses.append(f"category_id = '{category_id}'")
        
        if transaction_type:
            where_clauses.append(f"type = '{transaction_type}'")
        
        if start_date:
            where_clauses.append(f"date >= '{start_date}'")
        
        if end_date:
            where_clauses.append(f"date <= '{end_date}'")
        
        where_clause = ' AND '.join(where_clauses)
        
        sql = f"""
        SELECT * FROM transactions
        WHERE {where_clause}
        ORDER BY {sort_by} {sort_order}
        LIMIT {limit} OFFSET {skip}
        """
        
        result = await query_db(sql)

        # Parse JSON fields
        for txn in result:
            if 'mpesa_details' in txn and txn['mpesa_details'] and isinstance(txn['mpesa_details'], str):
                # Handle 'null' string or valid JSON
                if txn['mpesa_details'] == 'null':
                    txn['mpesa_details'] = None
                else:
                    txn['mpesa_details'] = json.loads(txn['mpesa_details'])
            if 'sms_metadata' in txn and txn['sms_metadata'] and isinstance(txn['sms_metadata'], str):
                # Handle 'null' string or valid JSON
                if txn['sms_metadata'] == 'null':
                    txn['sms_metadata'] = None
                else:
                    txn['sms_metadata'] = json.loads(txn['sms_metadata'])

        return result
    
    @staticmethod
    async def get_transaction_by_id(transaction_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get a single transaction by ID"""
        where_clause = f"id = '{transaction_id}'"
        if user_id:
            where_clause += f" AND user_id = '{user_id}'"
        
        result = await query_db(f"SELECT * FROM transactions WHERE {where_clause} LIMIT 1")
        
        if result:
            txn = result[0]
            if 'mpesa_details' in txn and txn['mpesa_details'] and isinstance(txn['mpesa_details'], str):
                # Handle 'null' string or valid JSON
                if txn['mpesa_details'] == 'null':
                    txn['mpesa_details'] = None
                else:
                    txn['mpesa_details'] = json.loads(txn['mpesa_details'])
            if 'sms_metadata' in txn and txn['sms_metadata'] and isinstance(txn['sms_metadata'], str):
                # Handle 'null' string or valid JSON
                if txn['sms_metadata'] == 'null':
                    txn['sms_metadata'] = None
                else:
                    txn['sms_metadata'] = json.loads(txn['sms_metadata'])
            return txn
        return None
    
    @staticmethod
    async def create_transaction(transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new transaction"""
        # Ensure all required columns exist with proper defaults
        # PesaDB requires ALL columns to be present in INSERT statements
        # IMPORTANT: PesaDB STRING columns don't accept NULL - use 'null' (JSON null) instead

        # Convert nested objects to JSON strings or set to 'null' for empty values
        if 'mpesa_details' in transaction_data:
            if transaction_data['mpesa_details']:
                transaction_data['mpesa_details'] = json.dumps(transaction_data['mpesa_details'])
            else:
                # Use JSON null value as string (PesaDB STRING columns don't accept SQL NULL)
                transaction_data['mpesa_details'] = 'null'
        else:
            # If not provided, use JSON null value as string
            transaction_data['mpesa_details'] = 'null'

        if 'sms_metadata' in transaction_data:
            if transaction_data['sms_metadata']:
                transaction_data['sms_metadata'] = json.dumps(transaction_data['sms_metadata'])
            else:
                # Use JSON null value as string (PesaDB STRING columns don't accept SQL NULL)
                transaction_data['sms_metadata'] = 'null'
        else:
            # If not provided, use JSON null value as string
            transaction_data['sms_metadata'] = 'null'

        sql = build_insert('transactions', transaction_data)
        await execute_db(sql)
        return transaction_data
    
    @staticmethod
    async def update_transaction(transaction_id: str, update_data: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """Update a transaction"""
        # Convert nested objects to JSON strings or remove None values
        if 'mpesa_details' in update_data:
            if update_data['mpesa_details']:
                update_data['mpesa_details'] = json.dumps(update_data['mpesa_details'])
            else:
                # Remove None/null values - PesaDB doesn't handle None well for JSON columns
                del update_data['mpesa_details']

        if 'sms_metadata' in update_data:
            if update_data['sms_metadata']:
                update_data['sms_metadata'] = json.dumps(update_data['sms_metadata'])
            else:
                # Remove None/null values - PesaDB doesn't handle None well for JSON columns
                del update_data['sms_metadata']

        where_clause = f"id = '{transaction_id}'"
        if user_id:
            where_clause += f" AND user_id = '{user_id}'"

        sql = build_update('transactions', update_data, where_clause)
        await execute_db(sql)
        return True
    
    @staticmethod
    async def delete_transaction(transaction_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a transaction"""
        where_clause = f"id = '{transaction_id}'"
        if user_id:
            where_clause += f" AND user_id = '{user_id}'"
        
        sql = build_delete('transactions', where_clause)
        await execute_db(sql)
        return True
    
    @staticmethod
    async def count_transactions(user_id: str, category_id: Optional[str] = None) -> int:
        """Count transactions"""
        where_clause = f"user_id = '{user_id}'"
        if category_id:
            where_clause += f" AND category_id = '{category_id}'"

        try:
            return await count_rows_safe('transactions', where_clause, query_func=query_db)
        except Exception as e:
            if is_table_not_found_error(e):
                return 0
            raise
    
    @staticmethod
    async def get_transaction_by_message_hash(message_hash: str) -> Optional[Dict[str, Any]]:
        """Find transaction by SMS message hash (for duplicate detection)"""
        # Note: This requires JSON querying which may vary by SQL dialect
        # For PesaDB, we'll use a simple LIKE query
        result = await query_db(f"""
        SELECT * FROM transactions
        WHERE sms_metadata LIKE '%"original_message_hash": "{message_hash}"%'
        LIMIT 1
        """)
        
        if result:
            txn = result[0]
            if 'sms_metadata' in txn and txn['sms_metadata'] and isinstance(txn['sms_metadata'], str):
                # Handle 'null' string or valid JSON
                if txn['sms_metadata'] == 'null':
                    txn['sms_metadata'] = None
                else:
                    txn['sms_metadata'] = json.loads(txn['sms_metadata'])
            return txn
        return None
    
    @staticmethod
    async def get_transaction_by_mpesa_id(mpesa_transaction_id: str) -> Optional[Dict[str, Any]]:
        """Find transaction by M-Pesa transaction ID"""
        result = await query_db(f"""
        SELECT * FROM transactions
        WHERE mpesa_details LIKE '%"transaction_id": "{mpesa_transaction_id}"%'
        LIMIT 1
        """)
        
        if result:
            txn = result[0]
            if 'mpesa_details' in txn and txn['mpesa_details'] and isinstance(txn['mpesa_details'], str):
                # Handle 'null' string or valid JSON
                if txn['mpesa_details'] == 'null':
                    txn['mpesa_details'] = None
                else:
                    txn['mpesa_details'] = json.loads(txn['mpesa_details'])
            return txn
        return None
    
    @staticmethod
    async def get_similar_transactions(
        user_id: str,
        amount: float,
        cutoff_time: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Find similar transactions (for duplicate detection)"""
        amount_min = amount - 1
        amount_max = amount + 1

        result = await query_db(f"""
        SELECT * FROM transactions
        WHERE user_id = '{user_id}'
          AND amount BETWEEN {amount_min} AND {amount_max}
          AND created_at >= '{cutoff_time}'
        LIMIT {limit}
        """)
        
        # Parse JSON fields
        for txn in result:
            if 'mpesa_details' in txn and txn['mpesa_details'] and isinstance(txn['mpesa_details'], str):
                # Handle 'null' string or valid JSON
                if txn['mpesa_details'] == 'null':
                    txn['mpesa_details'] = None
                else:
                    txn['mpesa_details'] = json.loads(txn['mpesa_details'])
            if 'sms_metadata' in txn and txn['sms_metadata'] and isinstance(txn['sms_metadata'], str):
                # Handle 'null' string or valid JSON
                if txn['sms_metadata'] == 'null':
                    txn['sms_metadata'] = None
                else:
                    txn['sms_metadata'] = json.loads(txn['sms_metadata'])

        return result
    
    @staticmethod
    async def update_many_transactions(transaction_ids: List[str], update_data: Dict[str, Any], user_id: str) -> bool:
        """Update multiple transactions"""
        if not transaction_ids:
            return True
        
        # Convert nested objects to JSON strings
        if 'sms_metadata' in update_data and update_data['sms_metadata']:
            update_data['sms_metadata'] = json.dumps(update_data['sms_metadata'])
        
        # Build update for multiple IDs
        ids_str = "', '".join(transaction_ids)
        where_clause = f"id IN ('{ids_str}') AND user_id = '{user_id}'"
        
        sql = build_update('transactions', update_data, where_clause)
        await execute_db(sql)
        return True
    
    # ==================== BUDGET OPERATIONS ====================
    
    @staticmethod
    async def get_budgets(
        user_id: str,
        month: Optional[int] = None,
        year: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get budgets with optional filters"""
        where_clauses = [f"user_id = '{user_id}'"]
        
        if month is not None:
            where_clauses.append(f"month = {month}")
        
        if year is not None:
            where_clauses.append(f"year = {year}")
        
        where_clause = ' AND '.join(where_clauses)
        
        result = await query_db(f"""
        SELECT * FROM budgets
        WHERE {where_clause}
        LIMIT {limit}
        """)
        
        return result
    
    @staticmethod
    async def get_budget_by_id(budget_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get a budget by ID"""
        where_clause = f"id = '{budget_id}'"
        if user_id:
            where_clause += f" AND user_id = '{user_id}'"
        
        result = await query_db(f"SELECT * FROM budgets WHERE {where_clause} LIMIT 1")
        return result[0] if result else None
    
    @staticmethod
    async def get_budget_by_category_month(
        user_id: str,
        category_id: str,
        month: int,
        year: int
    ) -> Optional[Dict[str, Any]]:
        """Get a budget for a specific category and month"""
        result = await query_db(f"""
        SELECT * FROM budgets
        WHERE user_id = '{user_id}'
        AND category_id = '{category_id}'
        AND month = {month}
        AND year = {year}
        LIMIT 1
        """)
        return result[0] if result else None
    
    @staticmethod
    async def create_budget(budget_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new budget"""
        sql = build_insert('budgets', budget_data)
        await execute_db(sql)
        return budget_data
    
    @staticmethod
    async def update_budget(budget_id: str, update_data: Dict[str, Any], user_id: Optional[str] = None) -> bool:
        """Update a budget"""
        where_clause = f"id = '{budget_id}'"
        if user_id:
            where_clause += f" AND user_id = '{user_id}'"
        
        sql = build_update('budgets', update_data, where_clause)
        await execute_db(sql)
        return True
    
    @staticmethod
    async def delete_budget(budget_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a budget"""
        where_clause = f"id = '{budget_id}'"
        if user_id:
            where_clause += f" AND user_id = '{user_id}'"
        
        sql = build_delete('budgets', where_clause)
        await execute_db(sql)
        return True
    
    # ==================== SMS IMPORT LOG OPERATIONS ====================
    
    @staticmethod
    async def create_sms_import_log(log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an SMS import log"""
        # Convert lists to JSON strings
        if 'transactions_created' in log_data and isinstance(log_data['transactions_created'], list):
            log_data['transactions_created'] = json.dumps(log_data['transactions_created'])
        if 'errors' in log_data and isinstance(log_data['errors'], list):
            log_data['errors'] = json.dumps(log_data['errors'])
        
        sql = build_insert('sms_import_logs', log_data)
        await execute_db(sql)
        return log_data
    
    @staticmethod
    async def get_sms_import_log(import_session_id: str) -> Optional[Dict[str, Any]]:
        """Get an SMS import log by session ID"""
        result = await query_db(f"""
        SELECT * FROM sms_import_logs
        WHERE import_session_id = '{import_session_id}'
        LIMIT 1
        """)
        
        if result:
            log = result[0]
            if 'transactions_created' in log and isinstance(log['transactions_created'], str):
                log['transactions_created'] = json.loads(log['transactions_created'])
            if 'errors' in log and isinstance(log['errors'], str):
                log['errors'] = json.loads(log['errors'])
            return log
        return None
    
    # ==================== DUPLICATE LOG OPERATIONS ====================
    
    @staticmethod
    async def create_duplicate_log(log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a duplicate detection log"""
        sql = build_insert('duplicate_logs', log_data)
        await execute_db(sql)
        return log_data
    
    @staticmethod
    async def count_duplicate_logs(user_id: str) -> int:
        """Count duplicate logs for a user"""
        try:
            return await count_rows_safe('duplicate_logs', f"user_id = '{user_id}'", query_func=query_db)
        except Exception as e:
            if is_table_not_found_error(e):
                return 0
            raise
    
    # ==================== STATUS CHECK OPERATIONS ====================
    
    @staticmethod
    async def create_status_check(status_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a status check record"""
        sql = build_insert('status_checks', status_data)
        await execute_db(sql)
        return status_data
    
    @staticmethod
    async def get_status_checks(limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent status checks"""
        result = await query_db(f"SELECT * FROM status_checks ORDER BY timestamp DESC LIMIT {limit}")
        return result
    
    # ==================== ANALYTICS / AGGREGATION OPERATIONS ====================
    
    @staticmethod
    async def get_spending_by_category(user_id: str, category_id: str, start_date: str, end_date: str) -> float:
        """Get total spending for a category in a date range"""
        where = f"user_id = '{user_id}' AND category_id = '{category_id}' AND type = 'expense' AND date BETWEEN '{start_date}' AND '{end_date}'"
        return await sum_safe('transactions', 'amount', where, query_func=query_db)
    
    @staticmethod
    async def get_total_by_type(user_id: str, transaction_type: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> float:
        """Get total amount by transaction type"""
        where_clauses = [f"user_id = '{user_id}'", f"type = '{transaction_type}'"]

        if start_date:
            where_clauses.append(f"date >= '{start_date}'")
        if end_date:
            where_clauses.append(f"date <= '{end_date}'")

        where_clause = ' AND '.join(where_clauses)
        return await sum_safe('transactions', 'amount', where_clause, query_func=query_db)
    
    @staticmethod
    async def get_category_spending_summary(user_id: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Get spending summary grouped by category"""
        where = f"user_id = '{user_id}' AND type = 'expense' AND date >= '{start_date}' AND date <= '{end_date}'"

        return await aggregate_safe(
            'transactions',
            [('SUM', 'amount'), ('COUNT', '*')],
            where=where,
            group_by='category_id',
            order_by='sum_amount DESC',
            query_func=query_db
        )
    
    @staticmethod
    async def get_daily_spending(user_id: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Get daily spending totals (simplified - date grouping)"""
        # Note: Date extraction functions may vary by SQL dialect
        # This is a simplified version that groups by the date string
        result = await query_db(f"""
        SELECT
            date,
            SUM(amount) as total
        FROM transactions
        WHERE user_id = '{user_id}'
          AND type = 'expense'
          AND date BETWEEN '{start_date}' AND '{end_date}'
        GROUP BY date
        ORDER BY date ASC
        """)
        
        return result


# Create a global instance
db_service = PesaDBService()
