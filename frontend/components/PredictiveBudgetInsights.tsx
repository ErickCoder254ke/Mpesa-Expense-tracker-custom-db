import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PredictiveInsight {
  id: string;
  type: 'warning' | 'prediction' | 'recommendation' | 'achievement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category_id?: string;
  category_name?: string;
  title: string;
  message: string;
  prediction: {
    days_to_exceed?: number;
    projected_overage?: number;
    probability?: number;
    trend_direction: 'increasing' | 'decreasing' | 'stable';
  };
  recommendations: {
    action: string;
    impact: string;
    difficulty: 'easy' | 'moderate' | 'hard';
  }[];
  can_auto_apply?: boolean;
  auto_action?: string;
}

interface BudgetPrediction {
  category_id: string;
  category_name: string;
  current_spent: number;
  budget_amount: number;
  projected_end_of_month: number;
  predicted_overage: number;
  probability_over_budget: number;
  days_until_exceeded: number | null;
  suggested_actions: string[];
  spending_velocity: number; // spending per day
  historical_pattern: 'consistent' | 'increasing' | 'decreasing' | 'volatile';
}

interface PredictiveBudgetInsightsProps {
  month: number;
  year: number;
  onActionTaken?: (action: string, category?: string) => void;
  onRecommendationApplied?: (recommendation: any) => void;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function PredictiveBudgetInsights({ 
  month, 
  year, 
  onActionTaken,
  onRecommendationApplied 
}: PredictiveBudgetInsightsProps) {
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [predictions, setPredictions] = useState<BudgetPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [pulseAnimations, setPulseAnimations] = useState<Map<string, Animated.Value>>(new Map());

  useEffect(() => {
    loadPredictiveInsights();
  }, [month, year]);

  const loadPredictiveInsights = async () => {
    setIsLoading(true);
    try {
      // Simulate API call for predictive insights
      const mockInsights = await generatePredictiveInsights();
      const mockPredictions = await generateBudgetPredictions();
      
      setInsights(mockInsights);
      setPredictions(mockPredictions);
      
      // Create pulse animations for critical insights
      const newAnimations = new Map();
      mockInsights.forEach(insight => {
        if (insight.severity === 'critical') {
          newAnimations.set(insight.id, new Animated.Value(1));
        }
      });
      setPulseAnimations(newAnimations);
      
      // Start pulse animations
      newAnimations.forEach((animation) => {
        const pulse = () => {
          Animated.sequence([
            Animated.timing(animation, {
              toValue: 1.05,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(animation, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]).start(() => pulse());
        };
        pulse();
      });
      
    } catch (error) {
      console.error('Error loading predictive insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePredictiveInsights = async (): Promise<PredictiveInsight[]> => {
    // In a real implementation, this would call the backend
    // For now, we'll generate realistic mock data
    
    const currentDate = new Date();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = currentDate.getDate();
    const daysRemaining = daysInMonth - daysElapsed;

    return [
      {
        id: '1',
        type: 'warning',
        severity: 'critical',
        category_name: 'Food & Dining',
        title: 'Budget Exceeded Alert',
        message: 'You\'re likely to exceed your Food & Dining budget by KSh 2,500 if current spending continues.',
        prediction: {
          days_to_exceed: 3,
          projected_overage: 2500,
          probability: 85,
          trend_direction: 'increasing',
        },
        recommendations: [
          {
            action: 'Cook more meals at home',
            impact: 'Could save KSh 1,200/week',
            difficulty: 'easy',
          },
          {
            action: 'Set daily spending limit of KSh 300',
            impact: 'Prevents budget overage',
            difficulty: 'moderate',
          },
        ],
        can_auto_apply: false,
      },
      {
        id: '2',
        type: 'prediction',
        severity: 'medium',
        category_name: 'Transportation',
        title: 'Spending Pattern Alert',
        message: 'Your transportation spending has increased 40% compared to last month.',
        prediction: {
          projected_overage: 800,
          probability: 65,
          trend_direction: 'increasing',
        },
        recommendations: [
          {
            action: 'Consider using public transport 2 days/week',
            impact: 'Save approximately KSh 600/month',
            difficulty: 'easy',
          },
          {
            action: 'Increase transportation budget by KSh 1,000',
            impact: 'Accommodates current spending pattern',
            difficulty: 'moderate',
          },
        ],
        can_auto_apply: true,
        auto_action: 'adjust_budget',
      },
      {
        id: '3',
        type: 'achievement',
        severity: 'low',
        category_name: 'Entertainment',
        title: 'Budget Champion!',
        message: 'You\'re 30% under budget this month. Great job staying on track!',
        prediction: {
          trend_direction: 'stable',
        },
        recommendations: [
          {
            action: 'Consider reallocating excess to savings',
            impact: 'Build emergency fund',
            difficulty: 'easy',
          },
        ],
        can_auto_apply: true,
        auto_action: 'reallocate_savings',
      },
      {
        id: '4',
        type: 'recommendation',
        severity: 'medium',
        title: 'Smart Budget Optimization',
        message: 'Based on your spending patterns, we can optimize your budget allocation.',
        prediction: {
          trend_direction: 'stable',
        },
        recommendations: [
          {
            action: 'Increase food budget by KSh 1,000, decrease entertainment by KSh 500',
            impact: 'Better aligns with actual spending',
            difficulty: 'easy',
          },
        ],
        can_auto_apply: true,
        auto_action: 'optimize_allocation',
      },
    ];
  };

  const generateBudgetPredictions = async (): Promise<BudgetPrediction[]> => {
    // Mock budget predictions
    return [
      {
        category_id: '1',
        category_name: 'Food & Dining',
        current_spent: 8500,
        budget_amount: 10000,
        projected_end_of_month: 12500,
        predicted_overage: 2500,
        probability_over_budget: 85,
        days_until_exceeded: 3,
        suggested_actions: ['Set daily limit', 'Cook at home more'],
        spending_velocity: 300,
        historical_pattern: 'increasing',
      },
      {
        category_id: '2',
        category_name: 'Transportation',
        current_spent: 4200,
        budget_amount: 5000,
        projected_end_of_month: 5800,
        predicted_overage: 800,
        probability_over_budget: 65,
        days_until_exceeded: 8,
        suggested_actions: ['Use public transport', 'Increase budget'],
        spending_velocity: 180,
        historical_pattern: 'increasing',
      },
    ];
  };

  const handleApplyRecommendation = async (insight: PredictiveInsight, recommendation: any) => {
    try {
      Alert.alert(
        'Apply Recommendation',
        `Apply: ${recommendation.action}?\n\nExpected impact: ${recommendation.impact}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: async () => {
              // In a real app, this would call the backend to apply the recommendation
              if (onRecommendationApplied) {
                onRecommendationApplied({ insight, recommendation });
              }
              
              Alert.alert(
                'Applied!',
                `Recommendation applied: ${recommendation.action}`,
                [{ text: 'Great!', style: 'default' }]
              );
              
              // Remove the insight after applying
              setInsights(prev => prev.filter(i => i.id !== insight.id));
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error applying recommendation:', error);
      Alert.alert('Error', 'Failed to apply recommendation');
    }
  };

  const handleAutoAction = async (insight: PredictiveInsight) => {
    if (!insight.auto_action) return;

    try {
      let actionDescription = '';
      switch (insight.auto_action) {
        case 'adjust_budget':
          actionDescription = 'Automatically adjust budget based on spending pattern';
          break;
        case 'reallocate_savings':
          actionDescription = 'Move excess budget to savings';
          break;
        case 'optimize_allocation':
          actionDescription = 'Optimize budget allocation across categories';
          break;
        default:
          actionDescription = 'Apply smart recommendation';
      }

      Alert.alert(
        'Smart Action Available',
        `${actionDescription}?\n\n${insight.message}`,
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Apply',
            onPress: async () => {
              if (onActionTaken) {
                onActionTaken(insight.auto_action!, insight.category_name);
              }
              
              Alert.alert(
                'Action Applied!',
                'Your budget has been automatically optimized.',
                [{ text: 'Perfect!', style: 'default' }]
              );
              
              // Remove the insight after applying
              setInsights(prev => prev.filter(i => i.id !== insight.id));
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error applying auto action:', error);
    }
  };

  const toggleInsightExpansion = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#E74C3C';
      case 'high': return '#E67E22';
      case 'medium': return '#F39C12';
      case 'low': return '#00B894';
      default: return '#74C69D';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return 'warning';
      case 'prediction': return 'trending-up';
      case 'recommendation': return 'bulb';
      case 'achievement': return 'trophy';
      default: return 'information-circle';
    }
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#00B894';
      case 'moderate': return '#F39C12';
      case 'hard': return '#E74C3C';
      default: return '#74C69D';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Analyzing spending patterns...</Text>
      </View>
    );
  }

  if (insights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={48} color="#00B894" />
        <Text style={styles.emptyTitle}>All Looking Good!</Text>
        <Text style={styles.emptyText}>No predictions or warnings at the moment</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="analytics" size={20} color="#00B894" />
        <Text style={styles.title}>Predictive Insights</Text>
        <View style={styles.insightsBadge}>
          <Text style={styles.insightsBadgeText}>{insights.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.insightsList} showsVerticalScrollIndicator={false}>
        {insights.map((insight) => {
          const pulseAnimation = pulseAnimations.get(insight.id);
          const isExpanded = expandedInsights.has(insight.id);

          return (
            <Animated.View
              key={insight.id}
              style={[
                styles.insightCard,
                { borderLeftColor: getSeverityColor(insight.severity) },
                pulseAnimation && {
                  transform: [{ scale: pulseAnimation }],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => toggleInsightExpansion(insight.id)}
                style={styles.insightHeader}
              >
                <View style={styles.insightLeft}>
                  <View style={[
                    styles.typeIcon,
                    { backgroundColor: getSeverityColor(insight.severity) }
                  ]}>
                    <Ionicons 
                      name={getTypeIcon(insight.type) as any} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.insightInfo}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    {insight.category_name && (
                      <Text style={styles.insightCategory}>{insight.category_name}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.insightRight}>
                  {insight.prediction.probability && (
                    <Text style={styles.probabilityText}>
                      {insight.prediction.probability}%
                    </Text>
                  )}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#74C69D"
                  />
                </View>
              </TouchableOpacity>

              <Text style={styles.insightMessage}>{insight.message}</Text>

              {insight.prediction.days_to_exceed && (
                <View style={styles.urgencyContainer}>
                  <Ionicons name="time" size={16} color="#E74C3C" />
                  <Text style={styles.urgencyText}>
                    Likely to exceed in {insight.prediction.days_to_exceed} days
                  </Text>
                </View>
              )}

              {isExpanded && (
                <View style={styles.expandedContent}>
                  {/* Prediction Details */}
                  {insight.prediction.projected_overage && (
                    <View style={styles.predictionDetails}>
                      <Text style={styles.sectionTitle}>Prediction Details</Text>
                      <View style={styles.predictionStats}>
                        <View style={styles.predictionStat}>
                          <Text style={styles.statLabel}>Projected Overage</Text>
                          <Text style={[styles.statValue, { color: '#E74C3C' }]}>
                            {formatCurrency(insight.prediction.projected_overage)}
                          </Text>
                        </View>
                        {insight.prediction.probability && (
                          <View style={styles.predictionStat}>
                            <Text style={styles.statLabel}>Confidence</Text>
                            <Text style={styles.statValue}>
                              {insight.prediction.probability}%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Recommendations */}
                  {insight.recommendations.length > 0 && (
                    <View style={styles.recommendationsSection}>
                      <Text style={styles.sectionTitle}>Recommended Actions</Text>
                      {insight.recommendations.map((rec, index) => (
                        <View key={index} style={styles.recommendationItem}>
                          <View style={styles.recommendationHeader}>
                            <Text style={styles.recommendationAction}>{rec.action}</Text>
                            <View style={[
                              styles.difficultyBadge,
                              { backgroundColor: getDifficultyColor(rec.difficulty) }
                            ]}>
                              <Text style={styles.difficultyText}>
                                {rec.difficulty.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.recommendationImpact}>{rec.impact}</Text>
                          <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => handleApplyRecommendation(insight, rec)}
                          >
                            <Ionicons name="checkmark" size={16} color="#00B894" />
                            <Text style={styles.applyButtonText}>Apply This</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Auto Action Button */}
                  {insight.can_auto_apply && (
                    <TouchableOpacity
                      style={styles.autoActionButton}
                      onPress={() => handleAutoAction(insight)}
                    >
                      <Ionicons name="flash" size={20} color="#FFFFFF" />
                      <Text style={styles.autoActionText}>Smart Fix</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#74C69D',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#74C69D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#415A77',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  insightsBadge: {
    backgroundColor: '#00B894',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  insightsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  insightsList: {
    maxHeight: 400,
  },
  insightCard: {
    backgroundColor: '#0D1B2A',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  insightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightInfo: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  insightCategory: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 2,
  },
  insightRight: {
    alignItems: 'center',
    gap: 4,
  },
  probabilityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F39C12',
  },
  insightMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 18,
  },
  urgencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  urgencyText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#415A77',
    padding: 16,
    gap: 16,
  },
  predictionDetails: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  predictionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  predictionStat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recommendationsSection: {
    gap: 8,
  },
  recommendationItem: {
    backgroundColor: '#1B263B',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  recommendationImpact: {
    fontSize: 12,
    color: '#00B894',
    fontStyle: 'italic',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  applyButtonText: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
  },
  autoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  autoActionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
