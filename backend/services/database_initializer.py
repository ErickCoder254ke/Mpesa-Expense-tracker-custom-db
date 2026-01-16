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
from config.pesadb_fallbacks import count_rows_safe

logger = logging.getLogger(__name__)


class DatabaseInitializer:
    """Service for automatic database initialization"""

    # Schema version - increment when schema changes
    SCHEMA_VERSION = "2.1.0"  # 2.1.0 = Proper foreign key relationships
    # Previous: 2.0.0 = Email/Password authentication
    # Previous: 1.0.0 = PIN-based authentication (deprecated)

    @staticmethod
    async def ensure_database_exists() -> bool:
        """
        Ensure the target database exists

        IMPORTANT: PesaDB databases must be pre-created via dashboard.
        This method validates configuration but doesn't create databases.

        Returns:
            True (assumes database is pre-created in PesaDB dashboard)
        """
        database_name = os.environ.get('PESADB_DATABASE', 'mpesa_tracker')

        logger.info(f"📝 Using PesaDB database: '{database_name}'")
        logger.info(f"   ℹ️  Ensure this database exists in your PesaDB dashboard")
        logger.info(f"   ℹ️  PesaDB databases cannot be created via API")

        # Database should already exist in PesaDB dashboard
        # We'll verify connectivity by attempting a simple query later
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
    async def check_users_table_schema() -> dict:
        """
        Check if the users table has the correct schema for email/password authentication

        Returns:
            dict with schema check results
        """
        result = {
            'exists': False,
            'has_correct_schema': False,
            'has_email': False,
            'has_password_hash': False,
            'is_old_schema': False,
            'needs_migration': False
        }

        try:
            # Check if table exists first
            exists = await DatabaseInitializer.table_exists('users')
            result['exists'] = exists

            if not exists:
                logger.debug("Users table does not exist yet - will be created with correct schema")
                return result

            # Try to query with email column
            try:
                await query_db("SELECT id, email FROM users LIMIT 1")
                result['has_email'] = True
                logger.debug("✅ Users table has 'email' column")
            except Exception as e:
                if 'email' in str(e).lower() and 'not' in str(e).lower():
                    result['has_email'] = False
                    logger.warning("⚠️  Users table missing 'email' column - old schema detected")

            # Try to query with password_hash column
            try:
                await query_db("SELECT id, password_hash FROM users LIMIT 1")
                result['has_password_hash'] = True
                logger.debug("✅ Users table has 'password_hash' column")
            except Exception as e:
                if 'password_hash' in str(e).lower() and 'not' in str(e).lower():
                    result['has_password_hash'] = False
                    logger.warning("⚠️  Users table missing 'password_hash' column - old schema detected")

            # Determine schema status
            result['has_correct_schema'] = result['has_email'] and result['has_password_hash']
            result['is_old_schema'] = not result['has_correct_schema']
            result['needs_migration'] = result['exists'] and not result['has_correct_schema']

        except Exception as e:
            logger.error(f"Error checking users table schema: {str(e)}")
            result['error'] = str(e)

        return result

    @staticmethod
    async def migrate_users_table():
        """
        Migrate users table from old schema to new email/password schema

        Returns:
            True if migration succeeded, False otherwise
        """
        logger.warning("🔄 Starting automatic users table migration...")
        logger.warning("⚠️  This will drop the old users table and create a new one")
        logger.warning("⚠️  All existing users will be deleted")

        try:
            # Step 1: Drop old users table
            logger.info("📝 Dropping old users table...")
            try:
                await execute_db("DROP TABLE users")
                logger.info("✅ Old users table dropped")
            except Exception as e:
                error_msg = str(e).lower()
                if 'does not exist' in error_msg or 'not found' in error_msg:
                    logger.info("ℹ️  Users table already dropped or didn't exist")
                else:
                    logger.error(f"Error dropping users table: {str(e)}")
                    raise

            # Step 2: Create new users table with correct schema
            logger.info("📝 Creating users table with email/password schema...")
            create_statement = """CREATE TABLE users (
    id STRING PRIMARY KEY,
    email STRING,
    password_hash STRING,
    name STRING,
    created_at STRING,
    preferences STRING
)"""
            await execute_db(create_statement)
            logger.info("✅ New users table created with email/password schema")

            # Step 3: Verify new schema
            schema_check = await DatabaseInitializer.check_users_table_schema()
            if schema_check['has_correct_schema']:
                logger.info("✅ Users table migration completed successfully")
                logger.info("   New schema verified: email and password_hash columns present")
                return True
            else:
                logger.error("❌ Migration completed but schema verification failed")
                return False

        except Exception as e:
            logger.error(f"❌ Users table migration failed: {str(e)}", exc_info=True)
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
            # Remove inline comments first
            lines = []
            for line in stmt.split('\n'):
                # Remove comment part (everything after --)
                if '--' in line:
                    line = line[:line.index('--')]
                line = line.strip()
                if line:  # Only add non-empty lines
                    lines.append(line)

            # Join lines and check if we have a real statement
            if lines:
                full_statement = ' '.join(lines)
                # Only include statements that have SQL keywords
                if any(keyword in full_statement.upper() for keyword in ['CREATE', 'INSERT', 'UPDATE', 'DELETE', 'SELECT', 'DROP', 'ALTER']):
                    statements.append(full_statement)

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
            logger.info(f"   ✅ SQL file loaded successfully ({len(sql_content)} characters)")

            # Parse statements
            statements = DatabaseInitializer.parse_sql_statements(sql_content)
            logger.info(f"📝 Parsed {len(statements)} executable SQL statements")

            if len(statements) == 0:
                raise ValueError("SQL file contains no executable statements")

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

                    # Verify the table was created - CRITICAL CHECK
                    exists = await DatabaseInitializer.table_exists(table_name)

                    if exists:
                        logger.info(f"✅ Table '{table_name}' created successfully")
                        tables_created += 1
                    else:
                        # FIXED: Do NOT assume success when verification fails
                        error_msg = f"Table '{table_name}' creation reported success but verification failed - table does not exist"
                        logger.error(f"❌ {error_msg}")
                        logger.error(f"   This indicates a silent failure during table creation")
                        logger.error(f"   SQL: {statement[:200]}...")
                        errors.append(error_msg)

                        # Check if this is a critical table that blocks others
                        critical_tables = ['users', 'categories']
                        if table_name in critical_tables:
                            logger.error(f"   ⚠️  CRITICAL: '{table_name}' is required for other tables")
                            logger.error(f"   Further table creation may fail due to foreign key constraints")

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
                        logger.error(f"Failed SQL: {statement[:200]}")

                        # Check if this is a foreign key constraint error
                        if any(phrase in error_str for phrase in [
                            'foreign key',
                            'constraint',
                            'references',
                            'violates'
                        ]):
                            logger.error(f"   💡 HINT: This looks like a foreign key constraint issue")
                            logger.error(f"   Ensure parent tables (users, categories) were created first")

                        errors.append(error_msg)
                    # Continue with other tables

        except FileNotFoundError as e:
            error_msg = f"SQL file not found: {str(e)}"
            logger.error(f"❌ {error_msg}")
            logger.error(f"   Expected location: backend/scripts/init_pesadb.sql")
            errors.append(error_msg)
            # Fall back to inline schema if file not found
            logger.warning("⚠️  Falling back to inline schema definitions...")
            return await DatabaseInitializer.create_tables_inline()

        except ValueError as e:
            error_msg = f"SQL parsing error: {str(e)}"
            logger.error(f"❌ {error_msg}")
            errors.append(error_msg)
            logger.warning("⚠️  Falling back to inline schema definitions...")
            return await DatabaseInitializer.create_tables_inline()

        except Exception as e:
            error_msg = f"Error loading SQL schema: {str(e)}"
            logger.error(f"❌ {error_msg}")
            errors.append(error_msg)
            logger.warning("⚠️  Falling back to inline schema definitions...")
            return await DatabaseInitializer.create_tables_inline()

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
                        logger.debug(f"✅ Seed data inserted into '{table_name}'")
                    except Exception as e:
                        # Check if error is due to duplicate entry or foreign key
                        error_str = str(e).lower()
                        if any(phrase in error_str for phrase in [
                            'duplicate',
                            'already exists',
                            'unique'
                        ]):
                            logger.debug(f"⏭️  Seed data already exists in '{table_name}', skipping...")
                        elif any(phrase in error_str for phrase in [
                            'foreign key',
                            'constraint',
                            'references',
                            'does not exist'
                        ]):
                            insert_errors += 1
                            logger.error(f"❌ Foreign key constraint error for '{table_name}': {str(e)}")
                            logger.error(f"   This usually means a referenced record doesn't exist")
                            errors.append(f"Foreign key error in {table_name}: {str(e)}")
                        else:
                            insert_errors += 1
                            logger.warning(f"⚠️  Error inserting seed data into '{table_name}': {str(e)}")

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
        logger.warning("⚠️  IMPORTANT: Ensure inline schema matches init_pesadb.sql file!")
        logger.warning(f"⚠️  Schema Version: {DatabaseInitializer.SCHEMA_VERSION}")

        # Define table creation statements
        # Note: PesaDB doesn't support IF NOT EXISTS, DEFAULT, or NOT NULL in CREATE TABLE
        # Foreign key relationships are defined using REFERENCES
        # Tables must be created in dependency order: users → categories → transactions/budgets
        table_statements = [
            # Users table (base table with no dependencies)
            (
                "users",
                """CREATE TABLE users (
    id STRING PRIMARY KEY,
    email STRING,
    password_hash STRING,
    name STRING,
    created_at STRING,
    preferences STRING
)"""
            ),
            # Categories table (references users)
            (
                "categories",
                """CREATE TABLE categories (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    name STRING,
    icon STRING,
    color STRING,
    keywords STRING,
    is_default BOOL
)"""
            ),
            # Transactions table (references users, categories, and self)
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
    parent_transaction_id STRING REFERENCES transactions(id)
)"""
            ),
            # Budgets table (references users and categories)
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
            # SMS Import Logs table (references users)
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
            # Duplicate Logs table (references users and transactions)
            (
                "duplicate_logs",
                """CREATE TABLE duplicate_logs (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    original_transaction_id STRING REFERENCES transactions(id),
    duplicate_transaction_id STRING REFERENCES transactions(id),
    message_hash STRING,
    mpesa_transaction_id STRING,
    reason STRING,
    duplicate_reasons STRING,
    duplicate_confidence FLOAT,
    similarity_score FLOAT,
    detected_at STRING,
    action_taken STRING
)"""
            ),
            # Status Checks table (no dependencies)
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

                # Verify the table was created - CRITICAL CHECK
                exists = await DatabaseInitializer.table_exists(table_name)

                if exists:
                    logger.info(f"✅ Table '{table_name}' created successfully")
                    tables_created += 1
                else:
                    # FIXED: Do NOT assume success when verification fails
                    error_msg = f"Table '{table_name}' creation reported success but verification failed - table does not exist"
                    logger.error(f"❌ {error_msg}")
                    logger.error(f"   This indicates a silent failure during table creation")
                    logger.error(f"   SQL: {create_statement[:200].replace(chr(10), ' ')}...")
                    errors.append(error_msg)

                    # Check if this is a critical table that blocks others
                    critical_tables = ['users', 'categories']
                    if table_name in critical_tables:
                        logger.error(f"   ⚠️  CRITICAL: '{table_name}' is required for other tables")
                        logger.error(f"   Further table creation may fail due to foreign key constraints")

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
                    logger.error(f"Failed SQL: {create_statement[:200].replace(chr(10), ' ')}")

                    # Check if this is a foreign key constraint error
                    if any(phrase in error_str for phrase in [
                        'foreign key',
                        'constraint',
                        'references',
                        'violates'
                    ]):
                        logger.error(f"   💡 HINT: This looks like a foreign key constraint issue")
                        logger.error(f"   Ensure parent tables (users, categories) were created first")

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
            # Check if categories already exist using fallback-safe count
            categories_count = await count_rows_safe('categories', query_func=query_db)
            if categories_count > 0:
                logger.info(f"✅ Categories already seeded ({categories_count} exist)")
                return 0

            logger.warning("⚠️  No categories found - this should have been handled by SQL file")
            logger.info("📦 Attempting fallback category seeding...")

            # Ensure system user exists first (required for foreign key constraint)
            try:
                system_user_check = await query_db("SELECT * FROM users WHERE id = 'system' LIMIT 1")
                if not system_user_check or len(system_user_check) == 0:
                    logger.info("📝 Creating system user for category foreign key constraint...")
                    system_user_sql = """
                    INSERT INTO users (id, email, password_hash, name, created_at, preferences)
                    VALUES ('system', 'system@internal', 'SYSTEM_ACCOUNT_NO_LOGIN', 'System Account', '2026-01-16T00:00:00Z', '{"is_system": true}')
                    """
                    await execute_db(system_user_sql)
                    logger.info("✅ System user created")
                else:
                    logger.info("✅ System user already exists")
            except Exception as e:
                logger.error(f"❌ Error ensuring system user exists: {str(e)}")
                logger.error("   Cannot seed categories without system user (foreign key constraint)")
                return 0

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
                    VALUES ('{cat_id}', 'system', '{safe_name}', '{icon}', '{color}', '{keywords}', TRUE)
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

            # Create default user with email "admin@example.com" and password "admin123"
            default_email = "admin@example.com"
            default_password = "admin123"
            password_hash = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt())

            user_data = {
                'id': str(uuid.uuid4()),
                'email': default_email,
                'password_hash': password_hash.decode('utf-8'),
                'name': 'Admin User',
                'created_at': datetime.utcnow().isoformat(),
                'preferences': '{"default_currency": "KES", "is_default": true}'
            }

            await db_service.create_user(user_data)

            logger.info(f"✅ Default user created with ID: {user_data['id']}")
            logger.warning("⚠️  Default credentials: email='admin@example.com', password='admin123' - user should change this during first login")

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
            'migrated': False,
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

            # Step 0.5: Check for schema migration needs
            logger.info("📝 Step 0.5: Checking users table schema...")
            schema_check = await DatabaseInitializer.check_users_table_schema()

            if schema_check['needs_migration']:
                logger.warning("⚠️  OLD SCHEMA DETECTED - Users table needs migration!")
                logger.warning("   Current schema is PIN-based, need to migrate to email/password")

                # Automatically migrate
                migration_success = await DatabaseInitializer.migrate_users_table()
                result['migrated'] = migration_success

                if not migration_success:
                    error_msg = 'Users table migration failed - signup/login will not work'
                    result['errors'].append(error_msg)
                    logger.error(f"❌ {error_msg}")
                else:
                    logger.info("✅ Users table migrated successfully to email/password schema")
            elif schema_check['exists'] and schema_check['has_correct_schema']:
                logger.info("✅ Users table already has correct email/password schema")
            else:
                logger.info("ℹ️  Users table will be created with correct schema")

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

            # Print detailed summary
            logger.info("=" * 80)
            logger.info("DATABASE INITIALIZATION SUMMARY")
            logger.info("=" * 80)
            logger.info(f"Tables Created: {result['tables_created']}")
            logger.info(f"Tables Skipped (already exist): {result['tables_skipped']}")
            logger.info(f"Categories Seeded: {result['categories_seeded']}")
            logger.info(f"Default User Created: {result.get('user_created', False)}")
            logger.info(f"Database Verified: {result['verified']}")

            if result['errors']:
                logger.error(f"Errors Encountered: {len(result['errors'])}")
                logger.error("Error Details:")
                for idx, error in enumerate(result['errors'][:10], 1):  # Show first 10 errors
                    logger.error(f"  {idx}. {error}")
                if len(result['errors']) > 10:
                    logger.error(f"  ... and {len(result['errors']) - 10} more errors")
            else:
                logger.info("Errors: None")

            logger.info("=" * 80)

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
