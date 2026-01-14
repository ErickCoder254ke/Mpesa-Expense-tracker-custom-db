# Enhanced SMS Date Extraction

This document describes the enhanced SMS date extraction functionality implemented for the M-Pesa Expense Tracker.

## Overview

The SMS parser now automatically extracts transaction dates and times from M-Pesa SMS messages when available, providing more accurate transaction timing instead of relying solely on the import date.

## Supported Date Formats

The parser can extract dates from M-Pesa messages in the following format:
- `on DD/MM/YY at HH:MM AM/PM`

### Examples:
- `on 3/10/25 at 10:55 PM` → October 3, 2025 at 10:55 PM
- `on 4/10/25 at 4:38 PM` → October 4, 2025 at 4:38 PM
- `on 6/10/25 at 7:43 AM` → October 6, 2025 at 7:43 AM

## Message Examples

The parser successfully extracts dates from messages like:

```
TJ3CF6GKC7 Confirmed.You have received Ksh100.00 from Equity Bulk Account 300600 on 3/10/25 at 10:55 PM New M-PESA balance is Ksh111.86.
```

```
TJ4CF6I7HN Confirmed. Ksh100.00 sent to KPLC PREPAID for account 54405080323 on 4/10/25 at 4:38 PM New M-PESA balance is Ksh110.86.
```

## Implementation Details

### Backend Changes

1. **Enhanced Pattern Matching**: Updated regex patterns in `MPesaParser.parse_message()` to better capture date/time information from various M-Pesa message formats.

2. **Improved Date Parsing**: Enhanced `parse_transaction_date()` method to handle different date formats and edge cases.

3. **Prioritized Date Usage**: Modified SMS import logic to:
   - First use the extracted date from the SMS message
   - Fall back to user-provided date if no SMS date available
   - Use current time as final fallback

### Frontend Changes

1. **UI Indicators**: Added visual indicators in the SMS import interface to show when dates are extracted from SMS messages vs. user-provided dates.

2. **Updated Instructions**: Modified user instructions to explain the automatic date extraction feature.

3. **Type Safety**: Updated TypeScript interfaces to include the `transaction_date` field in parsed SMS data.

## Date Processing Flow

1. **SMS Parsing**: When an SMS is parsed, the system looks for date/time patterns in the message text.

2. **Date Extraction**: If found, the date is parsed into ISO format (e.g., "2025-10-03T22:55:00").

3. **Import Priority**: During import, the system uses this order of precedence:
   - Extracted SMS date/time (highest priority)
   - User-provided fallback date
   - Current timestamp (lowest priority)

4. **Database Storage**: The final date is stored with the transaction record.

## Benefits

- **Accuracy**: Transactions are recorded with their actual occurrence time, not import time
- **Historical Imports**: Bulk imports of old SMS messages maintain correct chronological order
- **User Experience**: Reduced manual date entry when importing messages
- **Data Integrity**: More accurate financial tracking and reporting

## User Interface

In the SMS import screen, users will see:
- An "SMS" indicator next to dates extracted from SMS messages
- Clear fallback date selection for messages without extractable dates
- Updated instructions explaining the automatic date extraction

## Error Handling

The system gracefully handles:
- Messages without date information (falls back to user date)
- Invalid date formats (falls back to user date)
- Parsing errors (falls back to current time)
- Edge cases like invalid dates or times

## Testing

The enhanced date extraction has been tested with real M-Pesa message formats provided by users, ensuring compatibility with current Safaricom SMS formats.

## Future Enhancements

Potential improvements include:
- Support for additional date formats
- Timezone handling for different regions
- Date validation against reasonable transaction date ranges
- Machine learning for improving date extraction accuracy
