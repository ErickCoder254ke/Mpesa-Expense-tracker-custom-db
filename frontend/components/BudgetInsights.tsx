import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '@/config/api';

interface BudgetAlert {
  type: 'danger' | 'warning' | 'info';
  category?: string;
  message: string;
  action?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface BudgetSummary {
  period: { month: number; year: number };
  totals: {
    budget: number;
    spent: number;
    remaining: number;
    percentage: number;
    uncategorized_spending: number;
    total_expenses: number;
  };
  metrics: {
    budgets_count: number;
    budgets_over_limit: number;
    transaction_count: number;
    uncategorized_count: number;
    average_daily_spending: number;
    projected_month_end: number;
  };
  status: 'good' | 'warning' | 'critical' | 'over';
  alerts: BudgetAlert[];
}

interface BudgetInsightsProps {
  month: number;
  year: number;
  onRefresh?: () => void;
}

export default function BudgetInsights({ month, year, onRefresh }: BudgetInsightsProps) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadBudgetInsights();
  }, [month, year]);

  const loadBudgetInsights = async () => {
    setIsLoading(true);
    try {
      const [summaryResponse, alertsResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/budgets/summary?month=${month}&year=${year}`),
        fetch(`${BACKEND_URL}/api/budgets/alerts?month=${month}&year=${year}`)
      ]);

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error('Error loading budget insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#00B894';
      case 'warning': return '#F39C12';
      case 'critical': return '#E74C3C';
      case 'over': return '#E74C3C';
      default: return '#74C69D';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'critical': return 'alert-circle';
      case 'over': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good': return 'On Track';
      case 'warning': return 'Approaching Limit';
      case 'critical': return 'Near Budget Limit';
      case 'over': return 'Over Budget';
      default: return 'Unknown';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'danger': return 'alert-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'help-circle';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'danger': return '#E74C3C';
      case 'warning': return '#F39C12';
      case 'info': return '#74C69D';
      default: return '#74C69D';
    }
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getCurrentDay = () => {
    const now = new Date();
    if (now.getMonth() + 1 === month && now.getFullYear() === year) {
      return now.getDate();
    }
    return getDaysInMonth(month, year);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#00B894" />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={32} color="#74C69D" />
        <Text style={styles.emptyText}>No budget data available</Text>
      </View>
    );
  }

  const daysInMonth = getDaysInMonth(month, year);
  const currentDay = getCurrentDay();
  const projectedOverspend = summary.metrics.projected_month_end - summary.totals.budget;

  return (
    <View style={styles.container}>
      {/* Overall Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusLeft}>
            <Ionicons 
              name={getStatusIcon(summary.status) as any} 
              size={24} 
              color={getStatusColor(summary.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(summary.status) }]}>
              {getStatusText(summary.status)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowDetails(!showDetails)}>
            <Ionicons 
              name={showDetails ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#74C69D" 
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.statusDescription}>
          {summary.totals.percentage.toFixed(1)}% of budget used • 
          {daysInMonth - currentDay} days remaining
        </Text>

        {showDetails && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Daily Average</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(summary.metrics.average_daily_spending)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Projected Total</Text>
                <Text style={[
                  styles.detailValue,
                  { color: projectedOverspend > 0 ? '#E74C3C' : '#00B894' }
                ]}>
                  {formatCurrency(summary.metrics.projected_month_end)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Uncategorized</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(summary.totals.uncategorized_spending)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Categories Over</Text>
                <Text style={[
                  styles.detailValue,
                  { color: summary.metrics.budgets_over_limit > 0 ? '#E74C3C' : '#00B894' }
                ]}>
                  {summary.metrics.budgets_over_limit}
                </Text>
              </View>
            </View>

            {projectedOverspend > 0 && (
              <View style={styles.projectionWarning}>
                <Ionicons name="trending-up" size={16} color="#F39C12" />
                <Text style={styles.projectionText}>
                  Projected to exceed budget by {formatCurrency(projectedOverspend)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Alerts */}
      {alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Alerts & Recommendations</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alertsContainer}
          >
            {alerts.map((alert, index) => (
              <View key={index} style={[styles.alertCard, { borderLeftColor: getAlertColor(alert.type) }]}>
                <View style={styles.alertHeader}>
                  <Ionicons 
                    name={getAlertIcon(alert.type) as any} 
                    size={16} 
                    color={getAlertColor(alert.type)} 
                  />
                  {alert.category && (
                    <Text style={styles.alertCategory}>{alert.category}</Text>
                  )}
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                {alert.action && (
                  <Text style={styles.alertAction}>{alert.action}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (onRefresh) onRefresh();
              loadBudgetInsights();
            }}
          >
            <Ionicons name="refresh" size={20} color="#00B894" />
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
          
          {summary.totals.uncategorized_spending > summary.totals.budget * 0.1 && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert(
                'Uncategorized Spending', 
                `You have ${formatCurrency(summary.totals.uncategorized_spending)} in uncategorized expenses. Consider using Smart Categorization to improve budget accuracy.`
              )}
            >
              <Ionicons name="help-circle" size={20} color="#F39C12" />
              <Text style={styles.actionText}>Categorize</Text>
            </TouchableOpacity>
          )}
          
          {summary.metrics.budgets_over_limit > 0 && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert(
                'Budgets Over Limit', 
                `${summary.metrics.budgets_over_limit} categories are over budget. Consider adjusting your budgets or reducing spending.`
              )}
            >
              <Ionicons name="warning" size={20} color="#E74C3C" />
              <Text style={styles.actionText}>Adjust</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    color: '#74C69D',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: '#74C69D',
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusDescription: {
    fontSize: 14,
    color: '#74C69D',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#415A77',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  projectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  projectionText: {
    color: '#F39C12',
    fontSize: 14,
    fontWeight: '600',
  },
  alertsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  alertsContainer: {
    gap: 12,
    paddingRight: 24,
  },
  alertCard: {
    backgroundColor: '#1B263B',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    minWidth: 200,
    maxWidth: 250,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00B894',
  },
  alertMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertAction: {
    fontSize: 12,
    color: '#74C69D',
    fontStyle: 'italic',
  },
  actionsSection: {
    gap: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1B263B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '600',
  },
});
