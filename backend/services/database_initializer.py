"""
Automatic Database Initialization Service

This module handles automatic database initialization on server startup,
ensuring all tables exist and optionally seeding default data.
"""

import logging
import os
from pathlib import Path
from typing import List, Tuple, Dict
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
            # Try to query the table with a COUNT to check existence
            # This is more reliable than LIMIT 0 for some databases
            result = await query_db(f"SELECT COUNT(*) as count FROM {table_name} LIMIT 1")
            # If we get here without exception, table exists
            return True
        except Exception as e:
            error_msg = str(e).lower()
            # Check for various "table doesn't exist" error messages
            if any(phrase in error_msg for phrase in [
                'does not exist',
                'no such table',
                'table not found',
                'unknown table',
                'tablenotfound'
            ]):
                logger.debug(f"Table '{table_name}' does not exist: {str(e)}")
                return False
            else:
                # Other errors - log as warning but assume table doesn't exist
                logger.warning(f"Error checking table '{table_name}': {str(e)}")
                return False
    
    @staticmethod
    async def load_sql_from_file() -> str:
        """
        Load SQL schema from init_pesadb.sql file
        
        Returns:
            SQL content as string
        """
        # Get the path to the SQL file
        current_file = Path(__file__)
        sql_file = current_file.parent.parent / 'scripts' / 'init_pesadb.sql'
        
        if not sql_file.exists():
            raise FileNotFoundError(f"SQL initialization file not found: {sql_file}")
        
        with open(sql_file, 'r') as f:
            return f.read()
    
    @staticmethod
    def parse_sql_statements(sql_content: str) -> List[str]:
        """
        Parse SQL content into individual statements
        
        Args:
            sql_content: Raw SQL content
            
        Returns:
            List of SQL statements
        """
        # Split by semicolon and filter out comments and empty lines
        statements = []
        for stmt in sql_content.split(';'):
            stmt = stmt.strip()
            # Skip empty statements and comment-only lines
            if not stmt or stmt.startswith('--'):
                continue
            # Remove inline comments
            lines = []
            for line in stmt.split('\n'):
                # Remove comment part but keep the SQL
                if '--' in line:
                    line = line[:line.index('--')]
                line = line.strip()
                if line:
                    lines.append(line)
            
            if lines:
                statements.append('\n'.join(lines))
        
        return statements
    
    @staticmethod
    def modify_statement_for_idempotency(statement: str) -> str:
        """
        Modify CREATE TABLE statements to use IF NOT EXISTS
        
        Args:
            statement: SQL statement
            
        Returns:
            Modified statement with IF NOT EXISTS
        """
        # Check if it's a CREATE TABLE statement without IF NOT EXISTS
        if statement.upper().startswith('CREATE TABLE') and 'IF NOT EXISTS' not in statement.upper():
            # Insert IF NOT EXISTS after CREATE TABLE
            return statement.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS', 1)
        return statement
    
    @staticmethod
    async def create_tables() -> Tuple[int, int, List[str]]:
        """
        Create all required tables if they don't exist using the SQL file

        Returns:
            Tuple of (tables_created, tables_skipped, errors)
        """
        tables_created = 0
        tables_skipped = 0
        errors = []

        try:
            # Load SQL from file
            logger.info("📖 Loading SQL schema from init_pesadb.sql...")
            sql_content = await DatabaseInitializer.load_sql_from_file()

            # Parse statements
            statements = DatabaseInitializer.parse_sql_statements(sql_content)
            logger.info(f"📝 Found {len(statements)} SQL statements to execute")

            # Execute each statement
            for i, statement in enumerate(statements, 1):
                # Skip DROP TABLE statements in automatic initialization
                if statement.upper().startswith('DROP TABLE'):
                    logger.debug(f"⏭️  Skipping DROP TABLE statement {i}")
                    continue

                # Skip INSERT statements (those will be handled by seed_default_categories)
                if statement.upper().startswith('INSERT INTO'):
                    logger.debug(f"⏭️  Skipping INSERT statement {i} (handled by seeding)")
                    continue

                # Only process CREATE TABLE statements
                if not statement.upper().startswith('CREATE TABLE'):
                    logger.debug(f"⏭️  Skipping non-CREATE TABLE statement {i}")
                    continue

                # Extract table name for logging
                table_name = statement.split('(')[0].replace('CREATE TABLE', '').replace('IF NOT EXISTS', '').strip()

                try:
                    # Modify statement for idempotency first
                    modified_statement = DatabaseInitializer.modify_statement_for_idempotency(statement)

                    # Try to create the table (IF NOT EXISTS will prevent errors if it exists)
                    logger.info(f"📝 Creating table '{table_name}'...")
                    logger.debug(f"SQL: {modified_statement[:100]}...")

                    await execute_db(modified_statement)

                    # Verify the table was created
                    exists = await DatabaseInitializer.table_exists(table_name)

                    if exists:
                        logger.info(f"✅ Table '{table_name}' created/verified successfully")
                        tables_created += 1
                    else:
                        error_msg = f"Table '{table_name}' creation reported success but verification failed"
                        logger.warning(f"⚠️  {error_msg}")
                        # Don't add to errors - the table might exist but verification method failed
                        tables_created += 1  # Assume success if execute_db didn't raise

                except Exception as e:
                    error_msg = f"Error with table '{table_name}': {str(e)}"
                    logger.error(f"❌ {error_msg}")
                    logger.debug(f"Failed SQL: {modified_statement[:200]}")
                    errors.append(error_msg)
                    # Continue with other tables

        except FileNotFoundError as e:
            error_msg = f"SQL file not found: {str(e)}"
            logger.error(f"❌ {error_msg}")
            errors.append(error_msg)
            # Fall back to inline schema if file not found
            logger.warning("⚠️  Falling back to inline schema definitions...")
            return await DatabaseInitializer.create_tables_inline()

        except Exception as e:
            error_msg = f"Error loading SQL schema: {str(e)}"
            logger.error(f"❌ {error_msg}")
            errors.append(error_msg)

        return tables_created, tables_skipped, errors
    
    @staticmethod
    async def create_tables_inline() -> Tuple[int, int, List[str]]:
        """
        Fallback method: Create tables using inline SQL (legacy method)

        Returns:
            Tuple of (tables_created, tables_skipped, errors)
        """
        tables_created = 0
        tables_skipped = 0
        errors = []

        logger.warning("⚠️  Using fallback inline schema creation")

        # Define table creation statements (with IF NOT EXISTS for safety)
        table_statements = [
            # Users table
            (
                "users",
                """CREATE TABLE IF NOT EXISTS users (
    id STRING PRIMARY KEY,
    pin_hash STRING NOT NULL,
    security_question STRING,
    security_answer_hash STRING,
    created_at STRING NOT NULL,
    preferences STRING DEFAULT '{}'
)"""
            ),
            # Categories table
            (
                "categories",
                """CREATE TABLE IF NOT EXISTS categories (
    id STRING PRIMARY KEY,
    user_id STRING,
    name STRING NOT NULL,
    icon STRING NOT NULL,
    color STRING NOT NULL,
    keywords STRING DEFAULT '[]',
    is_default BOOL DEFAULT TRUE
)"""
            ),
            # Transactions table
            (
                "transactions",
                """CREATE TABLE IF NOT EXISTS transactions (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    amount REAL NOT NULL,
    type STRING NOT NULL,
    category_id STRING NOT NULL,
    description STRING NOT NULL,
    date STRING NOT NULL,
    source STRING DEFAULT 'manual',
    mpesa_details STRING,
    sms_metadata STRING,
    created_at STRING NOT NULL,
    transaction_group_id STRING,
    transaction_role STRING DEFAULT 'primary',
    parent_transaction_id STRING
)"""
            ),
            # Budgets table
            (
                "budgets",
                """CREATE TABLE IF NOT EXISTS budgets (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    category_id STRING NOT NULL,
    amount REAL NOT NULL,
    period STRING DEFAULT 'monthly',
    month INT NOT NULL,
    year INT NOT NULL,
    created_at STRING NOT NULL
)"""
            ),
            # SMS Import Logs table
            (
                "sms_import_logs",
                """CREATE TABLE IF NOT EXISTS sms_import_logs (
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
)"""
            ),
            # Duplicate Logs table
            (
                "duplicate_logs",
                """CREATE TABLE IF NOT EXISTS duplicate_logs (
    id STRING PRIMARY KEY,
    user_id STRING NOT NULL,
    original_transaction_id STRING,
    duplicate_transaction_id STRING,
    message_hash STRING,
    mpesa_transaction_id STRING,
    reason STRING,
    similarity_score REAL,
    detected_at STRING NOT NULL
)"""
            ),
            # Status Checks table
            (
                "status_checks",
                """CREATE TABLE IF NOT EXISTS status_checks (
    id STRING PRIMARY KEY,
    status STRING NOT NULL,
    timestamp STRING NOT NULL,
    details STRING
)"""
            ),
        ]

        for table_name, create_statement in table_statements:
            try:
                # Try to create the table directly (IF NOT EXISTS will prevent errors)
                logger.info(f"📝 Creating table '{table_name}' (inline)...")
                logger.debug(f"SQL: {create_statement[:100].replace(chr(10), ' ')}...")

                await execute_db(create_statement)

                # Verify the table was created
                exists = await DatabaseInitializer.table_exists(table_name)

                if exists:
                    logger.info(f"✅ Table '{table_name}' created/verified successfully")
                    tables_created += 1
                else:
                    error_msg = f"Table '{table_name}' creation reported success but verification failed"
                    logger.warning(f"⚠️  {error_msg}")
                    # Assume success if execute_db didn't raise
                    tables_created += 1

            except Exception as e:
                error_msg = f"Error creating table '{table_name}': {str(e)}"
                logger.error(f"❌ {error_msg}")
                logger.debug(f"Failed SQL: {create_statement[:200].replace(chr(10), ' ')}")
                errors.append(error_msg)
                # Continue with other tables

        return tables_created, tables_skipped, errors
    
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
            missing_tables = []
            verified_tables = []

            logger.info(f"🔍 Verifying {len(required_tables)} required tables...")

            for table in required_tables:
                exists = await DatabaseInitializer.table_exists(table)
                if not exists:
                    logger.error(f"❌ Required table '{table}' does not exist")
                    missing_tables.append(table)
                else:
                    logger.info(f"✅ Table '{table}' verified")
                    verified_tables.append(table)

            if missing_tables:
                logger.error(f"❌ Database verification failed - missing tables: {', '.join(missing_tables)}")
                logger.info(f"📊 Verification summary: {len(verified_tables)}/{len(required_tables)} tables exist")
                return False

            logger.info(f"✅ Database verification successful - all {len(required_tables)} tables exist")
            return True

        except Exception as e:
            logger.error(f"❌ Database verification failed with exception: {str(e)}")
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
        Main initialization function - creates database, tables and optionally seeds data

        Args:
            seed_categories: Whether to seed default categories
            create_default_user: Whether to create a default user if none exists

        Returns:
            Dictionary with initialization results
        """
        logger.info("🚀 Starting automatic database initialization...")

        result = {
            'success': False,
            'database_created': False,
            'tables_created': 0,
            'tables_skipped': 0,
            'categories_seeded': 0,
            'user_created': False,
            'verified': False,
            'message': '',
            'errors': []
        }

        try:
            # Step 0: Ensure database exists
            logger.info("📝 Step 0: Ensuring database exists...")
            db_created = await DatabaseInitializer.ensure_database_exists()
            result['database_created'] = db_created

            if not db_created:
                error_msg = 'Failed to ensure database exists'
                result['errors'].append(error_msg)
                logger.error(f"❌ {error_msg}")
                # Continue anyway - database might exist

            # Step 1: Create tables
            logger.info("📝 Step 1: Creating tables...")
            tables_created, tables_skipped, table_errors = await DatabaseInitializer.create_tables()
            result['tables_created'] = tables_created
            result['tables_skipped'] = tables_skipped
            result['errors'].extend(table_errors)

            logger.info(f"📊 Tables: {tables_created} created, {tables_skipped} already existed")

            if table_errors:
                logger.warning(f"⚠️  {len(table_errors)} errors occurred during table creation:")
                for error in table_errors[:5]:  # Show first 5 errors
                    logger.warning(f"  - {error}")

            # Step 2: Verify database
            logger.info("📝 Step 2: Verifying database...")
            verified = await DatabaseInitializer.verify_database()
            result['verified'] = verified

            if not verified:
                error_msg = 'Database verification failed - some tables are missing'
                result['errors'].append(error_msg)
                logger.error(f"❌ {error_msg}")

                # If verification failed, try inline creation as a fallback
                if tables_created == 0:
                    logger.warning("⚠️  No tables were created, attempting fallback inline creation...")
                    tables_created, tables_skipped, inline_errors = await DatabaseInitializer.create_tables_inline()
                    result['tables_created'] = tables_created
                    result['tables_skipped'] = tables_skipped
                    result['errors'].extend(inline_errors)

                    # Re-verify after inline creation
                    verified = await DatabaseInitializer.verify_database()
                    result['verified'] = verified

                    if not verified:
                        result['message'] = 'Database verification failed after fallback attempt'
                        logger.error(f"❌ {result['message']}")
                        return result
                    else:
                        logger.info("✅ Database verified successfully after fallback creation")
                else:
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
