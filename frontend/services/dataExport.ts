import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

interface Transaction {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  category_id: string;
  description: string;
  date: string;
  created_at: string;
  source?: 'manual' | 'sms' | 'api';
  mpesa_details?: {
    recipient?: string;
    reference?: string;
    transaction_id?: string;
    phone_number?: string;
    balance_after?: number;
    message_type?: string;
    transaction_fee?: number;
    access_fee?: number;
    service_fee?: number;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

class DataExportService {
  /**
   * Convert transactions to CSV format
   */
  transactionsToCSV(transactions: Transaction[], categories: Category[]): string {
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

    // CSV Headers
    const headers = [
      'Date',
      'Time',
      'Type',
      'Amount',
      'Category',
      'Description',
      'Source',
      'Recipient/Sender',
      'Reference',
      'Transaction ID',
      'Transaction Fee',
      'Access Fee',
      'Service Fee',
      'Balance After',
      'Created At'
    ];

    const rows = transactions.map(txn => {
      const date = new Date(txn.date);
      const createdAt = new Date(txn.created_at);
      
      return [
        date.toLocaleDateString('en-US'),
        date.toLocaleTimeString('en-US', { hour12: false }),
        txn.type,
        txn.amount.toFixed(2),
        categoryMap.get(txn.category_id) || 'Unknown',
        this.escapeCSV(txn.description),
        txn.source || 'manual',
        this.escapeCSV(txn.mpesa_details?.recipient || ''),
        this.escapeCSV(txn.mpesa_details?.reference || ''),
        txn.mpesa_details?.transaction_id || '',
        txn.mpesa_details?.transaction_fee?.toFixed(2) || '0.00',
        txn.mpesa_details?.access_fee?.toFixed(2) || '0.00',
        txn.mpesa_details?.service_fee?.toFixed(2) || '0.00',
        txn.mpesa_details?.balance_after?.toFixed(2) || '',
        createdAt.toISOString()
      ];
    });

    // Combine headers and rows
    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * Escape special characters for CSV
   */
  private escapeCSV(value: string): string {
    if (!value) return '';
    
    // Wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }

  /**
   * Export transactions to CSV and share
   */
  async exportTransactions(
    transactions: Transaction[],
    categories: Category[],
    filename?: string
  ): Promise<boolean> {
    try {
      if (transactions.length === 0) {
        Alert.alert('No Data', 'There are no transactions to export');
        return false;
      }

      // Generate CSV content
      const csvContent = this.transactionsToCSV(transactions, categories);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const defaultFilename = `mpesa_transactions_${timestamp}.csv`;
      const finalFilename = filename || defaultFilename;

      // Create file path
      const fileUri = `${FileSystem.documentDirectory}${finalFilename}`;

      // Write CSV to file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transactions',
          UTI: 'public.comma-separated-values-text',
        });
        return true;
      } else {
        Alert.alert(
          'Export Complete',
          `File saved to: ${fileUri}\n\nSharing is not available on this device.`
        );
        return true;
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export transactions. Please try again.');
      return false;
    }
  }

  /**
   * Generate summary statistics text
   */
  generateSummaryText(
    transactions: Transaction[],
    categories: Category[]
  ): string {
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
    
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expenses;
    
    const categoryBreakdown = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const categoryName = categoryMap.get(t.category_id) || 'Unknown';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const topCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => `${name}: KSh ${amount.toFixed(2)}`)
      .join('\n');
    
    const totalFees = transactions.reduce((sum, t) => {
      const txnFee = t.mpesa_details?.transaction_fee || 0;
      const accessFee = t.mpesa_details?.access_fee || 0;
      const serviceFee = t.mpesa_details?.service_fee || 0;
      return sum + txnFee + accessFee + serviceFee;
    }, 0);
    
    return `
M-Pesa Expense Tracker - Financial Summary
============================================

Period: ${new Date(transactions[0]?.date).toLocaleDateString()} - ${new Date(transactions[transactions.length - 1]?.date).toLocaleDateString()}
Total Transactions: ${transactions.length}

FINANCIAL OVERVIEW
------------------
Total Income:    KSh ${income.toFixed(2)}
Total Expenses:  KSh ${expenses.toFixed(2)}
Balance:         KSh ${balance.toFixed(2)}
Total Fees Paid: KSh ${totalFees.toFixed(2)}

TOP SPENDING CATEGORIES
-----------------------
${topCategories}

TRANSACTION BREAKDOWN
---------------------
Income Transactions:  ${transactions.filter(t => t.type === 'income').length}
Expense Transactions: ${transactions.filter(t => t.type === 'expense').length}
SMS Imported:         ${transactions.filter(t => t.source === 'sms').length}
Manual Entries:       ${transactions.filter(t => t.source === 'manual').length}

Generated: ${new Date().toLocaleString()}
    `.trim();
  }

  /**
   * Export summary as text file
   */
  async exportSummary(
    transactions: Transaction[],
    categories: Category[]
  ): Promise<boolean> {
    try {
      if (transactions.length === 0) {
        Alert.alert('No Data', 'There are no transactions to summarize');
        return false;
      }

      const summaryText = this.generateSummaryText(transactions, categories);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `mpesa_summary_${timestamp}.txt`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, summaryText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Export Summary',
        });
        return true;
      } else {
        Alert.alert(
          'Export Complete',
          `Summary saved to: ${fileUri}\n\nSharing is not available on this device.`
        );
        return true;
      }
    } catch (error) {
      console.error('Export summary error:', error);
      Alert.alert('Export Failed', 'Failed to export summary. Please try again.');
      return false;
    }
  }

  /**
   * Share quick summary via any app
   */
  async shareSummary(transactions: Transaction[], categories: Category[]): Promise<boolean> {
    try {
      const summaryText = this.generateSummaryText(transactions, categories);
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Not Available', 'Sharing is not supported on this device');
        return false;
      }

      // Create temporary file
      const fileUri = `${FileSystem.cacheDirectory}summary.txt`;
      await FileSystem.writeAsStringAsync(fileUri, summaryText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Financial Summary',
      });

      return true;
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Failed', 'Failed to share summary');
      return false;
    }
  }
}

export default new DataExportService();
