import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeIcon from '@/components/SafeIcon';
import { BACKEND_URL } from '@/config/api';
import { getAuthHeaders } from '@/utils/apiClient';

interface MPesaDetails {
  recipient?: string;
  reference?: string;
  transaction_id?: string;
  phone_number?: string;
  balance_after?: number;
  message_type?: string;
  transaction_fee?: number;
}

interface SMSMetadata {
  original_message_hash?: string;
  parsing_confidence?: number;
  requires_review?: boolean;
  suggested_category?: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  category_id: string;
  description: string;
  date: string;
  created_at: string;
  source?: 'manual' | 'sms' | 'api';
  mpesa_details?: MPesaDetails;
  sms_metadata?: SMSMetadata;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Load categories and transactions in parallel
      const headers = await getAuthHeaders();
      const [categoriesResponse, transactionsResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/categories/`, { headers }),
        fetch(`${BACKEND_URL}/api/transactions/?limit=100`, { headers })
      ]);

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        console.log('Loaded transactions:', transactionsData);
        setTransactions(transactionsData);
      } else {
        console.error('Failed to load transactions:', transactionsResponse.status);
        Alert.alert('Error', 'Failed to load transactions');
      }
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Network error loading data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || {
      name: 'Unknown',
      icon: 'help-circle',
      color: '#636E72'
    };
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || transaction.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const groupedTransactions = filteredTransactions.reduce((groups: { [key: string]: Transaction[] }, transaction) => {
    const date = new Date(transaction.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.addIncomeButton}
            onPress={() => router.push('/transaction/add?type=income')}
          >
            <Ionicons name="arrow-down-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addExpenseButton}
            onPress={() => router.push('/transaction/add?type=expense')}
          >
            <Ionicons name="arrow-up-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#74C69D" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transactions..."
            placeholderTextColor="#74C69D"
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'expense', 'income'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, filterType === filter && styles.filterButtonActive]}
            onPress={() => setFilterType(filter)}
          >
            <Text style={[
              styles.filterButtonText,
              filterType === filter && styles.filterButtonTextActive
            ]}>
              {filter === 'all' ? 'All' : filter === 'expense' ? 'Expenses' : 'Income'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#00B894"
            colors={['#00B894']}
          />
        }
      >
        {Object.keys(groupedTransactions).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#415A77" />
            <Text style={styles.emptyStateTitle}>
              {searchQuery || filterType !== 'all' ? 'No matching transactions' : 'No transactions yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filter'
                : 'Start tracking your expenses and income'
              }
            </Text>
            {!searchQuery && filterType === 'all' && (
              <TouchableOpacity 
                style={styles.addFirstButton}
                onPress={() => router.push('/transaction/add')}
              >
                <Text style={styles.addFirstButtonText}>Add First Transaction</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          Object.entries(groupedTransactions)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, dayTransactions]) => (
              <View key={date} style={styles.dayGroup}>
                <Text style={styles.dayHeader}>{formatDate(date)}</Text>
                {dayTransactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((transaction) => {
                    const category = getCategoryInfo(transaction.category_id);
                    return (
                      <TouchableOpacity
                        key={transaction.id}
                        style={styles.transactionItem}
                        onPress={() => router.push(`/transaction/${transaction.id}`)}
                      >
                        <View style={styles.transactionLeft}>
                          <View style={[
                            styles.transactionIcon,
                            { backgroundColor: category.color }
                          ]}>
                            <SafeIcon name={category.icon} size={20} color="#FFFFFF" />
                          </View>
                          <View style={styles.transactionDetails}>
                            <View style={styles.transactionTitleRow}>
                              <Text style={styles.transactionDescription}>
                                {transaction.description}
                              </Text>
                              {transaction.source === 'sms' && (
                                <View style={styles.smsSourceBadge}>
                                  <Ionicons name="chatbubble" size={10} color="#00B894" />
                                  <Text style={styles.smsSourceText}>SMS</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.transactionCategory}>
                              {category.name}
                            </Text>
                            {transaction.mpesa_details?.recipient && (
                              <Text style={styles.transactionRecipient}>
                                {transaction.type === 'income' ? 'From' : 'To'}: {transaction.mpesa_details.recipient}
                              </Text>
                            )}
                            {transaction.mpesa_details?.transaction_id && (
                              <Text style={styles.transactionId}>
                                ID: {transaction.mpesa_details.transaction_id}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={styles.transactionRight}>
                          <Text style={[
                            styles.transactionAmount,
                            { color: transaction.type === 'income' ? '#00B894' : '#E74C3C' }
                          ]}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </Text>
                          <View style={styles.transactionTimeRow}>
                            <Text style={styles.transactionTime}>
                              {new Date(transaction.date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </Text>
                            {transaction.sms_metadata?.parsing_confidence && (
                              <View style={[
                                styles.confidenceBadge,
                                {
                                  backgroundColor: transaction.sms_metadata.parsing_confidence >= 0.8
                                    ? '#00B894'
                                    : transaction.sms_metadata.parsing_confidence >= 0.6
                                    ? '#F39C12'
                                    : '#E74C3C'
                                }
                              ]}>
                                <Text style={styles.confidenceText}>
                                  {Math.round(transaction.sms_metadata.parsing_confidence * 100)}%
                                </Text>
                              </View>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#415A77" style={styles.chevron} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#74C69D',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addIncomeButton: {
    backgroundColor: '#00B894',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addExpenseButton: {
    backgroundColor: '#E74C3C',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchInputContainer: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#415A77',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1B263B',
    borderWidth: 1,
    borderColor: '#415A77',
  },
  filterButtonActive: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#74C69D',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#74C69D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1B263B',
    borderBottomWidth: 1,
    borderBottomColor: '#415A77',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#74C69D',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  smsSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  smsSourceText: {
    fontSize: 10,
    color: '#00B894',
    fontWeight: '600',
  },
  transactionRecipient: {
    fontSize: 11,
    color: '#74C69D',
    marginTop: 2,
  },
  transactionId: {
    fontSize: 10,
    color: '#415A77',
    marginTop: 1,
    fontFamily: 'monospace',
  },
  transactionTimeRow: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: '#74C69D',
  },
  confidenceBadge: {
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  confidenceText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#74C69D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
