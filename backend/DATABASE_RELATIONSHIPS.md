# Database Relationships and Schema Design

## Overview
This document describes the database schema, table relationships, and referential integrity constraints for the M-Pesa Expense Tracker application.

**Schema Version:** 2.1.0  
**Last Updated:** 2026-01-16  
**Database:** PesaDB (SQL)

---

## Table Dependency Order

Tables must be created (and deleted) in the following order to respect foreign key constraints:

### Creation Order:
1. `users` (no dependencies)
2. `categories` (depends on users)
3. `status_checks` (no dependencies)
4. `transactions` (depends on users, categories, self)
5. `budgets` (depends on users, categories)
6. `sms_import_logs` (depends on users)
7. `duplicate_logs` (depends on users, transactions)

### Deletion Order (reverse):
1. `duplicate_logs`
2. `sms_import_logs`
3. `budgets`
4. `transactions` (must handle self-referential constraints)
5. `categories`
6. `status_checks`
7. `users`

---

## Table Relationships

### 1. Users Table (Base Table)
**Purpose:** Stores user accounts with email/password authentication

```sql
CREATE TABLE users (
    id STRING PRIMARY KEY,
    email STRING,
    password_hash STRING,
    name STRING,
    created_at STRING,
    preferences STRING
);
```

**Relationships:**
- Has many `categories` (user-created categories)
- Has many `transactions`
- Has many `budgets`
- Has many `sms_import_logs`
- Has many `duplicate_logs`

**Referential Integrity:**
- When a user is deleted, all related records should be cascaded/handled:
  - ✅ Delete all user's transactions
  - ✅ Delete all user's budgets
  - ✅ Delete all user's import logs
  - ✅ Delete all user's duplicate logs
  - ✅ Delete all user-created categories (keep system categories)

---

### 2. Categories Table
**Purpose:** Expense and income categories for classification

```sql
CREATE TABLE categories (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    name STRING,
    icon STRING,
    color STRING,
    keywords STRING,
    is_default BOOL
);
```

**Relationships:**
- Belongs to `users` (optional - 'system' for default categories)
- Has many `transactions`
- Has many `budgets`

**Special Cases:**
- System categories have `user_id = 'system'`
- System categories should not be deletable
- Default categories are seeded during initialization

**Referential Integrity:**
- When a category is deleted:
  - ⚠️ Prevent deletion if transactions exist (or reassign to 'cat-other')
  - ⚠️ Prevent deletion if budgets exist
  - ✅ Only allow deletion of user-created categories (not system)

**Default Categories:**
- Food & Dining (`cat-food`)
- Transport (`cat-transport`)
- Shopping (`cat-shopping`)
- Bills & Utilities (`cat-bills`)
- Entertainment (`cat-entertainment`)
- Health & Fitness (`cat-health`)
- Education (`cat-education`)
- Airtime & Data (`cat-airtime`)
- Money Transfer (`cat-transfers`)
- Savings & Investments (`cat-savings`)
- Income (`cat-income`)
- Other (`cat-other`)

---

### 3. Transactions Table
**Purpose:** Stores all financial transactions (expenses and income)

```sql
CREATE TABLE transactions (
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
);
```

**Relationships:**
- Belongs to `users` (required)
- Belongs to `categories` (required)
- Has optional `parent_transaction` (self-referential for fees)
- Has many child transactions (fees, deductions)
- Referenced by `duplicate_logs`

**Self-Referential Relationship:**
```
Primary Transaction (amount: 500)
  ↓ parent_transaction_id
  ├── Transaction Fee (amount: 5, role: 'fee')
  ├── Fuliza Deduction (amount: 20, role: 'fuliza_deduction')
  └── Access Fee (amount: 2, role: 'access_fee')
```

**Transaction Roles:**
- `primary`: Main transaction
- `fee`: Transaction fee
- `fuliza_deduction`: Fuliza loan deduction
- `access_fee`: Access fee charge

**Referential Integrity:**
- When deleting a transaction:
  - ✅ Delete all child transactions first (fees, deductions)
  - ⚠️ Prevent deletion if it's referenced as a parent
  - ✅ Remove references from duplicate_logs

**Data Types:**
- `mpesa_details`: JSON string containing M-Pesa specific data
- `sms_metadata`: JSON string containing SMS parsing metadata
- `transaction_group_id`: Groups related transactions from same SMS
- `source`: 'manual', 'sms', or 'api'
- `type`: 'expense' or 'income'

---

### 4. Budgets Table
**Purpose:** Monthly budget goals per category

```sql
CREATE TABLE budgets (
    id STRING PRIMARY KEY,
    user_id STRING REFERENCES users(id),
    category_id STRING REFERENCES categories(id),
    amount FLOAT,
    period STRING,
    month INT,
    year INT,
    created_at STRING
);
```

**Relationships:**
- Belongs to `users` (required)
- Belongs to `categories` (required)

**Business Rules:**
- One budget per category per month per user
- Budget periods are currently only 'monthly'
- Month: 1-12 (January-December)
- Year: 4-digit year

**Referential Integrity:**
- When deleting a budget:
  - ✅ Simple deletion, no cascading effects
- When deleting a category:
  - ⚠️ Prevent deletion if budgets exist
- When deleting a user:
  - ✅ Cascade delete all user's budgets

---

### 5. SMS Import Logs Table
**Purpose:** Tracks SMS import sessions for auditing

```sql
CREATE TABLE sms_import_logs (
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
);
```

**Relationships:**
- Belongs to `users` (required)

**Data Types:**
- `transactions_created`: JSON array of transaction IDs
- `errors`: JSON array of error messages

**Referential Integrity:**
- When deleting a user:
  - ✅ Cascade delete all user's import logs

---

### 6. Duplicate Logs Table
**Purpose:** Tracks duplicate transaction detection for auditing

```sql
CREATE TABLE duplicate_logs (
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
);
```

**Relationships:**
- Belongs to `users` (required)
- References `transactions` (original)
- References `transactions` (duplicate)

**Referential Integrity:**
- When deleting a transaction:
  - ✅ Clean up related duplicate logs
- When deleting a user:
  - ✅ Cascade delete all user's duplicate logs

---

### 7. Status Checks Table
**Purpose:** System health monitoring and diagnostics

```sql
CREATE TABLE status_checks (
    id STRING PRIMARY KEY,
    status STRING,
    timestamp STRING,
    details STRING
);
```

**Relationships:**
- No foreign key dependencies

**Referential Integrity:**
- Standalone table, no cascading effects

---

## Entity Relationship Diagram

```
┌─────────────┐
│   USERS     │
│  (Base)     │
└──────┬──────┘
       │
       ├──────────────────────────────────────────┐
       │                                          │
       ↓                                          ↓
┌─────────────┐                          ┌──────────────┐
│ CATEGORIES  │                          │ TRANSACTIONS │
│             │←─────────────────────────│              │
└──────┬──────┘    category_id           │      ↓       │
       │                                  │ parent_txn_id│
       │                                  │  (self-ref)  │
       ↓                                  └──────┬───────┘
┌─────────────┐                                 │
│   BUDGETS   │                                 │
│             │                                 │
└─────────────┘                                 │
       ↑                                        │
       │                                        │
       └────────────────────────────────────────┘
                    category_id

┌──────────────────┐           ┌─────────────────┐
│ SMS_IMPORT_LOGS  │           │ DUPLICATE_LOGS  │
│                  │           │                 │
└──────────────────┘           └─────────────────┘
        ↑                              ↑
        │                              │
        └──────────┬───────────────────┘
                   │
                   ↓
            ┌────────────┐
            │   USERS    │
            └────────────┘

┌─────────────────┐
│ STATUS_CHECKS   │
│  (Independent)  │
└─────────────────┘
```

---

## Cascading Delete Strategy

### Option 1: Application-Level Cascading (Current)
Foreign keys are defined but cascading is handled in application code.

**Advantages:**
- Full control over deletion logic
- Can implement soft deletes
- Better logging and auditing
- PesaDB compatibility

**Disadvantages:**
- More code to maintain
- Risk of orphaned records if not implemented correctly

### Option 2: Database-Level Cascading (Future)
Use `ON DELETE CASCADE` in foreign key definitions (if PesaDB supports it).

**Example:**
```sql
user_id STRING REFERENCES users(id) ON DELETE CASCADE
```

---

## PesaDB-Specific Considerations

### Supported Features:
- ✅ PRIMARY KEY
- ✅ REFERENCES (foreign keys)
- ✅ Basic data types (STRING, INT, FLOAT, BOOL)

### NOT Supported:
- ❌ IF NOT EXISTS
- ❌ DEFAULT keyword
- ❌ NOT NULL constraint
- ❌ AUTO_INCREMENT
- ❌ ON DELETE CASCADE (needs verification)
- ❌ ON UPDATE CASCADE (needs verification)

### Workarounds:
1. **No IF NOT EXISTS**: Check table existence before CREATE
2. **No DEFAULT**: Set defaults in application code
3. **No NOT NULL**: Validate in application code
4. **No AUTO_INCREMENT**: Use UUID generation in application

---

## Data Integrity Best Practices

### 1. Prevent Orphaned Records
Always check for dependent records before deletion:

```python
# Before deleting a category
transaction_count = await db_service.count_transactions(user_id, category_id)
if transaction_count > 0:
    raise ValueError("Cannot delete category with existing transactions")
```

### 2. Handle Self-Referential Constraints
Delete child transactions before parent:

```python
# Before deleting a transaction
if transaction.parent_transaction_id is None:
    # Delete all child transactions first
    child_txns = await db_service.get_transactions(
        user_id=user_id,
        parent_transaction_id=transaction.id
    )
    for child in child_txns:
        await db_service.delete_transaction(child.id, user_id)
```

### 3. Protect System Data
Prevent deletion of system categories:

```python
# Before deleting a category
if category.user_id == 'system' or category.is_default:
    raise ValueError("Cannot delete system category")
```

### 4. Validate Foreign Keys
Always validate that referenced records exist before insertion:

```python
# Before creating a transaction
category = await db_service.get_category_by_id(transaction.category_id)
if not category:
    raise ValueError(f"Category {transaction.category_id} does not exist")
```

---

## Migration Notes

### Schema Version History:

**v2.1.0 (2026-01-16)** - Current
- ✅ Added proper foreign key relationships
- ✅ Updated inline schema to match SQL file
- ✅ Added comprehensive relationship documentation

**v2.0.0 (Previous)**
- Email/Password authentication
- Migrated from PIN-based auth

**v1.0.0 (Deprecated)**
- PIN-based authentication
- Original schema

### Applying Schema Updates:

1. **Check current schema version:**
   ```bash
   python backend/scripts/verify_database_schema.py
   ```

2. **Backup existing data:**
   ```bash
   # Use data export functionality
   ```

3. **Run initialization with new schema:**
   ```bash
   python backend/scripts/init_database.py
   ```

4. **Verify relationships:**
   - Check that foreign keys are enforced
   - Test cascading delete behavior
   - Validate data integrity

---

## Testing Checklist

### Relationship Tests:
- [ ] Create user and verify categories can be created
- [ ] Create transaction and verify category reference works
- [ ] Create transaction with parent_transaction_id
- [ ] Try to delete category with existing transactions (should fail)
- [ ] Try to delete user and verify cascade behavior
- [ ] Test duplicate transaction detection logs
- [ ] Verify system categories cannot be deleted

### Edge Cases:
- [ ] NULL values in optional foreign keys
- [ ] Self-referential transaction chains (fees)
- [ ] Multiple levels of transaction grouping
- [ ] Category deletion with budgets
- [ ] User deletion with active transactions

---

## Troubleshooting

### Common Issues:

**1. Foreign Key Constraint Violation**
```
Error: Foreign key constraint failed
```
**Solution:** Ensure referenced record exists before insertion.

**2. Cannot Delete Record**
```
Error: Cannot delete record with dependent records
```
**Solution:** Delete dependent records first, or implement cascading delete.

**3. Orphaned Records**
```
Error: Transaction references non-existent category
```
**Solution:** Run data integrity check and cleanup script.

### Verification Queries:

```sql
-- Find orphaned transactions (no user)
SELECT * FROM transactions 
WHERE user_id NOT IN (SELECT id FROM users);

-- Find orphaned transactions (no category)
SELECT * FROM transactions 
WHERE category_id NOT IN (SELECT id FROM categories);

-- Find orphaned budgets
SELECT * FROM budgets 
WHERE category_id NOT IN (SELECT id FROM categories);

-- Find broken parent transaction references
SELECT * FROM transactions 
WHERE parent_transaction_id IS NOT NULL 
  AND parent_transaction_id NOT IN (SELECT id FROM transactions);
```

---

## Future Enhancements

### Potential Improvements:
1. **Indexes**: Add indexes on foreign key columns for better query performance
2. **Composite Keys**: Consider composite unique constraints (e.g., user_id + category_id + month + year for budgets)
3. **Soft Deletes**: Add `deleted_at` column instead of hard deletes
4. **Audit Trail**: Add `updated_at` and `updated_by` columns
5. **Database Triggers**: If PesaDB supports triggers, add automatic timestamp updates

### Schema Evolution:
- Document all future schema changes
- Maintain migration scripts
- Test migrations on staging environment first
- Keep backward compatibility when possible

---

## References

- **SQL File**: `backend/scripts/init_pesadb.sql`
- **Initialization Service**: `backend/services/database_initializer.py`
- **Database Service**: `backend/services/pesadb_service.py`
- **PesaDB Config**: `backend/config/pesadb.py`
- **Models**: `backend/models/`

---

**Last Updated:** 2026-01-16  
**Maintained By:** Development Team  
**Schema Version:** 2.1.0
