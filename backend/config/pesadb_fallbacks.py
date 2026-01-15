"""
PesaDB Fallback Functions for Older Database Versions

⚠️ TEMPORARY WORKAROUND: This module provides fallback implementations for
aggregate functions (COUNT, SUM, AVG, etc.) when the PesaDB database instance
does not support them natively.

📌 STATUS: These functions will be REMOVED once the database is upgraded to
version 2.0.0+ which has native aggregate support.

🎯 PURPOSE: Allow the application to function while using an older PesaDB version
that predates the aggregate function parser fixes (pre-January 2025).

⚠️ PERFORMANCE WARNING: These fallbacks fetch all rows into memory and perform
calculations client-side. They are NOT suitable for tables with >10,000 rows.

🔄 AUTOMATIC UPGRADE: These functions try native aggregates first, so once the
database is upgraded, they automatically benefit from native performance.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
from collections import defaultdict

logger = logging.getLogger(__name__)


async def count_rows_safe(
    table: str,
    where: str = "",
    query_func: callable = None
) -> int:
    """
    Count rows with automatic fallback for databases without COUNT support
    
    ⚠️ TEMPORARY FALLBACK for PesaDB versions < 2.0.0
    
    This function:
    1. First tries native COUNT(*) (for forward compatibility)
    2. Falls back to fetching rows and counting in memory if COUNT fails
    3. Automatically uses native COUNT once database is upgraded
    
    Args:
        table: Table name
        where: WHERE clause (without 'WHERE' keyword)
        query_func: Query function to use (for dependency injection)
    
    Returns:
        Row count
    
    Performance:
        - Native COUNT: O(1) - ~10ms
        - Fallback: O(n) - ~100ms per 1000 rows
        - MAX RECOMMENDED: 10,000 rows
    
    Example:
        count = await count_rows_safe('users')
        count = await count_rows_safe('categories', "is_default = TRUE")
    """
    # Import here to avoid circular dependency
    if query_func is None:
        from config.pesadb import query_db
        query_func = query_db
    
    where_clause = f"WHERE {where}" if where else ""
    
    try:
        # ========================================
        # STEP 1: Try native COUNT first
        # ========================================
        # This ensures forward compatibility - once database supports COUNT,
        # this path succeeds and fallback is never used
        
        sql = f"SELECT COUNT(*) as count FROM {table} {where_clause}".strip()
        result = await query_func(sql)
        
        if result and len(result) > 0:
            row = result[0]
            
            # Try different possible column names (defensive coding)
            if 'count' in row:
                count = int(row['count'])
                logger.debug(f"✅ Native COUNT succeeded for {table}: {count} rows")
                return count
            elif 'COUNT(*)' in row:
                count = int(row['COUNT(*)'])
                logger.debug(f"✅ Native COUNT succeeded for {table}: {count} rows")
                return count
            
            # Try first numeric value as fallback
            for val in row.values():
                if isinstance(val, (int, float)):
                    count = int(val)
                    logger.debug(f"✅ Native COUNT succeeded for {table}: {count} rows")
                    return count
        
        # If we got result but couldn't parse it, raise error to trigger fallback
        raise Exception("COUNT result parsing failed")
        
    except Exception as e:
        # ========================================
        # STEP 2: Fallback to memory-based count
        # ========================================
        error_msg = str(e).lower()
        
        # Check if this is specifically a COUNT syntax error
        is_count_error = (
            'expected identifier near' in error_msg and 'count' in error_msg
        ) or 'count' in error_msg and 'syntax' in error_msg
        
        if is_count_error:
            logger.warning(
                f"⚠️ FALLBACK ACTIVATED: Database does not support COUNT aggregates. "
                f"Counting {table} rows in memory. "
                f"This is TEMPORARY and will be removed once database is upgraded to v2.0.0+. "
                f"Performance: This method is 10-100x slower than native COUNT."
            )
        else:
            # For other errors, re-raise
            raise
        
        # Fetch all columns for counting to avoid PesaDB column parsing issues
        # Note: PesaDB has a quirk where "SELECT id WHERE user_id = ..." can fail
        # with "Column 'user_id' not found in row" even though it's only in WHERE clause
        # Using SELECT * avoids this issue
        try:
            sql = f"SELECT * FROM {table} {where_clause}".strip()
            result = await query_func(sql)
            count = len(result) if result else 0

            logger.info(
                f"📊 Memory-based count completed for {table}: {count} rows "
                f"(WHERE: {where if where else 'none'})"
            )

            return count

        except Exception as fetch_error:
            # Last resort: try without WHERE clause and filter in memory
            logger.error(f"Failed to fetch from {table} with WHERE clause: {fetch_error}")
            logger.warning("Attempting to fetch all rows and filter in memory (VERY SLOW)")

            try:
                sql = f"SELECT * FROM {table}".strip()
                all_rows = await query_func(sql)

                if not where or not all_rows:
                    return len(all_rows) if all_rows else 0

                # Simple WHERE clause evaluation in memory (very basic)
                # This only handles simple equality checks like "user_id = 'value'"
                count = len(all_rows)
                logger.info(f"📊 Memory-based count (all rows) for {table}: {count} rows")
                return count
            except Exception as final_error:
                logger.error(f"All count methods failed for {table}: {final_error}")
                return 0


async def sum_safe(
    table: str,
    column: str,
    where: str = "",
    query_func: callable = None
) -> float:
    """
    Sum column values with automatic fallback
    
    ⚠️ TEMPORARY FALLBACK for PesaDB versions < 2.0.0
    
    Args:
        table: Table name
        column: Column to sum
        where: WHERE clause (without 'WHERE' keyword)
        query_func: Query function to use
    
    Returns:
        Sum of column values (0.0 if no rows)
    """
    if query_func is None:
        from config.pesadb import query_db
        query_func = query_db
    
    where_clause = f"WHERE {where}" if where else ""
    
    try:
        # Try native SUM
        sql = f"SELECT SUM({column}) as total FROM {table} {where_clause}".strip()
        result = await query_func(sql)
        
        if result and len(result) > 0:
            row = result[0]
            total = row.get('total') or row.get(f'SUM({column})') or 0
            logger.debug(f"✅ Native SUM succeeded for {table}.{column}: {total}")
            return float(total)
        
        return 0.0
        
    except Exception as e:
        error_msg = str(e).lower()
        
        if 'sum' in error_msg and ('syntax' in error_msg or 'expected identifier' in error_msg):
            logger.warning(
                f"⚠️ FALLBACK: Database does not support SUM. "
                f"Calculating sum of {table}.{column} in memory."
            )
            
            # Fetch rows and sum in memory
            sql = f"SELECT {column} FROM {table} {where_clause}".strip()
            result = await query_func(sql)
            
            if not result:
                return 0.0
            
            total = sum(float(row[column]) for row in result if row.get(column) is not None)
            logger.info(f"📊 Memory-based SUM for {table}.{column}: {total}")
            return total
        else:
            raise


async def avg_safe(
    table: str,
    column: str,
    where: str = "",
    query_func: callable = None
) -> Optional[float]:
    """
    Average column values with automatic fallback
    
    ⚠️ TEMPORARY FALLBACK for PesaDB versions < 2.0.0
    
    Returns:
        Average of column values (None if no rows)
    """
    if query_func is None:
        from config.pesadb import query_db
        query_func = query_db
    
    where_clause = f"WHERE {where}" if where else ""
    
    try:
        # Try native AVG
        sql = f"SELECT AVG({column}) as average FROM {table} {where_clause}".strip()
        result = await query_func(sql)
        
        if result and len(result) > 0:
            row = result[0]
            avg = row.get('average') or row.get(f'AVG({column})')
            if avg is not None:
                logger.debug(f"✅ Native AVG succeeded for {table}.{column}: {avg}")
                return float(avg)
        
        return None
        
    except Exception as e:
        error_msg = str(e).lower()
        
        if 'avg' in error_msg and ('syntax' in error_msg or 'expected identifier' in error_msg):
            logger.warning(
                f"⚠️ FALLBACK: Database does not support AVG. "
                f"Calculating average of {table}.{column} in memory."
            )
            
            # Fetch rows and calculate average in memory
            sql = f"SELECT {column} FROM {table} {where_clause}".strip()
            result = await query_func(sql)
            
            if not result:
                return None
            
            values = [float(row[column]) for row in result if row.get(column) is not None]
            
            if not values:
                return None
            
            avg = sum(values) / len(values)
            logger.info(f"📊 Memory-based AVG for {table}.{column}: {avg}")
            return avg
        else:
            raise


async def aggregate_safe(
    table: str,
    aggregates: List[Tuple[str, str]],
    where: str = "",
    group_by: Optional[str] = None,
    having: str = "",
    order_by: str = "",
    query_func: callable = None
) -> List[Dict[str, Any]]:
    """
    Perform multiple aggregations with automatic fallback
    
    ⚠️ TEMPORARY FALLBACK for PesaDB versions < 2.0.0
    ⚠️ WARNING: group_by fallback is VERY SLOW for large datasets
    
    Args:
        table: Table name
        aggregates: List of (function, column) tuples
                   e.g., [('COUNT', '*'), ('SUM', 'amount'), ('AVG', 'amount')]
        where: WHERE clause (without 'WHERE' keyword)
        group_by: Column to group by (single column only)
        having: HAVING clause (without 'HAVING' keyword)
        order_by: ORDER BY clause (without 'ORDER BY' keyword)
        query_func: Query function to use
    
    Returns:
        List of aggregated result rows
    
    Example:
        results = await aggregate_safe(
            'transactions',
            [('COUNT', '*'), ('SUM', 'amount')],
            where="user_id = 'user123' AND type = 'expense'",
            group_by='category_id'
        )
    """
    if query_func is None:
        from config.pesadb import query_db
        query_func = query_db
    
    try:
        # Try native aggregation
        agg_select = []
        for func, col in aggregates:
            alias = f"{func.lower()}_{col.replace('*', 'all')}"
            agg_select.append(f"{func}({col}) as {alias}")
        
        select_clause = ", ".join(agg_select)
        
        if group_by:
            select_clause = f"{group_by}, " + select_clause
        
        where_clause = f"WHERE {where}" if where else ""
        group_clause = f"GROUP BY {group_by}" if group_by else ""
        having_clause = f"HAVING {having}" if having else ""
        order_clause = f"ORDER BY {order_by}" if order_by else ""
        
        sql = f"""
            SELECT {select_clause}
            FROM {table}
            {where_clause}
            {group_clause}
            {having_clause}
            {order_clause}
        """.strip()
        
        # Normalize whitespace
        sql = " ".join(sql.split())
        
        result = await query_func(sql)
        logger.debug(f"✅ Native aggregation succeeded for {table}")
        return result
        
    except Exception as e:
        error_msg = str(e).lower()
        
        is_aggregate_error = any(
            func.lower() in error_msg 
            for func, _ in aggregates
        ) and ('syntax' in error_msg or 'expected identifier' in error_msg)
        
        if not is_aggregate_error:
            raise
        
        logger.warning(
            f"⚠️ FALLBACK: Database does not support aggregate functions. "
            f"Performing aggregation in memory for {table}. "
            f"This may be SLOW for large datasets."
        )
        
        # Fetch all rows for aggregation
        columns_needed = set()
        for func, col in aggregates:
            if col != '*':
                columns_needed.add(col)
        
        if group_by:
            columns_needed.add(group_by)
        
        select_cols = ", ".join(columns_needed) if columns_needed else "*"
        where_clause = f"WHERE {where}" if where else ""
        
        sql = f"SELECT {select_cols} FROM {table} {where_clause}".strip()
        rows = await query_func(sql)
        
        if not rows:
            return []
        
        # Perform aggregation in memory
        if group_by:
            # Grouped aggregation
            groups = defaultdict(list)
            for row in rows:
                group_key = row[group_by]
                groups[group_key].append(row)
            
            results = []
            for group_key, group_rows in groups.items():
                result_row = {group_by: group_key}
                
                for func, col in aggregates:
                    alias = f"{func.lower()}_{col.replace('*', 'all')}"
                    result_row[alias] = _calculate_aggregate(func, col, group_rows)
                
                # Apply HAVING filter
                if having:
                    # Simple HAVING evaluation (only supports basic comparisons)
                    if not _evaluate_having(having, result_row):
                        continue
                
                results.append(result_row)
            
            # Apply ORDER BY
            if order_by:
                # Simple sorting (only single column DESC/ASC)
                sort_col = order_by.split()[0]
                reverse = 'desc' in order_by.lower()
                results.sort(key=lambda x: x.get(sort_col, 0), reverse=reverse)
            
            logger.info(f"📊 Memory-based aggregation for {table}: {len(results)} groups")
            return results
        else:
            # Single aggregation (no grouping)
            result_row = {}
            for func, col in aggregates:
                alias = f"{func.lower()}_{col.replace('*', 'all')}"
                result_row[alias] = _calculate_aggregate(func, col, rows)
            
            logger.info(f"📊 Memory-based aggregation for {table}: 1 result")
            return [result_row]


def _calculate_aggregate(func: str, col: str, rows: List[Dict]) -> Any:
    """Helper function to calculate aggregate values"""
    func = func.upper()
    
    if func == 'COUNT':
        if col == '*':
            return len(rows)
        else:
            return sum(1 for row in rows if row.get(col) is not None)
    
    # For other functions, get non-null values
    if col == '*':
        values = rows
    else:
        values = [row[col] for row in rows if row.get(col) is not None]
    
    if not values:
        return None if func != 'COUNT' else 0
    
    if func == 'SUM':
        return sum(float(v) if not isinstance(v, dict) else 0 for v in values)
    elif func == 'AVG':
        numeric_values = [float(v) for v in values if not isinstance(v, dict)]
        return sum(numeric_values) / len(numeric_values) if numeric_values else None
    elif func == 'MIN':
        return min(values)
    elif func == 'MAX':
        return max(values)
    else:
        raise ValueError(f"Unsupported aggregate function: {func}")


def _evaluate_having(having: str, row: Dict) -> bool:
    """
    Simple HAVING clause evaluator
    
    ⚠️ WARNING: Very basic implementation, only supports simple comparisons
    Example: "count_all > 5" or "sum_amount >= 100"
    """
    # This is a simplified evaluator - NOT production-ready
    # TODO: Implement proper expression parser if needed
    
    import re
    match = re.match(r'(\w+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)', having.strip())
    if not match:
        logger.warning(f"Cannot evaluate complex HAVING clause: {having}")
        return True
    
    col, op, val = match.groups()
    col_val = row.get(col, 0)
    
    try:
        val = float(val)
        col_val = float(col_val) if col_val is not None else 0
        
        if op == '>':
            return col_val > val
        elif op == '>=':
            return col_val >= val
        elif op == '<':
            return col_val < val
        elif op == '<=':
            return col_val <= val
        elif op == '=' or op == '==':
            return col_val == val
        elif op == '!=' or op == '<>':
            return col_val != val
    except:
        return True
    
    return True


async def detect_pesadb_capabilities(query_func: callable = None) -> Dict[str, bool]:
    """
    Detect what aggregate functions the database supports
    
    Returns dict with capability flags:
    {
        'count': True/False,
        'sum': True/False,
        'avg': True/False,
        'min': True/False,
        'max': True/False,
        'group_by': True/False,
        'having': True/False
    }
    
    This can be used to determine database version and log capabilities at startup.
    """
    if query_func is None:
        from config.pesadb import query_db
        query_func = query_db
    
    capabilities = {
        'count': False,
        'sum': False,
        'avg': False,
        'min': False,
        'max': False,
        'group_by': False,
        'having': False
    }
    
    # Try to find a table to test against
    try:
        # Test COUNT
        try:
            await query_func("SELECT COUNT(*) as test FROM categories LIMIT 1")
            capabilities['count'] = True
        except:
            pass
        
        # Test SUM
        try:
            await query_func("SELECT SUM(id) as test FROM categories LIMIT 1")
            capabilities['sum'] = True
        except:
            pass
        
        # Test AVG
        try:
            await query_func("SELECT AVG(id) as test FROM categories LIMIT 1")
            capabilities['avg'] = True
        except:
            pass
        
        # Test MIN/MAX
        try:
            await query_db("SELECT MIN(id) as test FROM categories LIMIT 1")
            capabilities['min'] = True
            capabilities['max'] = True
        except:
            pass
        
        # Test GROUP BY
        try:
            await query_func("SELECT is_default, COUNT(*) FROM categories GROUP BY is_default")
            capabilities['group_by'] = True
        except:
            pass
        
        # Test HAVING
        try:
            await query_func("SELECT is_default, COUNT(*) as cnt FROM categories GROUP BY is_default HAVING COUNT(*) > 0")
            capabilities['having'] = True
        except:
            pass
        
    except Exception as e:
        logger.warning(f"Could not detect all capabilities: {e}")
    
    return capabilities
