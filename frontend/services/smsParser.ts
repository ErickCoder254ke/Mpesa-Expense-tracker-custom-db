import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ParsedSMSData,
  SMSImportResult,
  Category,
  FeeBreakdown,
  FulizaDetails
} from '@/types/transaction';
import { BACKEND_URL } from '@/config/api';

class SMSParserService {
  private baseURL: string;

  constructor() {
    this.baseURL = BACKEND_URL;
  }

  /**
   * Parse a single SMS message
   */
  async parseSingleSMS(message: string): Promise<{
    success: boolean;
    parsed_data?: ParsedSMSData;
    available_categories?: Category[];
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/sms/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.detail || 'Failed to parse SMS',
        };
      }

      const data = await response.json();
      // Normalize response to match frontend expectations
      return {
        success: data.success,
        data: data.parsed_data,
        available_categories: data.available_categories
      };
    } catch (error) {
      console.error('Error parsing SMS:', error);
      return {
        success: false,
        error: 'Network error parsing SMS',
      };
    }
  }

  /**
   * Import multiple SMS messages
   */
  async importSMSMessages(
    messages: string[],
    options: {
      auto_categorize?: boolean;
      require_review?: boolean;
      transaction_date?: string;
    } = {}
  ): Promise<{
    success: boolean;
    result?: SMSImportResult;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/sms/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          auto_categorize: options.auto_categorize ?? true,
          require_review: options.require_review ?? false,
          transaction_date: options.transaction_date,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.detail || 'Failed to import SMS messages',
        };
      }

      const result = await response.json();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error importing SMS messages:', error);
      return {
        success: false,
        error: 'Network error importing SMS messages',
      };
    }
  }

  /**
   * Create a transaction from parsed SMS data
   */
  async createTransactionFromParsedSMS(
    parsedData: ParsedSMSData,
    categoryId: string
  ): Promise<{
    success: boolean;
    transaction?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/sms/create-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parsed_data: parsedData,
          category_id: categoryId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.detail || 'Failed to create transaction',
        };
      }

      const transaction = await response.json();
      return {
        success: true,
        transaction,
      };
    } catch (error) {
      console.error('Error creating transaction from SMS:', error);
      return {
        success: false,
        error: 'Network error creating transaction',
      };
    }
  }

  /**
   * Test the parser with sample messages
   */
  async testParser(): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/sms/test-parser`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to test parser',
        };
      }

      const results = await response.json();
      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error('Error testing parser:', error);
      return {
        success: false,
        error: 'Network error testing parser',
      };
    }
  }

  /**
   * Split multiple SMS messages from a single text paste
   */
  splitMultipleMessages(text: string): string[] {
    if (!text || !text.trim()) {
      return [];
    }

    // M-Pesa transaction ID pattern: Usually starts with letters followed by numbers
    // Examples: TJ6CF6NDST, TJ6CF6OZYR, etc.
    const transactionIdPattern = /([A-Z0-9]{6,12})\s*Confirmed/gi;

    // Find all transaction ID matches with their positions
    const matches = Array.from(text.matchAll(transactionIdPattern));

    console.log('Split messages debug:', {
      textLength: text.length,
      matchesFound: matches.length,
      matches: matches.map(m => ({
        match: m[0],
        index: m.index,
        transactionId: m[1]
      }))
    });

    if (matches.length <= 1) {
      // If no clear transaction ID pattern, try other splitting methods
      console.log('Using fallback splitting method');
      return this.fallbackSplitMessages(text);
    }

    const messages: string[] = [];

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];

      const startIndex = currentMatch.index || 0;
      const endIndex = nextMatch ? (nextMatch.index || text.length) : text.length;

      const message = text.substring(startIndex, endIndex).trim();

      console.log(`Message ${i + 1}:`, {
        startIndex,
        endIndex,
        length: message.length,
        preview: message.substring(0, 100) + '...',
        isMPesa: this.isMPesaMessage(message)
      });

      if (message.length > 20 && this.isMPesaMessage(message)) {
        messages.push(message);
      }
    }

    console.log('Final split result:', messages.length, 'messages');
    return messages;
  }

  /**
   * Fallback message splitting for cases without clear transaction IDs
   */
  private fallbackSplitMessages(text: string): string[] {
    let messages: string[] = [];

    // Try splitting by common M-Pesa message patterns
    const patterns = [
      /\n\s*\n+/g, // Double newlines
      /\n(?=\d{1,2}\/\d{1,2}\/\d{2,4})/g, // Newline followed by date
      /\n(?=[A-Z]{2,}\d+\s+confirmed)/gi, // Newline followed by "XXXXX confirmed"
      /\n(?=\w+\s+received)/gi, // Newline followed by "XXX received"
      /\n(?=you have)/gi, // Newline followed by "You have"
      /(?=confirmed)/gi, // Split before "Confirmed" (case insensitive)
    ];

    // First try double newlines (most common)
    messages = text.split(/\n\s*\n+/).map(msg => msg.trim()).filter(msg => msg.length > 0);

    // If we only got one message, try other delimiters
    if (messages.length === 1) {
      // Try splitting by single newlines if each line looks like a complete message
      const lines = text.split(/\n+/).map(line => line.trim()).filter(line => line.length > 0);

      // Check if multiple lines contain M-Pesa keywords
      const mpesaLines = lines.filter(line => this.isMPesaMessage(line));

      if (mpesaLines.length > 1) {
        messages = mpesaLines;
      } else {
        // Try splitting by "Confirmed" keyword if still one message
        const confirmedSplit = text.split(/(?=\w+\s+confirmed)/gi).map(msg => msg.trim()).filter(msg => msg.length > 20);
        if (confirmedSplit.length > 1) {
          messages = confirmedSplit;
        }
      }
    }

    // Filter out non-M-Pesa messages and very short messages
    return messages.filter(msg =>
      msg.length > 20 &&
      this.isMPesaMessage(msg)
    );
  }

  /**
   * Parse multiple SMS messages
   */
  async parseMultipleSMS(messages: string[]): Promise<{
    success: boolean;
    results?: Array<{
      message: string;
      success: boolean;
      parsed_data?: ParsedSMSData;
      available_categories?: Category[];
      error?: string;
    }>;
    error?: string;
  }> {
    try {
      const results = await Promise.all(
        messages.map(async (message) => {
          const result = await this.parseSingleSMS(message);
          return {
            message,
            success: result.success,
            parsed_data: result.data,
            available_categories: result.available_categories,
            error: result.error
          };
        })
      );

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error parsing multiple SMS:', error);
      return {
        success: false,
        error: 'Failed to parse multiple SMS messages'
      };
    }
  }

  /**
   * Check if a message looks like an M-Pesa transaction
   */
  isMPesaMessage(message: string): boolean {
    const messageLower = message.toLowerCase();

    // Primary M-Pesa indicators
    const primaryKeywords = [
      'confirmed', 'mpesa', 'm-pesa', 'safaricom', 'fuliza'
    ];

    // Secondary M-Pesa indicators
    const secondaryKeywords = [
      'paybill', 'till', 'lipa na mpesa',
      'transaction id', 'receipt', 'sent to', 'received from',
      'withdrawn', 'deposited', 'balance', 'ksh', 'kes',
      'new m-pesa balance', 'transaction cost', 'access fee',
      'outstanding', 'repayment', 'loan'
    ];

    // Transaction ID pattern (letters and numbers, typically 8-12 characters)
    const hasTransactionId = /[A-Z0-9]{6,12}\s+confirmed/i.test(message);

    // Currency pattern
    const hasCurrency = /ksh?\.?\s*\d+/i.test(message);

    // Must have at least one primary keyword or transaction ID pattern
    const hasPrimaryIndicator = primaryKeywords.some(keyword => messageLower.includes(keyword)) || hasTransactionId;

    // Should have currency amount
    const hasAmount = hasCurrency;

    // Additional validation: should have at least one secondary keyword for more confidence
    const hasSecondaryIndicator = secondaryKeywords.some(keyword => messageLower.includes(keyword));

    return hasPrimaryIndicator && hasAmount && (hasSecondaryIndicator || hasTransactionId);
  }

  /**
   * Extract amount from message for quick preview
   */
  extractAmountPreview(message: string): number | null {
    const amountRegex = /(?:ksh?|kes)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
    const match = message.match(amountRegex);
    
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      return isNaN(amount) ? null : amount;
    }
    
    return null;
  }

  /**
   * Extract transaction fees from message for quick preview
   */
  extractFeesPreview(message: string): FeeBreakdown | null {
    const messageLower = message.toLowerCase();
    const fees: Record<string, number> = {};

    // Extract transaction cost (map to transaction_fee for consistency)
    const transactionCostMatch = message.match(/transaction cost[:\\s,]*(?:ksh?|kes)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)/i);
    if (transactionCostMatch) {
      const cost = parseFloat(transactionCostMatch[1].replace(/,/g, ''));
      if (!isNaN(cost)) {
        fees.transaction_fee = cost; // Use transaction_fee instead of transaction_cost
      }
    }

    // Extract access fee (Fuliza)
    const accessFeeMatch = message.match(/access fee charged[:\\s]*(?:ksh?|kes)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)/i);
    if (accessFeeMatch) {
      const accessFee = parseFloat(accessFeeMatch[1].replace(/,/g, ''));
      if (!isNaN(accessFee)) {
        fees.access_fee = accessFee;
      }
    }

    const totalFees = Object.values(fees).reduce((sum, fee) => sum + fee, 0);

    if (totalFees > 0) {
      return { totalFees, breakdown: fees };
    }

    return null;
  }

  /**
   * Check if message is a Fuliza message
   */
  isFulizaMessage(message: string): boolean {
    return message.toLowerCase().includes('fuliza');
  }

  /**
   * Extract Fuliza-specific details from message
   */
  extractFulizaDetails(message: string): FulizaDetails | null {
    if (!this.isFulizaMessage(message)) {
      return null;
    }

    const messageLower = message.toLowerCase();

    // Check if it's a loan
    const isLoan = messageLower.includes('fuliza m-pesa amount is');

    // Check if it's a repayment - handle both 'pay' and 'repay' variations
    const isRepayment = messageLower.includes('has been used to') &&
                       (messageLower.includes('pay') || messageLower.includes('repay')) &&
                       messageLower.includes('fuliza');

    const details: any = { isLoan, isRepayment };

    // Extract outstanding amount
    const outstandingMatch = message.match(/outstanding amount is\\s+(?:ksh?|kes)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)/i);
    if (outstandingMatch) {
      const outstanding = parseFloat(outstandingMatch[1].replace(/,/g, ''));
      if (!isNaN(outstanding)) {
        details.outstanding = outstanding;
      }
    }

    // Extract Fuliza limit
    const limitMatch = message.match(/fuliza m-pesa limit is\\s+(?:ksh?|kes)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)/i);
    if (limitMatch) {
      const limit = parseFloat(limitMatch[1].replace(/,/g, ''));
      if (!isNaN(limit)) {
        details.limit = limit;
      }
    }

    // Extract due date
    const dueDateMatch = message.match(/due on\\s+([0-9/]+)/i);
    if (dueDateMatch) {
      details.dueDate = dueDateMatch[1];
    }

    return details;
  }

  /**
   * Store SMS processing preferences
   */
  async saveSMSPreferences(preferences: {
    auto_categorize: boolean;
    require_review: boolean;
    enabled: boolean;
  }): Promise<void> {
    try {
      await AsyncStorage.setItem('sms_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving SMS preferences:', error);
      // Fallback: store in memory for web platforms if AsyncStorage fails
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sms_preferences', JSON.stringify(preferences));
        } catch (localStorageError) {
          console.error('LocalStorage fallback failed:', localStorageError);
        }
      }
    }
  }

  /**
   * Get SMS processing preferences
   */
  async getSMSPreferences(): Promise<{
    auto_categorize: boolean;
    require_review: boolean;
    enabled: boolean;
  }> {
    try {
      const preferencesStr = await AsyncStorage.getItem('sms_preferences');
      if (preferencesStr) {
        return JSON.parse(preferencesStr);
      }
    } catch (error) {
      console.error('Error getting SMS preferences:', error);
      // Fallback: try localStorage for web platforms
      if (typeof window !== 'undefined') {
        try {
          const localPrefs = localStorage.getItem('sms_preferences');
          if (localPrefs) {
            return JSON.parse(localPrefs);
          }
        } catch (localStorageError) {
          console.error('LocalStorage fallback failed:', localStorageError);
        }
      }
    }

    // Default preferences
    return {
      auto_categorize: true,
      require_review: false,
      enabled: false,
    };
  }

  /**
   * Store processed message hashes to avoid reprocessing
   */
  async markMessageAsProcessed(messageHash: string): Promise<void> {
    try {
      const processed = await this.getProcessedMessages();
      processed.add(messageHash);
      
      // Keep only last 1000 hashes to prevent storage bloat
      const processedArray = Array.from(processed);
      if (processedArray.length > 1000) {
        processedArray.splice(0, processedArray.length - 1000);
      }
      
      await AsyncStorage.setItem('processed_sms_hashes', JSON.stringify(processedArray));
    } catch (error) {
      console.error('Error marking message as processed:', error);
    }
  }

  /**
   * Check if message has been processed
   */
  async isMessageProcessed(message: string): Promise<boolean> {
    try {
      const messageHash = await this.hashMessage(message);
      const processed = await this.getProcessedMessages();
      return processed.has(messageHash);
    } catch (error) {
      console.error('Error checking if message is processed:', error);
      return false;
    }
  }

  /**
   * Get set of processed message hashes
   */
  private async getProcessedMessages(): Promise<Set<string>> {
    try {
      const processedStr = await AsyncStorage.getItem('processed_sms_hashes');
      if (processedStr) {
        const processedArray = JSON.parse(processedStr);
        return new Set(processedArray);
      }
    } catch (error) {
      console.error('Error getting processed messages:', error);
    }
    return new Set();
  }

  /**
   * Hash a message for duplicate detection
   */
  private async hashMessage(message: string): Promise<string> {
    // Simple hash function for client-side use
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Clear all processed message hashes (for reset/testing)
   */
  async clearProcessedMessages(): Promise<void> {
    try {
      await AsyncStorage.removeItem('processed_sms_hashes');
    } catch (error) {
      console.error('Error clearing processed messages:', error);
    }
  }

  /**
   * Test date extraction with user's specific examples (for debugging)
   */
  testDateExtraction(): void {
    console.log('=== Testing Date Extraction ===');

    const testMessages = [
      "TJ3CF6GKC7 Confirmed.You have received Ksh100.00 from Equity Bulk Account 300600 on 3/10/25 at 10:55 PM New M-PESA balance is Ksh111.86.",
      "TJ3CF6GITN Confirmed.You have received Ksh99.00 from Equity Bulk Account 300600 on 3/10/25 at 10:56 PM New M-PESA balance is Ksh210.86.",
      "TJ4CF6I7HN Confirmed. Ksh100.00 sent to KPLC PREPAID for account 54405080323 on 4/10/25 at 4:38 PM New M-PESA balance is Ksh110.86."
    ];

    testMessages.forEach((message, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log(`Text: ${message.substring(0, 80)}...`);

      // Check if it looks like M-Pesa
      console.log(`Is M-Pesa: ${this.isMPesaMessage(message)}`);

      // Extract date manually using regex
      const datePattern = /on\s+([0-9/\-]+)\s+at\s+([0-9:]+\s*(?:AM|PM)?)/i;
      const match = message.match(datePattern);

      if (match) {
        console.log(`Date found: "${match[1]}" at "${match[2]}"`);
        console.log(`Full match: "${match[0]}"`);
      } else {
        console.log('No date pattern found');
      }
    });
  }

  /**
   * Test message splitting with the user's specific examples
   */
  testMessageSplitting(): void {
    // Use the exact examples provided by the user
    const testText = "TJ6CF6NDST Confirmed.Ksh30.00 sent to SIMON  NDERITU on 6/10/25 at 7:43 AM. New M-PESA balance is Ksh21.73. Transaction cost, Ksh0.00. Amount you can       transact within the day is 499,970.00. Sign up for Lipa Na M-PESA Till online https://m-pesaforbusiness.co.keTJ6CF6OZYR Confirmed.     Ksh5.00 sent to SAFARICOM DATA BUNDLES for account SAFARICOM DATA BUNDLES on 6/10/25 at 5:14 PM. New M-PESA balance is Ksh16.73.       Transaction cost, Ksh0.00.TJ6CF6OS29 Confirmed.You have received Ksh100.00 from Equity Bulk Account 300600 on 6/10/25 at 5:19 PM New   M-PESA balance is Ksh116.73.  Separate personal and business funds through Pochi la Biashara on *334#.TJ6CF6QGF0 Confirmed. Ksh15.00   sent to SAFARICOM DATA BUNDLES for account SAFARICOM DATA BUNDLES on 6/10/25 at 11:51 PM. New M-PESA balance is Ksh101.73. Transaction cost, Ksh0.00.TJ7CF6QJUV Confirmed. Ksh30.00 sent to SIMON  NDERITU on 7/10/25 at 8:00 AM. New M-PESA balance is Ksh71.73. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,970.00. Sign up for Lipa Na M-PESA Till onlinehttps://m-pesaforbusiness.co.ke";

    console.log('=== Testing Message Splitting ===');
    console.log('Input text length:', testText.length);

    const splitMessages = this.splitMultipleMessages(testText);

    console.log('=== Split Results ===');
    console.log('Number of messages found:', splitMessages.length);

    splitMessages.forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log('Length:', msg.length);
      console.log('Preview:', msg.substring(0, 150) + (msg.length > 150 ? '...' : ''));
      console.log('Is M-Pesa:', this.isMPesaMessage(msg));
    });

    return splitMessages;
  }

  /**
   * Get duplicate statistics
   */
  async getDuplicateStatistics(): Promise<{
    success: boolean;
    stats?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/sms/duplicate-stats`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to get duplicate statistics',
        };
      }

      const stats = await response.json();
      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error getting duplicate statistics:', error);
      return {
        success: false,
        error: 'Network error getting statistics',
      };
    }
  }

  /**
   * Enhanced transaction analysis including Fuliza patterns
   */
  analyzeTransaction(message: string): {
    isFuliza: boolean;
    fulizaDetails: FulizaDetails | null;
    transactionType: 'income' | 'expense' | 'transfer';
    confidence: number;
    flags: string[];
  } {
    const isFuliza = this.isFulizaMessage(message);
    const fulizaDetails = isFuliza ? this.extractFulizaDetails(message) : null;
    const flags: string[] = [];

    let transactionType: 'income' | 'expense' | 'transfer' = 'expense';
    let confidence = 0.7;

    if (isFuliza && fulizaDetails) {
      if (fulizaDetails.isLoan) {
        transactionType = 'income';  // Fuliza loan is money received
        confidence = 0.95;
        flags.push('fuliza_loan');
      } else if (fulizaDetails.isRepayment) {
        transactionType = 'expense';  // Repayment is money going out
        confidence = 0.95;
        flags.push('fuliza_repayment');
      } else {
        flags.push('fuliza_other');
      }
    } else {
      // Non-Fuliza transaction analysis
      const messageLower = message.toLowerCase();
      if (messageLower.includes('received') || messageLower.includes('deposited')) {
        transactionType = 'income';
        confidence = 0.85;
      } else if (messageLower.includes('sent') || messageLower.includes('paid') ||
                 messageLower.includes('withdrawn') || messageLower.includes('purchased')) {
        transactionType = 'expense';
        confidence = 0.85;
      }
    }

    // Additional quality checks
    if (message.length < 50) {
      flags.push('short_message');
      confidence *= 0.8;
    }

    if (!message.match(/ksh?\s*[0-9,]+/i)) {
      flags.push('no_amount_detected');
      confidence *= 0.5;
    }

    return {
      isFuliza,
      fulizaDetails,
      transactionType,
      confidence: Math.min(confidence, 1.0),
      flags
    };
  }

  /**
   * Get user-friendly transaction summary
   */
  getTransactionSummary(parsedData: any): {
    primaryAction: string;
    amount: string;
    details: string[];
    warnings: string[];
  } {
    const analysis = this.analyzeTransaction(parsedData.original_message || '');
    const details: string[] = [];
    const warnings: string[] = [];

    // Primary action
    let primaryAction = parsedData.type === 'income' ? 'Received' : 'Sent';
    const amount = `KSh ${parsedData.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`;

    // Add details based on analysis
    if (analysis.isFuliza && analysis.fulizaDetails) {
      if (analysis.fulizaDetails.isLoan) {
        primaryAction = 'Fuliza Loan';
        if (analysis.fulizaDetails.accessFee) {
          const fee = typeof analysis.fulizaDetails.accessFee === 'number' ? analysis.fulizaDetails.accessFee : 0;
          details.push(`Access fee: KSh ${fee.toLocaleString()}`);
        }
        if (analysis.fulizaDetails.outstanding) {
          const outstanding = typeof analysis.fulizaDetails.outstanding === 'number' ? analysis.fulizaDetails.outstanding : 0;
          details.push(`New outstanding: KSh ${outstanding.toLocaleString()}`);
        }
      } else if (analysis.fulizaDetails.isRepayment) {
        primaryAction = 'Fuliza Repayment';
        if (analysis.fulizaDetails.limit) {
          const limit = typeof analysis.fulizaDetails.limit === 'number' ? analysis.fulizaDetails.limit : 0;
          details.push(`Available limit: KSh ${limit.toLocaleString()}`);
        }
      }
    }

    // Add warnings based on flags
    if (analysis.flags.includes('short_message')) {
      warnings.push('Message seems unusually short');
    }
    if (analysis.flags.includes('no_amount_detected')) {
      warnings.push('Amount could not be clearly detected');
    }
    if (analysis.confidence < 0.7) {
      warnings.push('Low confidence in parsing accuracy');
    }

    return {
      primaryAction,
      amount,
      details,
      warnings
    };
  }

  /**
   * Enhanced Fuliza categorization with detailed analysis
   */
  categorizeFulizaTransaction(message: string): {
    category: string;
    confidence: number;
    subType: string;
    details: any;
  } {
    const fulizaDetails = this.extractFulizaDetails(message);

    if (!fulizaDetails) {
      return {
        category: 'Other',
        confidence: 0.3,
        subType: 'unknown',
        details: {}
      };
    }

    if (fulizaDetails.isLoan) {
      return {
        category: 'Loans & Credit',
        confidence: 0.98,
        subType: 'fuliza_loan',
        details: {
          loanAmount: fulizaDetails.loanAmount,
          accessFee: fulizaDetails.accessFee,
          outstanding: fulizaDetails.outstanding,
          dueDate: fulizaDetails.dueDate
        }
      };
    }

    if (fulizaDetails.isRepayment) {
      return {
        category: 'Loans & Credit',
        confidence: 0.98,
        subType: 'fuliza_repayment',
        details: {
          availableLimit: fulizaDetails.limit,
          remainingOutstanding: fulizaDetails.outstanding
        }
      };
    }

    return {
      category: 'Loans & Credit',
      confidence: 0.85,
      subType: 'fuliza_other',
      details: fulizaDetails
    };
  }
}

export const smsParserService = new SMSParserService();
