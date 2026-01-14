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
            # Try a simple SELECT query to check if table exists
            # Use LIMIT 1 to minimize data transfer
            result = await query_db(f"SELECT * FROM {table_name} LIMIT 1")
            # If we get here without exception, table exists
            logger.debug(f"✅ Table '{table_name}' exists")
            return True
        except Exception as e:
            error_msg = str(e).lower()
            # Check for various "table doesn't exist" error messages
            if any(phrase in error_msg for phrase in [
                'does not exist',
                'no such table',
                'table not found',
                'unknown table',
                'tablenotfound',
                'not found'
            ]):
                logger.debug(f"Table '{table_name}' does not exist: {str(e)}")
                return False
            else:
                # Other errors (like syntax errors) - log as warning
                # For deployment safety, assume table doesn't exist if we can't verify
                logger.warning(f"⚠️  Error checking table '{table_name}': {str(e)}")
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
    def is_create_table_statement(statement: str) -> bool:
        """
        Check if a statement is a CREATE TABLE statement

        Args:
            statement: SQL statement

        Returns:
            True if it's a CREATE TABLE statement
        """
        return statement.upper().strip().startswith('CREATE TABLE')

    @staticmethod
    def extract_table_name_from_create(statement: str) -> str:
        """
        Extract table name from a CREATE TABLE statement

        Args:
            statement: CREATE TABLE SQL statement

        Returns:
            Table name
        """
        # Parse "CREATE TABLE table_name (" to extract table_name
        parts = statement.split('(')
        if len(parts) > 0:
            table_part = parts[0].replace('CREATE TABLE', '').replace('IF NOT EXISTS', '').strip()
            return table_part
        return 'unknown'
    
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

                # Only process CREATE TABLE statements here
                # INSERT statements will be handled after table creation
                if not statement.upper().startswith('CREATE TABLE'):
                    logger.debug(f"⏭️  Skipping non-CREATE TABLE statement {i}")
                    continue

                # Extract table name for logging
                table_name = DatabaseInitializer.extract_table_name_from_create(statement)

                try:
                    # Check if table already exists
                    exists = await DatabaseInitializer.table_exists(table_name)

                    if exists:
                        logger.info(f"✅ Table '{table_name}' already exists, skipping creation")
                        tables_skipped += 1
                        continue

                    # Try to create the table
                    logger.info(f"📝 Creating table '{table_name}'...")
                    logger.debug(f"SQL: {statement[:100]}...")

                    await execute_db(statement)

                    # Verify the table was created
                    exists = await DatabaseInitializer.table_exists(table_name)

                    if exists:
                        logger.info(f"✅ Table '{table_name}' created successfully")
                        tables_created += 1
                    else:
                        error_msg = f"Table '{table_name}' creation reported success but verification failed"
                        logger.warning(f"⚠️  {error_msg}")
                        # Assume success if execute_db didn't raise
                        tables_created += 1

                except Exception as e:
                    error_str = str(e).lower()
                    # Check if error is because table already exists
                    if any(phrase in error_str for phrase in [
                        'already exists',
                        'table exists',
                        'duplicate',
                        'exist'
                    ]):
                        logger.info(f"✅ Table '{table_name}' already exists (detected from error)")
                        tables_skipped += 1
                    else:
                        error_msg = f"Error creating table '{table_name}': {str(e)}"
                        logger.error(f"❌ {error_msg}")
                        logger.debug(f"Failed SQL: {statement[:200]}")
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

        # After tables are created, execute INSERT statements
        logger.info("📦 Now executing INSERT statements for seed data...")
        try:
            sql_content = await DatabaseInitializer.load_sql_from_file()
            statements = DatabaseInitializer.parse_sql_statements(sql_content)

            insert_count = 0
            insert_errors = 0

            for i, statement in enumerate(statements, 1):
                if statement.upper().startswith('INSERT INTO'):
                    try:
                        # Extract rough table name for logging
                        table_name = statement.split('INSERT INTO')[1].split('(')[0].strip()
                        logger.debug(f"📝 Inserting seed data into '{table_name}'...")
                        await execute_db(statement)
                        insert_count += 1
                    except Exception as e:
                        # Check if error is due to duplicate entry
                        error_str = str(e).lower()
                        if any(phrase in error_str for phrase in [
                            'duplicate',
                            'already exists',
                            'unique',
                            'constraint'
                        ]):
                            logger.debug(f"⏭️  Seed data already exists, skipping...")
                        else:
                            insert_errors += 1
                            logger.warning(f"⚠️  Error inserting seed data: {str(e)}")

            if insert_count > 0:
                logger.info(f"✅ Inserted {insert_count} seed data records")
            if insert_errors > 0:
                logger.warning(f"⚠️  {insert_errors} seed data insertion errors (may be duplicates)")

        except Exception as e:
            logger.warning(f"⚠️  Error executing seed data: {str(e)}")

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

        # Define table creation statements
        # Note: PesaDB doesn't support IF NOT EXISTS, DEFAULT, or NOT NULL in CREATE TABLE
        # These are removed to match actual PesaDB capabilities
        table_statements = [
            # Users table
            (
                "users",
                """CREATE TABLE users (
    id STRING PRIMARY KEY,
    pin_hash STRING,
    security_question STRING,
    security_answer_hash STRING,
    created_at STRING,
    preferences STRING
)"""
            ),
            # Categories table
            (
                "categories",
                """CREATE TABLE categories (
    id STRING PRIMARY KEY,
    user_id STRING,
    name STRING,
    icon STRING,
    color STRING,
    keywords STRING,
    is_default BOOL
)"""
            ),
            # Transactions table
            (
                "transactions",
                """CREATE TABLE transactions (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    amount FLOAT,
    type STRING,
    category_id STRING REFERENCES categories(id),
    description STRING,
    date STRING,
    source STRING,
    mpesa_details STRING,
    sms_metadata STRING,
    created_at STRING,
    transaction_group_id STRING,
    transaction_role STRING,
    parent_transaction_id STRING
)"""
            ),
            # Budgets table
            (
                "budgets",
                """CREATE TABLE budgets (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    category_id STRING REFERENCES categories(id),
    amount FLOAT,
    period STRING,
    month INT,
    year INT,
    created_at STRING
)"""
            ),
            # SMS Import Logs table
            (
                "sms_import_logs",
                """CREATE TABLE sms_import_logs (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    import_session_id STRING,
    total_messages INT,
    successful_imports INT,
    duplicates_found INT,
    parsing_errors INT,
    transactions_created STRING,
    errors STRING,
    created_at STRING
)"""
            ),
            # Duplicate Logs table
            (
                "duplicate_logs",
                """CREATE TABLE duplicate_logs (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    original_transaction_id STRING,
    duplicate_transaction_id STRING,
    message_hash STRING,
    mpesa_transaction_id STRING,
    reason STRING,
    similarity_score FLOAT,
    detected_at STRING
)"""
            ),
            # Status Checks table
            (
                "status_checks",
                """CREATE TABLE status_checks (
    id STRING PRIMARY KEY,
    status STRING,
    timestamp STRING,
    details STRING
)"""
            ),
        ]

        for table_name, create_statement in table_statements:
            try:
                # Check if table already exists first
                exists = await DatabaseInitializer.table_exists(table_name)

                if exists:
                    logger.info(f"✅ Table '{table_name}' already exists, skipping (inline)")
                    tables_skipped += 1
                    continue

                # Try to create the table
                logger.info(f"📝 Creating table '{table_name}' (inline)...")
                logger.debug(f"SQL: {create_statement[:100].replace(chr(10), ' ')}...")

                await execute_db(create_statement)

                # Verify the table was created
                exists = await DatabaseInitializer.table_exists(table_name)

                if exists:
                    logger.info(f"✅ Table '{table_name}' created successfully")
                    tables_created += 1
                else:
                    error_msg = f"Table '{table_name}' creation reported success but verification failed"
                    logger.warning(f"⚠️  {error_msg}")
                    # Assume success if execute_db didn't raise
                    tables_created += 1

            except Exception as e:
                error_str = str(e).lower()
                # Check if error is because table already exists
                if any(phrase in error_str for phrase in [
                    'already exists',
                    'table exists',
                    'duplicate',
                    'exist'
                ]):
                    logger.info(f"✅ Table '{table_name}' already exists (detected from error)")
                    tables_skipped += 1
                else:
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
        Note: This is now primarily handled by INSERT statements in the SQL file
        This method remains as a fallback/verification

        Returns:
            Number of categories seeded
        """
        try:
            # Check if categories already exist
            categories_count = await query_db("SELECT COUNT(1) as count FROM categories")
            if categories_count and categories_count[0]['count'] > 0:
                logger.info(f"✅ Categories already seeded ({categories_count[0]['count']} exist)")
                return 0

            logger.warning("⚠️  No categories found - this should have been handled by SQL file")
            logger.info("📦 Attempting fallback category seeding...")

            # This is now a fallback - the SQL file should handle seeding
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
                ('cat-income', 'Income', '💵', '#90EE90', '["salary", "income", "payment", "received"]'),
                ('cat-other', 'Other', '📌', '#D4A5A5', '[]'),
            ]

            seeded_count = 0
            for cat_id, name, icon, color, keywords in default_categories:
                try:
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

            if seeded_count > 0:
                logger.info(f"✅ Fallback seeded {seeded_count} default categories")
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
