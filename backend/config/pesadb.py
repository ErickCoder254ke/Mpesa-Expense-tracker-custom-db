"""
PesaDB Configuration and Connection Module

This module provides the configuration and connection utilities for PesaDB,
replacing the MongoDB connection used in the original application.
"""

import os
import json
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# PesaDB Configuration
class PesaDBConfig:
    """Configuration class for PesaDB connection"""

    def __init__(self):
        self.api_url = os.environ.get('PESADB_API_URL')
        self.api_key = os.environ.get('PESADB_API_KEY')
        self.database = os.environ.get('PESADB_DATABASE')
        self._validated = False

    def validate(self):
        """Validate configuration - call this before first use"""
        if self._validated:
            return

        # Validate API Key (required)
        if not self.api_key:
            raise ValueError(
                "PESADB_API_KEY environment variable is required. "
                "Please set it in your .env file or environment variables."
            )

        # Validate API URL (required - no default)
        if not self.api_url:
            raise ValueError(
                "PESADB_API_URL environment variable is required. "
                "Example: PESADB_API_URL=https://pesacoredb-backend.onrender.com/api"
            )

        # Validate Database Name (required - no default)
        if not self.database:
            raise ValueError(
                "PESADB_DATABASE environment variable is required. "
                "Example: PESADB_DATABASE=mpesa_tracker"
            )

        self._validated = True

    def get_headers(self) -> Dict[str, str]:
        """Get headers for PesaDB API requests"""
        self.validate()  # Ensure config is validated before use
        return {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }


# Global config instance (does not validate until first use)
config = PesaDBConfig()


class PesaDBClient:
    """Async client for PesaDB operations"""
    
    def __init__(self, config: PesaDBConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def query(self, sql: str, database: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Execute a SQL query on PesaDB

        Args:
            sql: SQL query string
            database: Optional database name (defaults to config database)

        Returns:
            List of result rows as dictionaries

        Raises:
            Exception: If query fails
        """
        # Validate config before making requests
        self.config.validate()

        if not self.session:
            self.session = aiohttp.ClientSession()

        db = database or self.config.database
        url = f"{self.config.api_url}/query"

        payload = {
            'sql': sql,
            'db': db
        }

        # DEBUG: Log the exact SQL being sent
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"🔍 PesaDB Query - SQL: {sql}")
        logger.debug(f"🔍 PesaDB Query - Database: {db}")
        logger.debug(f"🔍 PesaDB Query - Payload: {payload}")

        try:
            async with self.session.post(
                url,
                headers=self.config.get_headers(),
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                result = await response.json()

                logger.debug(f"🔍 PesaDB Response: {result}")

                if not result.get('success'):
                    error_msg = result.get('error', 'Database query failed')
                    logger.error(f"❌ PesaDB Error - SQL: {sql}")
                    logger.error(f"❌ PesaDB Error - Message: {error_msg}")
                    logger.error(f"❌ PesaDB Error - Full Response: {result}")

                    # Check for common issues and provide helpful hints
                    error_lower = error_msg.lower()
                    if 'column' in error_lower and 'not found' in error_lower:
                        logger.error("💡 HINT: This might be a schema mismatch issue.")
                        logger.error("   Run: python backend/scripts/verify_database_schema.py --repair")
                        logger.error("   Or check if the table was created with the correct schema")
                    elif 'table' in error_lower and ('not found' in error_lower or 'does not exist' in error_lower):
                        logger.error("💡 HINT: Table doesn't exist. Initialize the database:")
                        logger.error("   Run: python backend/scripts/init_database.py")
                        logger.error("   Or use the API: POST /api/initialize-database")
                    elif 'count' in error_lower and 'syntax' in error_lower:
                        logger.error("💡 HINT: Your PesaDB version doesn't support COUNT aggregates.")
                        logger.error("   The app should automatically use fallback methods.")
                        logger.error("   If you see this error repeatedly, there may be a code issue.")

                    raise Exception(f"PesaDB Error: {error_msg}")

                return result.get('data', [])

        except aiohttp.ClientError as e:
            logger.error(f"❌ PesaDB Connection Error - SQL: {sql}")
            logger.error(f"❌ PesaDB Connection Error - Message: {str(e)}")
            raise Exception(f"PesaDB Connection Error: {str(e)}")
        except Exception as e:
            logger.error(f"❌ PesaDB Query Error - SQL: {sql}")
            logger.error(f"❌ PesaDB Query Error - Message: {str(e)}")
            raise Exception(f"PesaDB Query Error: {str(e)}")
    
    async def execute(self, sql: str, database: Optional[str] = None) -> bool:
        """
        Execute a SQL command (INSERT, UPDATE, DELETE, CREATE, etc.)
        
        Args:
            sql: SQL command string
            database: Optional database name
        
        Returns:
            True if successful
        """
        try:
            await self.query(sql, database)
            return True
        except Exception:
            raise
    
    async def create_database(self, database_name: str) -> bool:
        """
        Create a new database

        IMPORTANT: PesaDB databases are typically pre-created via dashboard.
        This method is provided for compatibility but may not be supported.

        Args:
            database_name: Name of the database to create

        Returns:
            True if successful, False if not supported
        """
        import logging
        logger = logging.getLogger(__name__)

        logger.warning(
            f"⚠️  Database creation via API may not be supported. "
            f"If initialization fails, ensure database '{database_name}' "
            f"exists in your PesaDB dashboard."
        )

        # Database should be pre-created in PesaDB dashboard
        # Most PesaDB instances don't support CREATE DATABASE via API
        return True

    async def database_exists(self, database_name: str) -> bool:
        """
        Check if a database exists

        IMPORTANT: PesaDB typically doesn't expose database listing via API.
        This method assumes the database exists if configured.

        Args:
            database_name: Name of the database to check

        Returns:
            True (assumes database exists if properly configured)
        """
        import logging
        logger = logging.getLogger(__name__)

        # PesaDB databases are pre-created via dashboard
        # Assume database exists if API key and URL are configured
        logger.debug(f"Assuming database '{database_name}' exists (pre-created in PesaDB dashboard)")
        return True

    async def close(self):
        """Close the client session"""
        if self.session:
            await self.session.close()
            self.session = None


# Singleton client instance
_client_instance: Optional[PesaDBClient] = None


def get_client() -> PesaDBClient:
    """Get or create the global PesaDB client instance"""
    global _client_instance
    if _client_instance is None:
        _client_instance = PesaDBClient(config)
    return _client_instance


async def query_db(sql: str, database: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Convenience function to execute a query
    
    Args:
        sql: SQL query string
        database: Optional database name
    
    Returns:
        List of result rows
    """
    client = get_client()
    return await client.query(sql, database)


async def execute_db(sql: str, database: Optional[str] = None) -> bool:
    """
    Convenience function to execute a command

    Args:
        sql: SQL command string
        database: Optional database name

    Returns:
        True if successful
    """
    client = get_client()
    return await client.execute(sql, database)


async def create_database(database_name: str) -> bool:
    """
    Convenience function to create a database

    DEPRECATED: PesaDB databases should be pre-created via dashboard.
    This function exists for backward compatibility only.

    Args:
        database_name: Name of the database to create

    Returns:
        True (assumes database is pre-created)
    """
    client = get_client()
    return await client.create_database(database_name)


async def database_exists(database_name: str) -> bool:
    """
    Convenience function to check if database exists

    DEPRECATED: PesaDB doesn't expose database listing.
    This function assumes the database exists if configured.

    Args:
        database_name: Name of the database to check

    Returns:
        True (assumes database is pre-created)
    """
    client = get_client()
    return await client.database_exists(database_name)


# Utility functions for SQL escaping
def escape_string(value: Any) -> str:
    """
    Escape a string value for SQL queries
    
    Args:
        value: The value to escape
    
    Returns:
        Escaped string ready for SQL
    """
    if value is None:
        return 'NULL'
    
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    
    if isinstance(value, (int, float)):
        return str(value)
    
    if isinstance(value, datetime):
        return f"'{value.isoformat()}'"
    
    if isinstance(value, dict):
        json_str = json.dumps(value).replace("'", "''")
        return f"'{json_str}'"

    if isinstance(value, list):
        json_str = json.dumps(value).replace("'", "''")
        return f"'{json_str}'"
    
    # String escaping - replace single quotes with double single quotes
    str_value = str(value).replace("'", "''")
    return f"'{str_value}'"


def build_insert(table: str, data: Dict[str, Any]) -> str:
    """
    Build an INSERT SQL statement
    
    Args:
        table: Table name
        data: Dictionary of column: value pairs
    
    Returns:
        SQL INSERT statement
    """
    columns = ', '.join(data.keys())
    values = ', '.join(escape_string(v) for v in data.values())
    return f"INSERT INTO {table} ({columns}) VALUES ({values})"


def build_update(table: str, data: Dict[str, Any], where: str) -> str:
    """
    Build an UPDATE SQL statement
    
    Args:
        table: Table name
        data: Dictionary of column: value pairs to update
        where: WHERE clause (without 'WHERE' keyword)
    
    Returns:
        SQL UPDATE statement
    """
    set_clause = ', '.join(f"{k} = {escape_string(v)}" for k, v in data.items())
    return f"UPDATE {table} SET {set_clause} WHERE {where}"


def build_delete(table: str, where: str) -> str:
    """
    Build a DELETE SQL statement
    
    Args:
        table: Table name
        where: WHERE clause (without 'WHERE' keyword)
    
    Returns:
        SQL DELETE statement
    """
    return f"DELETE FROM {table} WHERE {where}"
