import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar as RNStatusBar,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import { apiGet } from '@/utils/apiClient';
import dataExportService from '@/services/dataExport';

interface Category {
  name: string;
  color: string;
  icon: string;
  amount: number;
  count: number;
}

interface AnalyticsData {
  period: {
    start_date: string;
    end_date: string;
  };
  totals: {
    income: number;
    expenses: number;
    balance: number;
  };
  categories: Record<string, Category>;
  recent_transactions: any[];
}

interface ChargesData {
  period: {
    start_date: string;
    end_date: string;
    type: string;
  };
  summary: {
    total_fees: number;
    total_transactions: number;
    expense_amount: number;
    fee_source: string;
  };
  fee_breakdown: {
    transaction_fees: {
      amount: number;
      description: string;
    };
    access_fees: {
      amount: number;
      description: string;
    };
    service_fees: {
      amount: number;
      description: string;
    };
  };
  efficiency_metrics: {
    average_fee_per_transaction: number;
    fee_percentage_of_expenses: number;
  };
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenHeight < 700;

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [chargesData, setChargesData] = useState<ChargesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChart, setSelectedChart] = useState<'pie' | 'bar'>('pie');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Analytics screen focused - refreshing data');
      loadAnalyticsData(true);
    }, [selectedPeriod])
  );

  const loadAnalyticsData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      // Load analytics, charges, transactions, and categories in parallel using apiGet
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        apiGet('/api/transactions/analytics/summary'),
        apiGet(`/api/transactions/charges/analytics?period=${selectedPeriod}`),
        apiGet('/api/transactions/?limit=1000'),
        apiGet('/api/categories/')
      ]);

      // Extract successful results and track failures
      const [analyticsResult, chargesResult, transactionsResult, categoriesResult] = results;
      const failures: string[] = [];

      // Process analytics summary
      if (analyticsResult.status === 'fulfilled') {
        setData(analyticsResult.value || null);
        console.log('✅ Analytics summary loaded');
      } else {
        console.error('❌ Analytics summary failed:', analyticsResult.reason);
        setData(null);
        failures.push('analytics summary');
      }

      // Process charges data
      if (chargesResult.status === 'fulfilled') {
        setChargesData(chargesResult.value || null);
        console.log('✅ Charges data loaded');
      } else {
        console.error('❌ Charges data failed:', chargesResult.reason);
        setChargesData(null);
        failures.push('charges data');
      }

      // Process transactions
      if (transactionsResult.status === 'fulfilled') {
        const transactions = transactionsResult.value;
        setAllTransactions(Array.isArray(transactions) ? transactions : []);
        console.log(`✅ Transactions loaded: ${Array.isArray(transactions) ? transactions.length : 0}`);
      } else {
        console.error('❌ Transactions failed:', transactionsResult.reason);
        setAllTransactions([]);
        failures.push('transactions');
      }

      // Process categories
      if (categoriesResult.status === 'fulfilled') {
        const categories = categoriesResult.value;
        setAllCategories(Array.isArray(categories) ? categories : []);
        console.log(`✅ Categories loaded: ${Array.isArray(categories) ? categories.length : 0}`);
      } else {
        console.error('❌ Categories failed:', categoriesResult.reason);
        setAllCategories([]);
        failures.push('categories');
      }

      // Set error message if any requests failed, but keep showing successful data
      if (failures.length > 0) {
        if (failures.length === 4) {
          // All requests failed - this is a critical error
          setError('Unable to load analytics data. Please check your connection and try again.');
        } else {
          // Partial failure - show warning but keep the successful data
          setError(`Some data couldn't be loaded: ${failures.join(', ')}. Showing available information.`);
        }
      }
    } catch (error: any) {
      // This catch block should rarely be hit now with Promise.allSettled
      console.error('❌ Unexpected analytics error:', error);
      setError(error?.message || 'An unexpected error occurred. Please try again.');

      // Don't clear existing data on unexpected errors
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadAnalyticsData(true);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await dataExportService.exportTransactions(allTransactions, allCategories);
      setExportModalVisible(false);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummary = async () => {
    setIsExporting(true);
    try {
      await dataExportService.exportSummary(allTransactions, allCategories);
      setExportModalVisible(false);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareSummary = async () => {
    setIsExporting(true);
    try {
      await dataExportService.shareSummary(allTransactions, allCategories);
      setExportModalVisible(false);
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `KSh ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `KSh ${(amount / 1000).toFixed(1)}K`;
    }
    return `KSh ${amount.toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const prepareChartData = () => {
    if (!data || !data.categories) return [];
    
    return Object.values(data.categories)
      .filter(category => category.amount > 0)
      .map(category => ({
        label: category.name,
        value: category.amount,
        color: category.color,
        count: category.count,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const renderMetricsOverview = () => {
    if (!data) return null;

    const savingsRate = data.totals.income > 0 ? (data.totals.balance / data.totals.income) * 100 : 0;
    const transactionCount = data.recent_transactions.length;
    const avgTransactionSize = transactionCount > 0 ? data.totals.expenses / transactionCount : 0;
    const categoryCount = Object.keys(data.categories).length;

    const metrics = [
      {
        icon: 'trending-up',
        label: 'Income',
        value: formatCompactCurrency(data.totals.income),
        color: '#00B894',
        subtitle: 'This period'
      },
      {
        icon: 'trending-down',
        label: 'Expenses',
        value: formatCompactCurrency(data.totals.expenses),
        color: '#E74C3C',
        subtitle: `${transactionCount} transactions`
      },
      {
        icon: data.totals.balance >= 0 ? 'checkmark-circle' : 'warning',
        label: 'Balance',
        value: formatCompactCurrency(data.totals.balance),
        color: data.totals.balance >= 0 ? '#00B894' : '#E74C3C',
        subtitle: `${savingsRate >= 0 ? '+' : ''}${savingsRate.toFixed(1)}%`
      },
      {
        icon: 'calculator',
        label: 'Avg/Transaction',
        value: formatCompactCurrency(avgTransactionSize),
        color: '#74C69D',
        subtitle: 'Per expense'
      },
      {
        icon: 'pie-chart',
        label: 'Categories',
        value: categoryCount.toString(),
        color: '#415A77',
        subtitle: 'Used'
      },
      {
        icon: 'calendar',
        label: 'Daily Avg',
        value: formatCompactCurrency(data.totals.expenses / 30),
        color: '#6C5CE7',
        subtitle: 'Spending'
      }
    ];

    return (
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.metricCard}
              activeOpacity={0.8}
            >
              <View style={[styles.metricIcon, { backgroundColor: `${metric.color}20` }]}>
                <Ionicons name={metric.icon as any} size={20} color={metric.color} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel} numberOfLines={1}>{metric.label}</Text>
                <Text style={[styles.metricValue, { color: metric.color }]} numberOfLines={1} adjustsFontSizeToFit>
                  {metric.value}
                </Text>
                <Text style={styles.metricSubtitle} numberOfLines={1}>{metric.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderChartSection = () => {
    const chartData = prepareChartData();

    if (chartData.length === 0) {
      return (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Spending Analysis</Text>
          <View style={styles.emptyChart}>
            <View style={styles.emptyChartIcon}>
              <Ionicons name="analytics-outline" size={48} color="#415A77" />
            </View>
            <Text style={styles.emptyChartText}>No expense data</Text>
            <Text style={styles.emptyChartSubtext}>
              Add some transactions to see detailed breakdowns and insights
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderLeft}>
            <Text style={styles.sectionTitle} numberOfLines={1}>Spending Analysis</Text>
            <Text style={styles.chartSubtitle} numberOfLines={2}>
              Breakdown of {formatCompactCurrency(data?.totals.expenses || 0)} in expenses
            </Text>
          </View>

          <View style={styles.chartControls}>
            <TouchableOpacity
              style={[styles.chartToggle, selectedChart === 'pie' && styles.activeChartToggle]}
              onPress={() => setSelectedChart('pie')}
            >
              <Ionicons
                name="pie-chart"
                size={14}
                color={selectedChart === 'pie' ? '#FFFFFF' : '#74C69D'}
              />
              <Text style={[
                styles.toggleText,
                selectedChart === 'pie' && styles.activeToggleText
              ]}>
                Pie
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chartToggle, selectedChart === 'bar' && styles.activeChartToggle]}
              onPress={() => setSelectedChart('bar')}
            >
              <Ionicons
                name="bar-chart"
                size={14}
                color={selectedChart === 'bar' ? '#FFFFFF' : '#74C69D'}
              />
              <Text style={[
                styles.toggleText,
                selectedChart === 'bar' && styles.activeToggleText
              ]}>
                Bar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartContainer}>
          {selectedChart === 'pie' ? (
            <PieChart
              data={chartData}
              size={Math.min(screenWidth - 120, isSmallScreen ? 220 : 260)}
              centerLabel="Total Expenses"
              centerValue={formatCompactCurrency(data?.totals.expenses || 0)}
            />
          ) : (
            <BarChart
              data={chartData.slice(0, 8)}
              height={isSmallScreen ? 160 : 200}
              interactive={true}
            />
          )}
        </View>
      </View>
    );
  };

  const renderTrendsSection = () => {
    if (!data || !data.recent_transactions || data.recent_transactions.length === 0) {
      return null;
    }

    // Group transactions by date and calculate daily totals
    const dailyTotals = new Map<string, { date: string; amount: number; count: number }>();

    data.recent_transactions.forEach((transaction: any) => {
      if (transaction.type === 'expense' && transaction.date) {
        const dateKey = new Date(transaction.date).toISOString().split('T')[0];
        const existing = dailyTotals.get(dateKey) || { date: dateKey, amount: 0, count: 0 };
        dailyTotals.set(dateKey, {
          date: dateKey,
          amount: existing.amount + Math.abs(transaction.amount || 0),
          count: existing.count + 1
        });
      }
    });

    // Convert to array and sort by date
    const trendsData = Array.from(dailyTotals.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days
      .map(item => ({
        label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: item.amount,
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }));

    if (trendsData.length < 2) {
      return null; // Need at least 2 data points for a trend
    }

    const avgDailySpending = trendsData.reduce((sum, item) => sum + item.value, 0) / trendsData.length;
    const maxDailySpending = Math.max(...trendsData.map(item => item.value));
    const minDailySpending = Math.min(...trendsData.map(item => item.value));

    return (
      <View style={styles.trendsSection}>
        <View style={styles.trendsSectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Spending Trends</Text>
            <Text style={styles.chartSubtitle}>
              Daily expense patterns over last {trendsData.length} days
            </Text>
          </View>
        </View>

        <View style={styles.trendsStats}>
          <View style={styles.trendStat}>
            <Text style={styles.trendStatLabel}>Average</Text>
            <Text style={styles.trendStatValue}>{formatCompactCurrency(avgDailySpending)}</Text>
          </View>
          <View style={styles.trendStat}>
            <Text style={styles.trendStatLabel}>Highest</Text>
            <Text style={[styles.trendStatValue, { color: '#E74C3C' }]}>
              {formatCompactCurrency(maxDailySpending)}
            </Text>
          </View>
          <View style={styles.trendStat}>
            <Text style={styles.trendStatLabel}>Lowest</Text>
            <Text style={[styles.trendStatValue, { color: '#00B894' }]}>
              {formatCompactCurrency(minDailySpending)}
            </Text>
          </View>
        </View>

        <View style={styles.trendsChartContainer}>
          <LineChart
            data={trendsData}
            height={isSmallScreen ? 180 : 220}
            color="#00B894"
            showDots={true}
            showArea={true}
            interactive={true}
          />
        </View>
      </View>
    );
  };

  const renderFeesAnalysis = () => {
    if (!chargesData || !chargesData.summary) return null;

    const feePercentage = data?.totals.expenses > 0
      ? (chargesData.summary.total_fees / data.totals.expenses) * 100
      : 0;

    const feeBreakdown = [
      {
        label: 'Transaction Fees',
        amount: chargesData.fee_breakdown.transaction_fees.amount,
        icon: 'swap-horizontal',
        color: '#E74C3C'
      },
      {
        label: 'Access Fees',
        amount: chargesData.fee_breakdown.access_fees.amount,
        icon: 'key',
        color: '#F39C12'
      },
      {
        label: 'Service Fees',
        amount: chargesData.fee_breakdown.service_fees.amount,
        icon: 'briefcase',
        color: '#9B59B6'
      }
    ].filter(item => item.amount > 0);

    if (chargesData.summary.total_fees === 0) return null;

    return (
      <View style={styles.feesSection}>
        <View style={styles.feesSectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Fees & Charges</Text>
            <Text style={styles.chartSubtitle}>
              Track every shilling spent on fees
            </Text>
          </View>
          <View style={styles.feesTotalBadge}>
            <Text style={styles.feesTotalAmount}>
              {formatCompactCurrency(chargesData.summary.total_fees)}
            </Text>
            <Text style={styles.feesTotalLabel}>
              {feePercentage.toFixed(1)}% of expenses
            </Text>
          </View>
        </View>

        <View style={styles.feesBreakdown}>
          {feeBreakdown.map((fee, index) => (
            <View key={index} style={styles.feeItem}>
              <View style={[styles.feeIcon, { backgroundColor: `${fee.color}20` }]}>
                <Ionicons name={fee.icon as any} size={20} color={fee.color} />
              </View>
              <View style={styles.feeDetails}>
                <Text style={styles.feeLabel}>{fee.label}</Text>
                <Text style={[styles.feeAmount, { color: fee.color }]}>
                  {formatCurrency(fee.amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {chargesData.efficiency_metrics && (
          <View style={styles.feesStats}>
            <View style={styles.feeStatItem}>
              <Text style={styles.feeStatValue}>
                {chargesData.summary.total_transactions}
              </Text>
              <Text style={styles.feeStatLabel}>Total Transactions</Text>
            </View>
            <View style={styles.feeStatItem}>
              <Text style={styles.feeStatValue}>
                {formatCompactCurrency(chargesData.efficiency_metrics.average_fee_per_transaction)}
              </Text>
              <Text style={styles.feeStatLabel}>Avg Fee</Text>
            </View>
            <View style={styles.feeStatItem}>
              <Text style={styles.feeStatValue}>
                {chargesData.efficiency_metrics.fee_percentage_of_expenses.toFixed(1)}%
              </Text>
              <Text style={styles.feeStatLabel}>% of Expenses</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderQuickInsights = () => {
    if (!data) return null;

    const chartData = prepareChartData();
    const topCategory = chartData[0];
    const categoryCount = Object.keys(data.categories).length;
    const avgDailyExpense = data.totals.expenses / 30;
    const totalTransactions = data.recent_transactions.length;

    const insights = [
      {
        icon: data.totals.balance >= 0 ? 'checkmark-circle' : 'warning',
        title: data.totals.balance >= 0 ? 'Financial Health: Good' : 'Financial Health: Watch',
        description: data.totals.balance >= 0 
          ? `You saved ${formatCurrency(data.totals.balance)} this period`
          : `You overspent by ${formatCurrency(Math.abs(data.totals.balance))}`,
        color: data.totals.balance >= 0 ? '#00B894' : '#E74C3C',
        priority: 'high'
      },
      {
        icon: 'trending-up',
        title: 'Top Spending Category',
        description: topCategory 
          ? `${topCategory.label}: ${formatCurrency(topCategory.value)} (${((topCategory.value / data.totals.expenses) * 100).toFixed(1)}%)`
          : 'No category data available',
        color: topCategory?.color || '#74C69D',
        priority: 'medium'
      },
      {
        icon: 'calendar-outline',
        title: 'Daily Spending Pattern',
        description: `Average ${formatCurrency(avgDailyExpense)} per day across ${totalTransactions} transactions`,
        color: '#6C5CE7',
        priority: 'low'
      },
      {
        icon: 'analytics-outline',
        title: 'Spending Distribution',
        description: `Money spent across ${categoryCount} different categories this period`,
        color: '#415A77',
        priority: 'low'
      }
    ];

    return (
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>Smart Insights</Text>
        <View style={styles.insightsList}>
          {insights.map((insight, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.insightCard,
                insight.priority === 'high' && styles.highPriorityInsight
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.insightLeft}>
                <View style={[styles.insightIcon, { backgroundColor: `${insight.color}20` }]}>
                  <Ionicons name={insight.icon as any} size={20} color={insight.color} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={[
                    styles.insightTitle,
                    insight.priority === 'high' && styles.highPriorityTitle
                  ]} numberOfLines={1}>
                    {insight.title}
                  </Text>
                  <Text style={styles.insightDescription} numberOfLines={2}>
                    {insight.description}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#415A77" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="analytics" size={56} color="#00B894" />
          </View>
          <Text style={styles.loadingText}>Analyzing your finances...</Text>
          <Text style={styles.loadingSubtext}>Preparing insights and charts</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Analytics</Text>
            {data && (
              <Text style={styles.subtitle}>
                {formatDate(data.period.start_date)} - {formatDate(data.period.end_date)}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleRefresh} style={styles.headerButton}>
              <Ionicons name="refresh" size={20} color="#00B894" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setExportModalVisible(true)}
            >
              <Ionicons name="download-outline" size={20} color="#74C69D" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.activePeriodButton
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.activePeriodButtonText
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <View style={styles.errorContent}>
            <Ionicons
              name={error.includes('Some data') ? "warning" : "alert-circle"}
              size={20}
              color={error.includes('Some data') ? "#F39C12" : "#E74C3C"}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity onPress={() => loadAnalyticsData()} style={styles.retryButton}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#00B894"
            colors={['#00B894']}
            progressBackgroundColor="#1B263B"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Financial Metrics Overview */}
        {renderMetricsOverview()}

        {/* Charts Section */}
        {renderChartSection()}

        {/* Spending Trends */}
        {renderTrendsSection()}

        {/* Fees & Charges Analysis */}
        {renderFeesAnalysis()}

        {/* Smart Insights */}
        {renderQuickInsights()}

        {/* Empty State */}
        {(!data || (Object.keys(data.categories).length === 0 && data.recent_transactions.length === 0)) && (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="analytics-outline" size={80} color="#415A77" />
            </View>
            <Text style={styles.emptyStateTitle}>Start Your Financial Journey</Text>
            <Text style={styles.emptyStateText}>
              Add transactions to unlock powerful insights, detailed charts, and personalized recommendations for better financial management
            </Text>
            <TouchableOpacity style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Add First Transaction</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={exportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModalContent}>
            <View style={styles.exportModalHeader}>
              <Text style={styles.exportModalTitle}>Export Data</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.exportModalBody}>
              <Text style={styles.exportDescription}>
                Export your financial data in various formats
              </Text>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleExportCSV}
                disabled={isExporting}
              >
                <View style={styles.exportOptionLeft}>
                  <View style={[styles.exportOptionIcon, { backgroundColor: 'rgba(0, 184, 148, 0.1)' }]}>
                    <Ionicons name="document-text" size={24} color="#00B894" />
                  </View>
                  <View style={styles.exportOptionInfo}>
                    <Text style={styles.exportOptionTitle}>Export as CSV</Text>
                    <Text style={styles.exportOptionDescription}>
                      Download all transactions in spreadsheet format
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#415A77" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleExportSummary}
                disabled={isExporting}
              >
                <View style={styles.exportOptionLeft}>
                  <View style={[styles.exportOptionIcon, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                    <Ionicons name="document" size={24} color="#3498DB" />
                  </View>
                  <View style={styles.exportOptionInfo}>
                    <Text style={styles.exportOptionTitle}>Export Summary</Text>
                    <Text style={styles.exportOptionDescription}>
                      Download a text summary of your finances
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#415A77" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleShareSummary}
                disabled={isExporting}
              >
                <View style={styles.exportOptionLeft}>
                  <View style={[styles.exportOptionIcon, { backgroundColor: 'rgba(243, 156, 18, 0.1)' }]}>
                    <Ionicons name="share-social" size={24} color="#F39C12" />
                  </View>
                  <View style={styles.exportOptionInfo}>
                    <Text style={styles.exportOptionTitle}>Share Summary</Text>
                    <Text style={styles.exportOptionDescription}>
                      Share your financial summary via any app
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#415A77" />
              </TouchableOpacity>

              {isExporting && (
                <View style={styles.exportingIndicator}>
                  <ActivityIndicator size="large" color="#00B894" />
                  <Text style={styles.exportingText}>Preparing export...</Text>
                </View>
              )}

              <View style={styles.exportInfo}>
                <Ionicons name="information-circle" size={16} color="#74C69D" />
                <Text style={styles.exportInfoText}>
                  Exports include up to 1,000 most recent transactions
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 32,
  },
  loadingIcon: {
    marginBottom: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#74C69D',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#1B263B',
    borderBottomWidth: 1,
    borderBottomColor: '#415A77',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#74C69D',
    marginTop: 4,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(116, 198, 157, 0.1)',
    borderWidth: 1,
    borderColor: '#415A77',
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#74C69D',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(116, 198, 157, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  metricCard: {
    width: (screenWidth - 60) / 2,
    backgroundColor: '#1B263B',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#415A77',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  metricContent: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 11,
    color: '#74C69D',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#415A77',
  },
  chartSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#1B263B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#415A77',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  chartHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#74C69D',
    marginTop: 4,
    lineHeight: 18,
  },
  chartControls: {
    flexDirection: 'row',
    backgroundColor: '#0D1B2A',
    borderRadius: 8,
    padding: 2,
    flexShrink: 0,
  },
  chartToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    minWidth: 50,
    justifyContent: 'center',
  },
  activeChartToggle: {
    backgroundColor: '#00B894',
  },
  toggleText: {
    fontSize: 11,
    color: '#74C69D',
    fontWeight: '600',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChartIcon: {
    marginBottom: 16,
  },
  emptyChartText: {
    fontSize: 18,
    color: '#74C69D',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyChartSubtext: {
    fontSize: 14,
    color: '#415A77',
    textAlign: 'center',
    lineHeight: 20,
  },
  insightsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  insightsList: {
    gap: 12,
    marginTop: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B263B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#415A77',
  },
  highPriorityInsight: {
    borderColor: '#00B894',
    backgroundColor: 'rgba(0, 184, 148, 0.05)',
  },
  insightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightContent: {
    flex: 1,
    minWidth: 0,
  },
  insightTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  highPriorityTitle: {
    color: '#00B894',
  },
  insightDescription: {
    fontSize: 13,
    color: '#74C69D',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#74C69D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  emptyStateButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 40,
  },
  feesSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#1B263B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#415A77',
  },
  feesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  feesTotalBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  feesTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  feesTotalLabel: {
    fontSize: 11,
    color: '#E74C3C',
    marginTop: 2,
    opacity: 0.8,
  },
  feesBreakdown: {
    gap: 12,
    marginBottom: 16,
  },
  feeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    padding: 12,
  },
  feeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feeDetails: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 14,
    color: '#74C69D',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  feesSuggestions: {
    backgroundColor: 'rgba(243, 156, 18, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F39C12',
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#74C69D',
    flex: 1,
    lineHeight: 18,
  },
  feesStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#415A77',
  },
  feeStatItem: {
    alignItems: 'center',
  },
  feeStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  feeStatLabel: {
    fontSize: 11,
    color: '#74C69D',
  },
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  exportModalContent: {
    backgroundColor: '#0D1B2A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  exportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  exportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  exportModalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  exportDescription: {
    fontSize: 14,
    color: '#74C69D',
    marginBottom: 24,
  },
  exportOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#415A77',
  },
  exportOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exportOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportOptionInfo: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  exportOptionDescription: {
    fontSize: 13,
    color: '#74C69D',
    lineHeight: 18,
  },
  exportingIndicator: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  exportingText: {
    fontSize: 14,
    color: '#74C69D',
    marginTop: 12,
  },
  exportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(116, 198, 157, 0.1)',
    borderRadius: 8,
  },
  exportInfoText: {
    fontSize: 12,
    color: '#74C69D',
    flex: 1,
    lineHeight: 16,
  },
  errorBanner: {
    backgroundColor: '#1B263B',
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  trendsSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#1B263B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#415A77',
  },
  trendsSectionHeader: {
    marginBottom: 16,
  },
  trendsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
  },
  trendStat: {
    alignItems: 'center',
  },
  trendStatLabel: {
    fontSize: 11,
    color: '#74C69D',
    marginBottom: 4,
    fontWeight: '500',
  },
  trendStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  trendsChartContainer: {
    width: '100%',
  },
});
