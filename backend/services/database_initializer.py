"""
Automatic Database Initialization Service

This module handles automatic database initialization on server startup,
ensuring all tables exist and optionally seeding default data.
"""

import logging
import os
from typing import List, Tuple
from config.pesadb import query_db, execute_db, create_database, database_exists

logger = logging.getLogger(__name__)


class DatabaseInitializer:
    """Service for automatic database initialization"""

    @staticmethod
    async def ensure_database_exists() -> bool:
        """
        Ensure the target database exists, create it if it doesn't

        Returns:
            True if database exists or was created successfully
        """
        database_name = os.environ.get('PESADB_DATABASE', 'mpesa_tracker')

        try:
            logger.info(f"🔍 Checking if database '{database_name}' exists...")
            exists = await database_exists(database_name)

            if exists:
                logger.info(f"✅ Database '{database_name}' already exists")
                return True

            logger.info(f"📝 Database '{database_name}' does not exist, creating it...")
            await create_database(database_name)
            logger.info(f"✅ Database '{database_name}' created successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Error ensuring database exists: {str(e)}")
            # Don't fail completely - maybe the API doesn't support listing/creating databases
            # and the database already exists
            logger.warning("⚠️  Continuing anyway - database might already exist")
            return True

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
                    pin_hash STRING,
                    security_question STRING,
                    security_answer_hash STRING,
                    created_at STRING,
                    preferences STRING
                )
                """
            ),
            # Categories table
            # Foreign Keys: user_id -> users.id (optional for default categories)
            (
                "categories",
                """
                CREATE TABLE categories (
                    id STRING PRIMARY KEY,
                    user_id STRING,
                    name STRING,
                    icon STRING,
                    color STRING,
                    keywords STRING,
                    is_default BOOL
                )
                """
            ),
            # Transactions table
            # Foreign Keys: user_id -> users.id, category_id -> categories.id, parent_transaction_id -> transactions.id
            (
                "transactions",
                """
                CREATE TABLE transactions (
                    id STRING PRIMARY KEY,
                    user_id STRING,
                    amount FLOAT,
                    type STRING,
                    category_id STRING,
                    description STRING,
                    date STRING,
                    source STRING,
                    mpesa_details STRING,
                    sms_metadata STRING,
                    created_at STRING,
                    transaction_group_id STRING,
                    transaction_role STRING,
                    parent_transaction_id STRING
                )
                """
            ),
            # Budgets table
            # Foreign Keys: user_id -> users.id, category_id -> categories.id
            (
                "budgets",
                """
                CREATE TABLE budgets (
                    id STRING PRIMARY KEY,
                    user_id STRING,
                    category_id STRING,
                    amount FLOAT,
                    period STRING,
                    month INT,
                    year INT,
                    created_at STRING
                )
                """
            ),
            # SMS Import Logs table
            # Foreign Keys: user_id -> users.id
            (
                "sms_import_logs",
                """
                CREATE TABLE sms_import_logs (
                    id STRING PRIMARY KEY,
                    user_id STRING,
                    import_session_id STRING,
                    total_messages INT,
                    successful_imports INT,
                    duplicates_found INT,
                    parsing_errors INT,
                    transactions_created STRING,
                    errors STRING,
                    created_at STRING
                )
                """
            ),
            # Duplicate Logs table
            # Foreign Keys: user_id -> users.id, original_transaction_id -> transactions.id, duplicate_transaction_id -> transactions.id
            (
                "duplicate_logs",
                """
                CREATE TABLE duplicate_logs (
                    id STRING PRIMARY KEY,
                    user_id STRING,
                    original_transaction_id STRING,
                    duplicate_transaction_id STRING,
                    message_hash STRING,
                    mpesa_transaction_id STRING,
                    reason STRING,
                    similarity_score FLOAT,
                    detected_at STRING
                )
                """
            ),
            # Status Checks table
            (
                "status_checks",
                """
                CREATE TABLE status_checks (
                    id STRING PRIMARY KEY,
                    status STRING,
                    timestamp STRING,
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
                    # Note: PesaDB uses TRUE/FALSE for booleans and NULL for null values (without quotes)
                    # Escape single quotes in name for SQL safety
                    safe_name = name.replace("'", "''")
                    sql = f"""
                    INSERT INTO categories (id, user_id, name, icon, color, keywords, is_default)
                    VALUES ('{cat_id}', NULL, '{safe_name}', '{icon}', '{color}', '{keywords}', TRUE)
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
    async def create_default_user() -> dict:
        """
        Create a default user if none exists

        Returns:
            Dictionary with user creation result
        """
        try:
            from services.pesadb_service import db_service
            import bcrypt
            import uuid
            from datetime import datetime

            # Check if user already exists
            user_count = await db_service.get_user_count()

            if user_count > 0:
                logger.info(f"✅ User already exists, skipping default user creation")
                return {
                    'created': False,
                    'message': 'User already exists',
                    'user_id': None
                }

            logger.info("📝 Creating default user...")

            # Create default user with PIN "0000" (user should change this)
            default_pin = "0000"
            pin_hash = bcrypt.hashpw(default_pin.encode('utf-8'), bcrypt.gensalt())

            user_data = {
                'id': str(uuid.uuid4()),
                'pin_hash': pin_hash.decode('utf-8'),
                'security_question': 'What is your favorite color?',
                'security_answer_hash': None,  # User should set this during first login
                'created_at': datetime.utcnow().isoformat(),
                'preferences': '{"default_currency": "KES", "is_default": true}'
            }

            await db_service.create_user(user_data)

            logger.info(f"✅ Default user created with ID: {user_data['id']}")
            logger.warning("⚠️  Default PIN is '0000' - user should change this during first login")

            return {
                'created': True,
                'message': 'Default user created successfully',
                'user_id': user_data['id']
            }

        except Exception as e:
            logger.error(f"❌ Error creating default user: {str(e)}")
            return {
                'created': False,
                'message': f'Error: {str(e)}',
                'user_id': None
            }

    @staticmethod
    async def initialize_database(seed_categories: bool = True, create_default_user: bool = True) -> dict:
        """
        Main initialization function - creates tables and optionally seeds data

        Args:
            seed_categories: Whether to seed default categories
            create_default_user: Whether to create a default user if none exists

        Returns:
            Dictionary with initialization results
        """
        logger.info("🚀 Starting automatic database initialization...")

        result = {
            'success': False,
            'tables_created': 0,
            'tables_skipped': 0,
            'categories_seeded': 0,
            'user_created': False,
            'verified': False,
            'message': '',
            'errors': []
        }

        try:
            # Step 1: Create tables
            logger.info("📝 Step 1: Creating tables...")
            tables_created, tables_skipped = await DatabaseInitializer.create_tables()
            result['tables_created'] = tables_created
            result['tables_skipped'] = tables_skipped

            logger.info(f"📊 Tables: {tables_created} created, {tables_skipped} already existed")

            # Step 2: Verify database
            logger.info("📝 Step 2: Verifying database...")
            verified = await DatabaseInitializer.verify_database()
            result['verified'] = verified

            if not verified:
                error_msg = 'Database verification failed - some tables are missing'
                result['errors'].append(error_msg)
                logger.error(f"❌ {error_msg}")
                result['message'] = error_msg
                return result

            # Step 3: Seed default categories if requested
            if seed_categories:
                logger.info("📝 Step 3: Seeding default categories...")
                categories_seeded = await DatabaseInitializer.seed_default_categories()
                result['categories_seeded'] = categories_seeded

            # Step 4: Create default user if requested
            if create_default_user:
                logger.info("📝 Step 4: Creating default user if needed...")
                user_result = await DatabaseInitializer.create_default_user()
                result['user_created'] = user_result['created']
                if user_result.get('user_id'):
                    result['user_id'] = user_result['user_id']

            result['success'] = True
            result['message'] = 'Database initialized successfully'
            logger.info("✅ Database initialization completed successfully")

        except Exception as e:
            error_msg = f'Initialization error: {str(e)}'
            result['message'] = error_msg
            result['errors'].append(error_msg)
            logger.error(f"❌ Database initialization failed: {str(e)}", exc_info=True)

        return result


# Singleton instance
db_initializer = DatabaseInitializer()
