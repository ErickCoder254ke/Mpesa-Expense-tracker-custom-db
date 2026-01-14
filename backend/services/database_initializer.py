"""
Automatic Database Initialization Service

This module handles automatic database initialization on server startup,
ensuring all tables exist and optionally seeding default data.
"""

import logging
from typing import List, Tuple
from config.pesadb import query_db, execute_db

logger = logging.getLogger(__name__)


class DatabaseInitializer:
    """Service for automatic database initialization"""
    
    @staticmethod
    async def table_exists(table_name: str) -> bool:
        """Check if a table exists in the database"""
        try:
            # Try to query the table with a LIMIT 0 to check existence
            await query_db(f"SELECT * FROM {table_name} LIMIT 0")
            return True
        except Exception as e:
            logger.debug(f"Table '{table_name}' does not exist: {str(e)}")
            return False
    
    @staticmethod
    async def create_tables() -> Tuple[int, int]:
        """
        Create all required tables if they don't exist
        
        Returns:
            Tuple of (tables_created, tables_skipped)
        """
        tables_created = 0
        tables_skipped = 0
        
        # Define table creation statements
        table_statements = [
            # Users table
            (
                "users",
                """
                CREATE TABLE users (
                    id STRING PRIMARY KEY,
                    pin_hash STRING NOT NULL,
                    security_question STRING,
                    security_answer_hash STRING,
                    created_at STRING NOT NULL,
                    preferences STRING DEFAULT '{}'
                )
                """
            ),
            # Categories table
            (
                "categories",
                """
                CREATE TABLE categories (
                    id STRING PRIMARY KEY,
                    user_id STRING,
                    name STRING NOT NULL,
                    icon STRING NOT NULL,
                    color STRING NOT NULL,
                    keywords STRING DEFAULT '[]',
                    is_default BOOL DEFAULT TRUE
                )
                """
            ),
            # Transactions table
            (
                "transactions",
                """
                CREATE TABLE transactions (
                    id STRING PRIMARY KEY,
                    user_id STRING NOT NULL,
                    amount REAL NOT NULL,
                    type STRING NOT NULL CHECK (type IN ('expense', 'income')),
                    category_id STRING NOT NULL,
                    description STRING NOT NULL,
                    date STRING NOT NULL,
                    source STRING DEFAULT 'manual' CHECK (source IN ('manual', 'sms', 'api')),
                    mpesa_details STRING,
                    sms_metadata STRING,
                    created_at STRING NOT NULL,
                    transaction_group_id STRING,
                    transaction_role STRING DEFAULT 'primary',
                    parent_transaction_id STRING
                )
                """
            ),
            # Budgets table
            (
                "budgets",
                """
                CREATE TABLE budgets (
                    id STRING PRIMARY KEY,
                    user_id STRING NOT NULL,
                    category_id STRING NOT NULL,
                    amount REAL NOT NULL,
                    period STRING DEFAULT 'monthly' CHECK (period IN ('monthly', 'weekly', 'yearly')),
                    month INT NOT NULL,
                    year INT NOT NULL,
                    created_at STRING NOT NULL
                )
                """
            ),
            # SMS Import Logs table
            (
                "sms_import_logs",
                """
                CREATE TABLE sms_import_logs (
                    id STRING PRIMARY KEY,
                    user_id STRING NOT NULL,
                    import_session_id STRING NOT NULL,
                    total_messages INT DEFAULT 0,
                    successful_imports INT DEFAULT 0,
                    duplicates_found INT DEFAULT 0,
                    parsing_errors INT DEFAULT 0,
                    transactions_created STRING DEFAULT '[]',
                    errors STRING DEFAULT '[]',
                    created_at STRING NOT NULL
                )
                """
            ),
            # Duplicate Logs table
            (
                "duplicate_logs",
                """
                CREATE TABLE duplicate_logs (
                    id STRING PRIMARY KEY,
                    user_id STRING NOT NULL,
                    original_transaction_id STRING,
                    duplicate_transaction_id STRING,
                    message_hash STRING,
                    mpesa_transaction_id STRING,
                    reason STRING,
                    similarity_score REAL,
                    detected_at STRING NOT NULL
                )
                """
            ),
            # Status Checks table
            (
                "status_checks",
                """
                CREATE TABLE status_checks (
                    id STRING PRIMARY KEY,
                    status STRING NOT NULL,
                    timestamp STRING NOT NULL,
                    details STRING
                )
                """
            ),
        ]
        
        for table_name, create_statement in table_statements:
            try:
                # Check if table exists
                exists = await DatabaseInitializer.table_exists(table_name)
                
                if exists:
                    logger.info(f"✅ Table '{table_name}' already exists")
                    tables_skipped += 1
                else:
                    # Create the table
                    logger.info(f"📝 Creating table '{table_name}'...")
                    await execute_db(create_statement)
                    logger.info(f"✅ Table '{table_name}' created successfully")
                    tables_created += 1
                    
            except Exception as e:
                logger.error(f"❌ Error creating table '{table_name}': {str(e)}")
                # Continue with other tables
        
        return tables_created, tables_skipped
    
    @staticmethod
    async def seed_default_categories() -> int:
        """
        Seed default categories if none exist
        
        Returns:
            Number of categories seeded
        """
        try:
            # Check if categories already exist
            categories_count = await query_db("SELECT COUNT(*) as count FROM categories")
            if categories_count and categories_count[0]['count'] > 0:
                logger.info(f"✅ Categories already exist ({categories_count[0]['count']}), skipping seed")
                return 0
            
            logger.info("📦 Seeding default categories...")
            
            default_categories = [
                ('cat-food', 'Food & Dining', '🍔', '#FF6B6B', '["food", "restaurant", "dining", "lunch", "dinner", "breakfast", "nyama", "choma"]'),
                ('cat-transport', 'Transport', '🚗', '#4ECDC4', '["taxi", "bus", "matatu", "uber", "fuel", "transport", "travel"]'),
                ('cat-shopping', 'Shopping', '🛍️', '#95E1D3', '["shop", "store", "mall", "clothing", "electronics", "supermarket"]'),
                ('cat-bills', 'Bills & Utilities', '📱', '#F38181', '["bill", "electricity", "water", "internet", "phone", "utility", "kplc", "nairobi water"]'),
                ('cat-entertainment', 'Entertainment', '🎬', '#AA96DA', '["movie", "cinema", "game", "entertainment", "music", "showmax", "netflix"]'),
                ('cat-health', 'Health & Fitness', '⚕️', '#FCBAD3', '["hospital", "pharmacy", "doctor", "medicine", "gym", "health", "clinic"]'),
                ('cat-education', 'Education', '📚', '#A8D8EA', '["school", "books", "tuition", "education", "course", "university"]'),
                ('cat-airtime', 'Airtime & Data', '📞', '#FFFFD2', '["airtime", "data", "bundles", "safaricom", "airtel", "telkom"]'),
                ('cat-transfers', 'Money Transfer', '💸', '#FEC8D8', '["transfer", "send money", "mpesa", "paybill", "till"]'),
                ('cat-savings', 'Savings & Investments', '💰', '#957DAD', '["savings", "investment", "deposit", "savings account", "mshwari", "kcb mpesa"]'),
                ('cat-other', 'Other', '📌', '#D4A5A5', '[]'),
            ]
            
            seeded_count = 0
            for cat_id, name, icon, color, keywords in default_categories:
                try:
                    sql = f"""
                    INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
                    VALUES ('{cat_id}', NULL, '{name}', '{icon}', '{color}', '{keywords}', TRUE)
                    """
                    await execute_db(sql)
                    seeded_count += 1
                    logger.info(f"✅ Seeded category: {name}")
                except Exception as e:
                    logger.warning(f"⚠️  Category '{name}' may already exist: {str(e)}")
            
            logger.info(f"✅ Seeded {seeded_count} default categories")
            return seeded_count
            
        except Exception as e:
            logger.error(f"❌ Error seeding default categories: {str(e)}")
            return 0
    
    @staticmethod
    async def verify_database() -> bool:
        """
        Verify that all required tables exist and are accessible
        
        Returns:
            True if database is properly initialized, False otherwise
        """
        required_tables = [
            'users', 'categories', 'transactions', 'budgets',
            'sms_import_logs', 'duplicate_logs', 'status_checks'
        ]
        
        try:
            for table in required_tables:
                exists = await DatabaseInitializer.table_exists(table)
                if not exists:
                    logger.error(f"❌ Required table '{table}' does not exist")
                    return False
                logger.debug(f"✅ Table '{table}' verified")
            
            logger.info("✅ Database verification successful - all tables exist")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database verification failed: {str(e)}")
            return False
    
    @staticmethod
    async def initialize_database(seed_categories: bool = True) -> dict:
        """
        Main initialization function - creates tables and optionally seeds data
        
        Args:
            seed_categories: Whether to seed default categories
        
        Returns:
            Dictionary with initialization results
        """
        logger.info("🚀 Starting automatic database initialization...")
        
        result = {
            'success': False,
            'tables_created': 0,
            'tables_skipped': 0,
            'categories_seeded': 0,
            'verified': False,
            'message': ''
        }
        
        try:
            # Step 1: Create tables
            tables_created, tables_skipped = await DatabaseInitializer.create_tables()
            result['tables_created'] = tables_created
            result['tables_skipped'] = tables_skipped
            
            logger.info(f"📊 Tables: {tables_created} created, {tables_skipped} already existed")
            
            # Step 2: Seed default categories if requested
            if seed_categories:
                categories_seeded = await DatabaseInitializer.seed_default_categories()
                result['categories_seeded'] = categories_seeded
            
            # Step 3: Verify database
            verified = await DatabaseInitializer.verify_database()
            result['verified'] = verified
            
            if verified:
                result['success'] = True
                result['message'] = 'Database initialized successfully'
                logger.info("✅ Database initialization completed successfully")
            else:
                result['message'] = 'Database verification failed'
                logger.error("❌ Database initialization completed with errors")
            
        except Exception as e:
            result['message'] = f'Initialization error: {str(e)}'
            logger.error(f"❌ Database initialization failed: {str(e)}")
        
        return result


# Singleton instance
db_initializer = DatabaseInitializer()
