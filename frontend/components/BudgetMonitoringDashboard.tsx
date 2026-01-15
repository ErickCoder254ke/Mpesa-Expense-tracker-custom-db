import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BudgetAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category_id?: string;
  category_name?: string;
  title: string;
  message: string;
  action_required: string;
  amount?: number;
  percentage?: number;
  days_remaining?: number;
  trend?: string;
}

interface SpendingTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  percentage_change: number;
  days_analyzed: number;
  prediction: string;
  confidence: number;
}

interface BudgetInsight {
  type: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation: string;
  potential_savings?: number;
  category_id?: string;
}

interface BudgetGoal {
  type: 'reduce_spending' | 'increase_budget' | 'optimize_categories';
  category_id?: string;
  category_name?: string;
  current_amount: number;
  target_amount: number;
  timeframe: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  potential_impact: string;
}

interface HealthScore {
  score: number;
  grade: string;
  description: string;
}

interface BudgetAnalysis {
  period: { month: number; year: number };
  health_score: HealthScore;
  status: string;
  alerts: BudgetAlert[];
  trends: Record<string, SpendingTrend>;
  insights: BudgetInsight[];
  goals: BudgetGoal[];
  summary: {
    total_budget: number;
    total_spent: number;
    utilization_percentage: number;
    categories_tracked: number;
    categories_over_budget: number;
    total_alerts: number;
    critical_alerts: number;
  };
}

interface BudgetMonitoringDashboardProps {
  month: number;
  year: number;
  onRefresh?: () => void;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function BudgetMonitoringDashboard({ 
  month, 
  year, 
  onRefresh 
}: BudgetMonitoringDashboardProps) {
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'alerts' | 'insights' | 'goals'>('overview');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set());
  const [pulseAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    loadBudgetAnalysis();
  }, [month, year]);

  useEffect(() => {
    // Pulse animation for critical alerts
    if (analysis && analysis.summary.critical_alerts > 0) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();
    }
  }, [analysis]);

  const loadBudgetAnalysis = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch(
        `${BACKEND_URL}/api/budgets/monitoring/analysis?month=${month}&year=${year}`
      );

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        Alert.alert('Error', 'Failed to load budget analysis');
      }
    } catch (error) {
      console.error('Error loading budget analysis:', error);
      Alert.alert('Error', 'Network error loading budget analysis');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadBudgetAnalysis(true);
    if (onRefresh) onRefresh();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#E74C3C';
      case 'high': return '#E67E22';
      case 'medium': return '#F39C12';
      case 'low': return '#3498DB';
      default: return '#74C69D';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'alert-circle';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return '#00B894';
    if (score >= 80) return '#74C69D';
    if (score >= 70) return '#F39C12';
    if (score >= 60) return '#E67E22';
    return '#E74C3C';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'excellent': return '#00B894';
      case 'good': return '#74C69D';
      case 'warning': return '#F39C12';
      case 'danger': return '#E67E22';
      case 'critical': return '#E74C3C';
      default: return '#74C69D';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return 'trending-up';
      case 'decreasing': return 'trending-down';
      case 'stable': return 'remove';
      default: return 'help';
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing': return '#E74C3C';
      case 'decreasing': return '#00B894';
      case 'stable': return '#74C69D';
      default: return '#74C69D';
    }
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const toggleAlertExpansion = (index: number) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedAlerts(newExpanded);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Analyzing your budget...</Text>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={64} color="#74C69D" />
        <Text style={styles.emptyTitle}>Budget Analysis Unavailable</Text>
        <Text style={styles.emptyText}>Create budgets to see comprehensive analysis</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Health Score Header */}
      <Animated.View style={[
        styles.healthScoreCard,
        { 
          transform: [{ scale: pulseAnimation }],
          borderColor: analysis.summary.critical_alerts > 0 ? '#E74C3C' : 'transparent'
        }
      ]}>
        <View style={styles.healthScoreHeader}>
          <View style={styles.scoreCircle}>
            <Text style={[
              styles.scoreText,
              { color: getHealthScoreColor(analysis.health_score.score) }
            ]}>
              {analysis.health_score.score}
            </Text>
            <Text style={styles.scoreGrade}>{analysis.health_score.grade}</Text>
          </View>
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreDescription}>{analysis.health_score.description}</Text>
            <View style={styles.statusBadge}>
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(analysis.status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(analysis.status) }
              ]}>
                {analysis.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analysis.summary.utilization_percentage.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Budget Used</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analysis.summary.categories_tracked}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              { color: analysis.summary.critical_alerts > 0 ? '#E74C3C' : '#74C69D' }
            ]}>
              {analysis.summary.total_alerts}
            </Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>
      </Animated.View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: 'Overview', icon: 'pie-chart' },
          { key: 'alerts', label: 'Alerts', icon: 'alert-circle', badge: analysis.alerts.length },
          { key: 'insights', label: 'Insights', icon: 'bulb', badge: analysis.insights.length },
          { key: 'goals', label: 'Goals', icon: 'target', badge: analysis.goals.length },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab.key as any)}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={selectedTab === tab.key ? '#00B894' : '#74C69D'} 
              />
              {tab.badge && tab.badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.tabLabel,
              selectedTab === tab.key && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView 
        style={styles.tabContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#00B894"
            colors={['#00B894']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'overview' && (
          <View style={styles.overviewContent}>
            {/* Summary Cards */}
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Budget</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(analysis.summary.total_budget)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: analysis.summary.total_spent > analysis.summary.total_budget ? '#E74C3C' : '#00B894' }
                ]}>
                  {formatCurrency(analysis.summary.total_spent)}
                </Text>
              </View>
            </View>

            {/* Key Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Ionicons name="pie-chart" size={24} color="#3498DB" />
                  <Text style={styles.metricValue}>{analysis.summary.utilization_percentage.toFixed(1)}%</Text>
                  <Text style={styles.metricLabel}>Budget Utilization</Text>
                </View>
                <View style={styles.metricCard}>
                  <Ionicons name="layers" size={24} color="#9B59B6" />
                  <Text style={styles.metricValue}>{analysis.summary.categories_over_budget}</Text>
                  <Text style={styles.metricLabel}>Over Budget</Text>
                </View>
                <View style={styles.metricCard}>
                  <Ionicons name="trending-up" size={24} color="#E67E22" />
                  <Text style={styles.metricValue}>
                    {Object.values(analysis.trends).filter(t => t.direction === 'increasing').length}
                  </Text>
                  <Text style={styles.metricLabel}>Rising Trends</Text>
                </View>
                <View style={styles.metricCard}>
                  <Ionicons name="trending-down" size={24} color="#00B894" />
                  <Text style={styles.metricValue}>
                    {Object.values(analysis.trends).filter(t => t.direction === 'decreasing').length}
                  </Text>
                  <Text style={styles.metricLabel}>Improving</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedTab === 'alerts' && (
          <View style={styles.alertsContent}>
            {analysis.alerts.length === 0 ? (
              <View style={styles.noAlertsContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#00B894" />
                <Text style={styles.noAlertsTitle}>All Clear!</Text>
                <Text style={styles.noAlertsText}>No budget alerts at the moment</Text>
              </View>
            ) : (
              analysis.alerts.map((alert, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertCard,
                    { borderLeftColor: getSeverityColor(alert.severity) }
                  ]}
                  onPress={() => toggleAlertExpansion(index)}
                >
                  <View style={styles.alertHeader}>
                    <View style={styles.alertLeft}>
                      <Ionicons 
                        name={getSeverityIcon(alert.severity) as any} 
                        size={20} 
                        color={getSeverityColor(alert.severity)} 
                      />
                      <View style={styles.alertTitleContainer}>
                        <Text style={styles.alertTitle}>{alert.title}</Text>
                        {alert.category_name && (
                          <Text style={styles.alertCategory}>{alert.category_name}</Text>
                        )}
                      </View>
                    </View>
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(alert.severity) }
                    ]}>
                      <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.alertMessage}>{alert.message}</Text>

                  {expandedAlerts.has(index) && (
                    <View style={styles.alertDetails}>
                      <Text style={styles.alertAction}>{alert.action_required}</Text>
                      {alert.amount && (
                        <Text style={styles.alertAmount}>
                          Amount: {formatCurrency(alert.amount)}
                        </Text>
                      )}
                      {alert.percentage && (
                        <Text style={styles.alertPercentage}>
                          Percentage: {alert.percentage.toFixed(1)}%
                        </Text>
                      )}
                      {alert.days_remaining !== undefined && (
                        <Text style={styles.alertDays}>
                          Days remaining: {alert.days_remaining}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {selectedTab === 'insights' && (
          <View style={styles.insightsContent}>
            {analysis.insights.length === 0 ? (
              <View style={styles.noInsightsContainer}>
                <Ionicons name="analytics" size={64} color="#74C69D" />
                <Text style={styles.noInsightsTitle}>Building Insights</Text>
                <Text style={styles.noInsightsText}>More insights will appear as you use the app</Text>
              </View>
            ) : (
              analysis.insights.map((insight, index) => (
                <View key={index} style={[
                  styles.insightCard,
                  { borderLeftColor: insight.impact === 'positive' ? '#00B894' : insight.impact === 'negative' ? '#E74C3C' : '#74C69D' }
                ]}>
                  <View style={styles.insightHeader}>
                    <Ionicons 
                      name={insight.impact === 'positive' ? 'trending-up' : insight.impact === 'negative' ? 'trending-down' : 'remove'} 
                      size={20} 
                      color={insight.impact === 'positive' ? '#00B894' : insight.impact === 'negative' ? '#E74C3C' : '#74C69D'} 
                    />
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                  </View>
                  <Text style={styles.insightDescription}>{insight.description}</Text>
                  <Text style={styles.insightRecommendation}>{insight.recommendation}</Text>
                  {insight.potential_savings && (
                    <View style={styles.savingsContainer}>
                      <Ionicons name="cash" size={16} color="#00B894" />
                      <Text style={styles.savingsText}>
                        Potential savings: {formatCurrency(insight.potential_savings)}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {selectedTab === 'goals' && (
          <View style={styles.goalsContent}>
            {analysis.goals.length === 0 ? (
              <View style={styles.noGoalsContainer}>
                <Ionicons name="target" size={64} color="#74C69D" />
                <Text style={styles.noGoalsTitle}>No Goals Yet</Text>
                <Text style={styles.noGoalsText}>Keep using the app to generate optimization goals</Text>
              </View>
            ) : (
              analysis.goals.map((goal, index) => (
                <View key={index} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View style={[
                      styles.goalTypeIcon,
                      { backgroundColor: goal.type === 'reduce_spending' ? '#E74C3C' : goal.type === 'optimize_categories' ? '#3498DB' : '#9B59B6' }
                    ]}>
                      <Ionicons 
                        name={goal.type === 'reduce_spending' ? 'trending-down' : goal.type === 'optimize_categories' ? 'shuffle' : 'trending-up'} 
                        size={16} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <View style={styles.goalTitleContainer}>
                      <Text style={styles.goalTitle}>{goal.category_name || 'Overall Budget'}</Text>
                      <Text style={styles.goalTimeframe}>{goal.timeframe.replace('_', ' ')}</Text>
                    </View>
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: goal.difficulty === 'easy' ? '#00B894' : goal.difficulty === 'moderate' ? '#F39C12' : '#E74C3C' }
                    ]}>
                      <Text style={styles.difficultyText}>{goal.difficulty.toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.goalProgress}>
                    <View style={styles.goalAmounts}>
                      <Text style={styles.goalCurrentAmount}>
                        Current: {formatCurrency(goal.current_amount)}
                      </Text>
                      <Text style={styles.goalTargetAmount}>
                        Target: {formatCurrency(goal.target_amount)}
                      </Text>
                    </View>
                    <View style={styles.goalProgressBar}>
                      <View style={[
                        styles.goalProgressFill,
                        { 
                          width: `${Math.min((goal.target_amount / goal.current_amount) * 100, 100)}%`,
                          backgroundColor: goal.type === 'reduce_spending' ? '#00B894' : '#3498DB'
                        }
                      ]} />
                    </View>
                  </View>
                  
                  <Text style={styles.goalImpact}>{goal.potential_impact}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
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
    gap: 16,
  },
  loadingText: {
    color: '#74C69D',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#74C69D',
    textAlign: 'center',
  },
  healthScoreCard: {
    backgroundColor: '#1B263B',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  healthScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0D1B2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#00B894',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreGrade: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '600',
  },
  scoreDetails: {
    flex: 1,
  },
  scoreDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B894',
  },
  statLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1B263B',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#0D1B2A',
  },
  tabIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tabLabel: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '600',
  },
  activeTabLabel: {
    color: '#00B894',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  overviewContent: {
    gap: 24,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#74C69D',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#74C69D',
    textAlign: 'center',
  },
  alertsContent: {
    gap: 12,
  },
  noAlertsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noAlertsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  noAlertsText: {
    fontSize: 14,
    color: '#74C69D',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  alertTitleContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  alertCategory: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  alertMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 20,
  },
  alertDetails: {
    backgroundColor: '#0D1B2A',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  alertAction: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
  },
  alertAmount: {
    fontSize: 12,
    color: '#74C69D',
  },
  alertPercentage: {
    fontSize: 12,
    color: '#74C69D',
  },
  alertDays: {
    fontSize: 12,
    color: '#74C69D',
  },
  insightsContent: {
    gap: 12,
  },
  noInsightsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noInsightsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  noInsightsText: {
    fontSize: 14,
    color: '#74C69D',
    textAlign: 'center',
  },
  insightCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 20,
  },
  insightRecommendation: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
    marginBottom: 8,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
  },
  goalsContent: {
    gap: 12,
  },
  noGoalsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noGoalsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  noGoalsText: {
    fontSize: 14,
    color: '#74C69D',
    textAlign: 'center',
  },
  goalCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalTimeframe: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 2,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  goalProgress: {
    marginBottom: 12,
  },
  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalCurrentAmount: {
    fontSize: 12,
    color: '#74C69D',
  },
  goalTargetAmount: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: '#0D1B2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalImpact: {
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
