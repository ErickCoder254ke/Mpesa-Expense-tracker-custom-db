import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeIcon from '@/components/SafeIcon';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardData } from '@/types/transaction';
import { QuickSMSImport } from '@/components/QuickSMSImport';
import { BACKEND_URL, logBackendConfig } from '@/config/api';
import { debugBackendConnection } from '@/utils/debugBackend';
import { apiGet } from '@/utils/apiClient';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chargesData, setChargesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logBackendConfig();
    loadDashboardData();
  }, []);

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      console.log('🔍 Loading dashboard data...');
      console.log('📡 Backend URL:', BACKEND_URL);

      // Add timeout for Render cold starts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Dashboard request timeout - backend might be sleeping');
      }, 30000);

      // Load both dashboard data and charges analytics in parallel with authentication
      // Pass the abort signal to enable timeout cancellation
      const [dashboardData, chargesAnalytics] = await Promise.all([
        apiGet('/api/transactions/analytics/summary', { signal: controller.signal }),
        apiGet('/api/transactions/charges/analytics?period=month', { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      console.log('✅ Dashboard data received:', dashboardData);
      console.log('✅ Charges analytics received:', chargesAnalytics);

      setData(dashboardData);
      setChargesData(chargesAnalytics);

    } catch (error: any) {
      console.error('❌ Dashboard error:', {
        name: error.name,
        message: error.message,
        cause: error.cause
      });

      if (error.name === 'AbortError') {
        console.log('🐌 Request was aborted due to timeout - backend likely sleeping');
      } else if (error.message?.includes('Network request failed')) {
        console.log('🌐 Network request failed - checking backend connectivity');
        console.log('💡 Try opening in browser: ' + BACKEND_URL);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/verify-pin');
          }
        }
      ]
    );
  };

  const handleDebug = async () => {
    try {
      // First run connection debugging
      await debugBackendConnection();

      const response = await fetch(`${BACKEND_URL}/api/transactions/debug/database`);
      if (response.ok) {
        const debugData = await response.json();
        console.log('Debug data:', debugData);
        Alert.alert(
          'Debug Info',
          `Transactions: ${debugData.transactions_count}\nCategories: ${debugData.categories_count}\nUsers: ${debugData.users_count}`
        );
      } else {
        Alert.alert('Debug Error', `Failed to get debug data (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Debug Error', `Network error: ${error}`);
    }
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</Text>
            <Text style={styles.title}>Expense Overview</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.debugButton} onPress={handleDebug}>
              <Ionicons name="bug-outline" size={20} color="#74C69D" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#74C69D" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Cards */}
        <View style={styles.balanceContainer}>
          <View style={[styles.balanceCard, styles.incomeCard]}>
            <Ionicons name="arrow-down" size={24} color="#00B894" />
            <Text style={styles.balanceLabel}>Income</Text>
            <Text style={styles.balanceAmount}>
              {data ? formatCurrency(data.totals.income) : 'KSh 0.00'}
            </Text>
          </View>

          <View style={[styles.balanceCard, styles.expenseCard]}>
            <Ionicons name="arrow-up" size={24} color="#E74C3C" />
            <Text style={styles.balanceLabel}>Expenses</Text>
            <Text style={styles.balanceAmount}>
              {data ? formatCurrency(data.totals.expenses) : 'KSh 0.00'}
            </Text>
          </View>
        </View>

        {/* Quick SMS Import */}
        <QuickSMSImport onTransactionImported={() => loadDashboardData(true)} />

        {/* Enhanced Comprehensive Transaction Charges Panel */}
        <View style={styles.transactionChargesCard}>
          <View style={styles.chargesCardHeader}>
            <View style={styles.chargesHeaderLeft}>
              <Ionicons name="receipt" size={24} color="#F39C12" />
              <View style={styles.chargesHeaderText}>
                <Text style={styles.chargesCardTitle}>Transaction Charges</Text>
                <Text style={styles.chargesCardSubtitle}>
                  Every shilling accounted for
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/analytics')}>
              <Ionicons name="chevron-forward" size={20} color="#F39C12" />
            </TouchableOpacity>
          </View>

          {/* Enhanced Total Charges Display */}
          <View style={styles.totalChargesSection}>
            <View style={styles.totalChargesAmount}>
              <Text style={styles.totalChargesLabel}>
                Total Charges This {chargesData?.period?.type || 'Period'}
              </Text>
              <Text style={styles.totalChargesValue}>
                {formatCurrency(chargesData?.summary?.total_fees || data?.totals.fees?.total_fees || 0)}
              </Text>
              {chargesData?.summary?.total_transactions && (
                <Text style={styles.totalChargesSubtext}>
                  From {chargesData.summary.total_transactions} transaction{chargesData.summary.total_transactions !== 1 ? 's' : ''}
                </Text>
              )}
            </View>

            {/* Charge Status Indicator */}
            <View style={[
              styles.chargeStatusBadge,
              {
                backgroundColor: (chargesData?.summary?.total_fees || 0) === 0 ? '#00B894' : '#F39C12'
              }
            ]}>
              <Text style={styles.chargeStatusText}>
                {(chargesData?.summary?.total_fees || 0) === 0 ? 'No Charges' : 'Tracked'}
              </Text>
            </View>
          </View>

          {/* Enhanced Detailed Breakdown */}
          {chargesData?.fee_breakdown && (
            <View style={styles.chargesBreakdown}>
              <Text style={styles.breakdownTitle}>Comprehensive Breakdown</Text>

              {/* M-Pesa Transaction Fees */}
              {chargesData.fee_breakdown.transaction_fees?.amount > 0 && (
                <View style={styles.chargeBreakdownItem}>
                  <View style={styles.chargeItemLeft}>
                    <View style={[styles.chargeIcon, { backgroundColor: '#00B894' }]}>
                      <Ionicons name="card" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.chargeItemDetails}>
                      <Text style={styles.chargeItemName}>M-Pesa Transaction Fees</Text>
                      <Text style={styles.chargeItemCount}>
                        {chargesData.fee_breakdown.transaction_fees.description}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.chargeItemAmount}>
                    {formatCurrency(chargesData.fee_breakdown.transaction_fees.amount)}
                  </Text>
                </View>
              )}

              {/* Fuliza Access Fees */}
              {chargesData.fee_breakdown.access_fees?.amount > 0 && (
                <View style={styles.chargeBreakdownItem}>
                  <View style={styles.chargeItemLeft}>
                    <View style={[styles.chargeIcon, { backgroundColor: '#6C5CE7' }]}>
                      <Ionicons name="wallet" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.chargeItemDetails}>
                      <Text style={styles.chargeItemName}>Fuliza Access Fees</Text>
                      <Text style={styles.chargeItemCount}>
                        {chargesData.fee_breakdown.access_fees.description}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.chargeItemAmount}>
                    {formatCurrency(chargesData.fee_breakdown.access_fees.amount)}
                  </Text>
                </View>
              )}

              {/* Service Fees */}
              {chargesData.fee_breakdown.service_fees?.amount > 0 && (
                <View style={styles.chargeBreakdownItem}>
                  <View style={styles.chargeItemLeft}>
                    <View style={[styles.chargeIcon, { backgroundColor: '#E74C3C' }]}>
                      <Ionicons name="business" size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.chargeItemDetails}>
                      <Text style={styles.chargeItemName}>Service Fees</Text>
                      <Text style={styles.chargeItemCount}>
                        {chargesData.fee_breakdown.service_fees.description}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.chargeItemAmount}>
                    {formatCurrency(chargesData.fee_breakdown.service_fees.amount)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Enhanced Charge Analytics */}
          {chargesData?.efficiency_metrics && (
            <View style={styles.chargeAnalytics}>
              <Text style={styles.analyticsTitle}>Smart Fee Analysis</Text>

              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsItem}>
                  <Ionicons name="calculator" size={14} color="#74C69D" />
                  <Text style={styles.analyticsLabel}>Avg per Transaction</Text>
                  <Text style={styles.analyticsValue}>
                    {formatCurrency(chargesData.efficiency_metrics.average_fee_per_transaction)}
                  </Text>
                </View>

                <View style={styles.analyticsItem}>
                  <Ionicons name="pie-chart" size={14} color="#F39C12" />
                  <Text style={styles.analyticsLabel}>% of Expenses</Text>
                  <Text style={styles.analyticsValue}>
                    {chargesData.efficiency_metrics.fee_percentage_of_expenses.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.analyticsItem}>
                  <Ionicons name="receipt" size={14} color="#00B894" />
                  <Text style={styles.analyticsLabel}>Total Txns</Text>
                  <Text style={styles.analyticsValue}>
                    {chargesData.summary.total_transactions}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Fuliza Activity Summary */}
        {data && data.fuliza_summary && (data.fuliza_summary.total_loans > 0 || data.fuliza_summary.total_repayments > 0) && (
          <View style={styles.fulizaCard}>
            <View style={styles.fulizaHeader}>
              <Ionicons name="wallet" size={20} color="#6C5CE7" />
              <Text style={styles.fulizaLabel}>Fuliza Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/analytics')}>
                <Ionicons name="chevron-forward" size={16} color="#6C5CE7" />
              </TouchableOpacity>
            </View>

            <View style={styles.fulizaStats}>
              {data.fuliza_summary.total_loans > 0 && (
                <View style={styles.fulizaStatItem}>
                  <View style={styles.fulizaStatHeader}>
                    <Ionicons name="arrow-down-circle" size={16} color="#00B894" />
                    <Text style={styles.fulizaStatLabel}>Loans Taken</Text>
                  </View>
                  <Text style={styles.fulizaStatValue}>
                    {formatCurrency(data.fuliza_summary.total_loans)}
                  </Text>
                  <Text style={styles.fulizaStatCount}>
                    {data.fuliza_summary.loan_count} transaction{data.fuliza_summary.loan_count !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}

              {data.fuliza_summary.total_repayments > 0 && (
                <View style={styles.fulizaStatItem}>
                  <View style={styles.fulizaStatHeader}>
                    <Ionicons name="arrow-up-circle" size={16} color="#E74C3C" />
                    <Text style={styles.fulizaStatLabel}>Repayments</Text>
                  </View>
                  <Text style={styles.fulizaStatValue}>
                    {formatCurrency(data.fuliza_summary.total_repayments)}
                  </Text>
                  <Text style={styles.fulizaStatCount}>
                    {data.fuliza_summary.repayment_count} transaction{data.fuliza_summary.repayment_count !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {data.fuliza_summary.current_outstanding > 0 && (
              <View style={styles.fulizaOutstanding}>
                <Ionicons name="alert-circle" size={14} color="#F39C12" />
                <Text style={styles.fulizaOutstandingText}>
                  Outstanding: {formatCurrency(data.fuliza_summary.current_outstanding)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Net Balance */}
        <View style={[styles.netBalanceCard, data && data.totals.balance < 0 && styles.negativeBalance]}>
          <Text style={styles.netBalanceLabel}>Net Balance</Text>
          <Text style={[styles.netBalanceAmount, data && data.totals.balance < 0 && styles.negativeAmount]}>
            {data ? formatCurrency(data.totals.balance) : 'KSh 0.00'}
          </Text>
          {data && (
            <Text style={styles.periodText}>
              {formatDate(data.period.start_date)} - {formatDate(data.period.end_date)}
            </Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/transaction/add')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/sms-import')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionText}>Import SMS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/analytics')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="pie-chart" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionText}>View Charts</Text>
          </TouchableOpacity>
        </View>

        {/* Top Categories */}
        {data && Object.keys(data.categories).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Categories</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/analytics')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.categoriesList}>
              {Object.entries(data.categories)
                .slice(0, 3)
                .map(([categoryId, category]) => (
                  <View key={categoryId} style={styles.categoryItem}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                        <SafeIcon name={category.icon} size={20} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryCount}>{category.count} transactions</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryAmount}>{formatCurrency(category.amount)}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        {data && data.recent_transactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.transactionsList}>
              {data.recent_transactions.slice(0, 5).map((transaction) => {
                const isFuliza = transaction.description?.toLowerCase().includes('fuliza') ||
                                transaction.category?.toLowerCase().includes('loans');
                const hasTransactionFee = transaction.sms_metadata?.total_fees && transaction.sms_metadata.total_fees > 0;

                return (
                  <View key={transaction.id} style={[
                    styles.transactionItem,
                    isFuliza && styles.fulizaTransactionItem
                  ]}>
                    <View style={styles.transactionLeft}>
                      <View style={[
                        styles.transactionIcon,
                        {
                          backgroundColor: isFuliza
                            ? '#6C5CE7'
                            : transaction.type === 'income' ? '#00B894' : '#E74C3C'
                        }
                      ]}>
                        <Ionicons
                          name={
                            isFuliza
                              ? 'wallet'
                              : transaction.type === 'income' ? 'arrow-down' : 'arrow-up'
                          }
                          size={16}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.transactionDetails}>
                        <View style={styles.transactionTitleRow}>
                          <Text style={styles.transactionDescription}>{transaction.description}</Text>
                          {isFuliza && (
                            <View style={styles.fulizaTransactionBadge}>
                              <Text style={styles.fulizaTransactionBadgeText}>F</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.transactionMetaRow}>
                          <Text style={styles.transactionDate}>
                            {new Date(transaction.date).toLocaleDateString()}
                          </Text>
                          {hasTransactionFee && (
                            <Text style={styles.transactionFeeIndicator}>
                              + {formatCurrency(transaction.sms_metadata.total_fees)} fees
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.transactionAmountColumn}>
                      <Text style={[
                        styles.transactionAmount,
                        { color: isFuliza ? '#6C5CE7' : transaction.type === 'income' ? '#00B894' : '#E74C3C' }
                      ]}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </Text>
                      {transaction.mpesa_details?.transaction_id && (
                        <Text style={styles.transactionId}>
                          {transaction.mpesa_details.transaction_id}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty State */}
        {(!data || (Object.keys(data.categories).length === 0 && data.recent_transactions.length === 0)) && (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color="#415A77" />
            <Text style={styles.emptyStateTitle}>No transactions yet</Text>
            <Text style={styles.emptyStateText}>
              Start tracking your M-Pesa expenses by adding your first transaction
            </Text>
            <TouchableOpacity 
              style={styles.addFirstButton}
              onPress={() => router.push('/transaction/add')}
            >
              <Text style={styles.addFirstButtonText}>Add First Transaction</Text>
            </TouchableOpacity>
          </View>
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
  scrollView: {
    flex: 1,
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
  },
  greeting: {
    fontSize: 14,
    color: '#74C69D',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugButton: {
    padding: 8,
  },
  logoutButton: {
    padding: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 16,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#1B263B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  incomeCard: {
    borderColor: '#00B894',
  },
  expenseCard: {
    borderColor: '#E74C3C',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#74C69D',
    fontWeight: '500',
    marginTop: 8,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  netBalanceCard: {
    backgroundColor: '#1B263B',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00B894',
  },
  negativeBalance: {
    borderColor: '#E74C3C',
  },
  netBalanceLabel: {
    fontSize: 16,
    color: '#74C69D',
    fontWeight: '500',
  },
  netBalanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00B894',
    marginTop: 8,
  },
  negativeAmount: {
    color: '#E74C3C',
  },
  periodText: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seeAllText: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
  },
  categoriesList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    padding: 16,
    borderRadius: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryCount: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 2,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    padding: 16,
    borderRadius: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#74C69D',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
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
  feesCard: {
    backgroundColor: '#1B263B',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F39C12',
  },
  feesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feesLabel: {
    fontSize: 16,
    color: '#F39C12',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  feesAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  feesBreakdown: {
    gap: 8,
  },
  feeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  feeItemLabel: {
    fontSize: 14,
    color: '#74C69D',
    flex: 1,
  },
  feeItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  feesSummary: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#415A77',
    gap: 4,
  },
  feeTransactionsCount: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '500',
  },
  averageFeeText: {
    fontSize: 12,
    color: '#F39C12',
    fontWeight: '500',
  },
  feePercentageText: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '500',
  },
  feeInsightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  feeEfficiencyBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  feeEfficiencyText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  fulizaCard: {
    backgroundColor: '#1B263B',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  fulizaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fulizaLabel: {
    fontSize: 16,
    color: '#6C5CE7',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  fulizaStats: {
    flexDirection: 'row',
    gap: 16,
  },
  fulizaStatItem: {
    flex: 1,
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 12,
  },
  fulizaStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  fulizaStatLabel: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '500',
  },
  fulizaStatValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fulizaStatCount: {
    fontSize: 11,
    color: '#74C69D',
  },
  fulizaOutstanding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#4A5568',
    borderRadius: 8,
  },
  fulizaOutstandingText: {
    fontSize: 12,
    color: '#F39C12',
    fontWeight: '600',
  },
  fulizaTransactionItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#6C5CE7',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  transactionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fulizaTransactionBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fulizaTransactionBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  transactionFeeIndicator: {
    fontSize: 11,
    color: '#F39C12',
    fontWeight: '500',
  },
  transactionAmountColumn: {
    alignItems: 'flex-end',
  },
  transactionId: {
    fontSize: 10,
    color: '#74C69D',
    marginTop: 2,
  },
  // Enhanced Transaction Charges Panel
  transactionChargesCard: {
    backgroundColor: '#1B263B',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#F39C12',
    elevation: 8,
    shadowColor: '#F39C12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chargesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chargesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chargesHeaderText: {
    marginLeft: 12,
  },
  chargesCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chargesCardSubtitle: {
    fontSize: 12,
    color: '#F39C12',
    fontWeight: '500',
    marginTop: 2,
  },
  totalChargesSection: {
    backgroundColor: '#2D3748',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalChargesAmount: {
    flex: 1,
  },
  totalChargesLabel: {
    fontSize: 14,
    color: '#74C69D',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalChargesValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F39C12',
  },
  totalChargesSubtext: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 4,
  },
  chargeStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 16,
  },
  chargeStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chargesBreakdown: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  chargeBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#415A77',
  },
  chargeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chargeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chargeItemDetails: {
    flex: 1,
  },
  chargeItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  chargeItemCount: {
    fontSize: 12,
    color: '#74C69D',
  },
  chargeItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F39C12',
  },
  chargeAnalytics: {
    backgroundColor: '#2D3748',
    borderRadius: 16,
    padding: 16,
  },
  analyticsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  analyticsLabel: {
    fontSize: 11,
    color: '#74C69D',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  analyticsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  optimizationTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#4A5568',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  optimizationText: {
    fontSize: 12,
    color: '#F39C12',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  dataQualitySection: {
    backgroundColor: '#415A77',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  dataQualityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dataQualityTitle: {
    fontSize: 11,
    color: '#74C69D',
    fontWeight: '600',
    marginLeft: 4,
  },
  dataQualityStats: {
    marginTop: 2,
  },
  dataQualityText: {
    fontSize: 10,
    color: '#74C69D',
    lineHeight: 14,
  },
});
