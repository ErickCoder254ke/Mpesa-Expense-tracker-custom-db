import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../config/api';

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

interface BudgetInsight {
  type: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation: string;
  potential_savings?: number;
  category_id?: string;
}

interface BudgetGoalRecommendationsProps {
  month: number;
  year: number;
  onGoalAccept?: (goal: BudgetGoal) => void;
  onInsightAction?: (insight: BudgetInsight) => void;
}

interface GoalProgress {
  goalId: string;
  accepted: boolean;
  progress: number;
  lastUpdated: string;
}


export default function BudgetGoalRecommendations({ 
  month, 
  year, 
  onGoalAccept,
  onInsightAction 
}: BudgetGoalRecommendationsProps) {
  const [goals, setGoals] = useState<BudgetGoal[]>([]);
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [acceptedGoals, setAcceptedGoals] = useState<Set<string>>(new Set());
  const [goalProgress, setGoalProgress] = useState<Map<string, GoalProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<BudgetGoal | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set());
  const [animationValues] = useState(new Map<string, Animated.Value>());

  useEffect(() => {
    loadGoalsAndInsights();
  }, [month, year]);

  const loadGoalsAndInsights = async () => {
    setIsLoading(true);
    try {
      console.log('Loading goals and insights from:', `${BACKEND_URL}/api/budgets/monitoring/goals`);

      // Try to load goals and insights from backend
      const response = await fetch(
        `${BACKEND_URL}/api/budgets/monitoring/goals?month=${month}&year=${year}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Goals and insights loaded successfully:', {
          goals: data.goals?.length || 0,
          insights: data.insights?.length || 0
        });
        setGoals(data.goals || []);
        setInsights(data.insights || []);
      } else if (response.status === 404) {
        console.log('Goals endpoint not found, using empty state');
        setGoals([]);
        setInsights([]);
      } else {
        console.error('Goals API failed:', response.status);
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Goals API error:', errorData);
        setGoals([]);
        setInsights([]);
      }
    } catch (error) {
      console.error('Error loading goals and insights:', error);
      // Don't show alert for network errors, just log and continue with empty state
      setGoals([]);
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'reduce_spending': return '#E74C3C';
      case 'optimize_categories': return '#3498DB';
      case 'increase_budget': return '#9B59B6';
      default: return '#74C69D';
    }
  };

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'reduce_spending': return 'trending-down';
      case 'optimize_categories': return 'shuffle';
      case 'increase_budget': return 'trending-up';
      default: return 'target';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#00B894';
      case 'moderate': return '#F39C12';
      case 'challenging': return '#E74C3C';
      default: return '#74C69D';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return '#00B894';
      case 'negative': return '#E74C3C';
      case 'neutral': return '#74C69D';
      default: return '#74C69D';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return 'trending-up';
      case 'negative': return 'trending-down';
      case 'neutral': return 'remove';
      default: return 'help';
    }
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const calculatePotentialSavings = (goal: BudgetGoal) => {
    if (goal.type === 'reduce_spending') {
      return goal.current_amount - goal.target_amount;
    }
    return 0;
  };

  const getGoalId = (goal: BudgetGoal, index: number) => {
    return `${goal.type}-${goal.category_id || 'general'}-${index}`;
  };

  const handleGoalAccept = (goal: BudgetGoal, index: number) => {
    const goalId = getGoalId(goal, index);
    const newAccepted = new Set(acceptedGoals);
    newAccepted.add(goalId);
    setAcceptedGoals(newAccepted);

    // Animate acceptance
    const animValue = new Animated.Value(0);
    animationValues.set(goalId, animValue);
    
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (onGoalAccept) {
      onGoalAccept(goal);
    }

    Alert.alert(
      'Goal Accepted!',
      `We'll help you track progress towards your ${goal.category_name || 'budget'} goal.`,
      [{ text: 'Great!', style: 'default' }]
    );
  };

  const handleGoalDetails = (goal: BudgetGoal) => {
    setSelectedGoal(goal);
    setShowGoalModal(true);
  };

  const toggleInsightExpansion = (index: number) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedInsights(newExpanded);
  };

  const handleInsightAction = (insight: BudgetInsight) => {
    if (onInsightAction) {
      onInsightAction(insight);
    }

    Alert.alert(
      'Apply Recommendation?',
      `Would you like to apply this recommendation: ${insight.recommendation}`,
      [
        { text: 'Not Now', style: 'cancel' },
        { 
          text: 'Apply', 
          onPress: () => {
            Alert.alert('Applied!', 'Recommendation has been noted for your budget planning.');
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Generating recommendations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Goals Section */}
      {goals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="target" size={24} color="#00B894" />
            <Text style={styles.sectionTitle}>Recommended Goals</Text>
            <View style={styles.goalsBadge}>
              <Text style={styles.goalsBadgeText}>{goals.length}</Text>
            </View>
          </View>

          <View style={styles.goalsGrid}>
            {goals.map((goal, index) => {
              const goalId = getGoalId(goal, index);
              const isAccepted = acceptedGoals.has(goalId);
              const animValue = animationValues.get(goalId);
              const potentialSavings = calculatePotentialSavings(goal);

              return (
                <Animated.View 
                  key={goalId}
                  style={[
                    styles.goalCard,
                    isAccepted && styles.acceptedGoalCard,
                    animValue && {
                      transform: [{ scale: animValue }],
                      opacity: animValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.8]
                      })
                    }
                  ]}
                >
                  <View style={styles.goalHeader}>
                    <View style={[
                      styles.goalTypeIcon,
                      { backgroundColor: getGoalTypeColor(goal.type) }
                    ]}>
                      <Ionicons 
                        name={getGoalTypeIcon(goal.type) as any} 
                        size={20} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <View style={styles.goalTitleContainer}>
                      <Text style={styles.goalTitle}>
                        {goal.category_name || 'Overall Budget'}
                      </Text>
                      <Text style={styles.goalTimeframe}>
                        {goal.timeframe.replace('_', ' ')}
                      </Text>
                    </View>
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(goal.difficulty) }
                    ]}>
                      <Text style={styles.difficultyText}>
                        {goal.difficulty.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.goalTargets}>
                    <View style={styles.targetItem}>
                      <Text style={styles.targetLabel}>Current</Text>
                      <Text style={styles.targetValue}>
                        {formatCurrency(goal.current_amount)}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#74C69D" />
                    <View style={styles.targetItem}>
                      <Text style={styles.targetLabel}>Target</Text>
                      <Text style={[
                        styles.targetValue,
                        { color: getGoalTypeColor(goal.type) }
                      ]}>
                        {formatCurrency(goal.target_amount)}
                      </Text>
                    </View>
                  </View>

                  {potentialSavings > 0 && (
                    <View style={styles.savingsIndicator}>
                      <Ionicons name="cash" size={16} color="#00B894" />
                      <Text style={styles.savingsText}>
                        Save {formatCurrency(potentialSavings)}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.goalImpact} numberOfLines={2}>
                    {goal.potential_impact}
                  </Text>

                  <View style={styles.goalActions}>
                    <TouchableOpacity 
                      style={styles.detailsButton}
                      onPress={() => handleGoalDetails(goal)}
                    >
                      <Ionicons name="information-circle" size={16} color="#74C69D" />
                      <Text style={styles.detailsButtonText}>Details</Text>
                    </TouchableOpacity>

                    {!isAccepted ? (
                      <TouchableOpacity 
                        style={styles.acceptButton}
                        onPress={() => handleGoalAccept(goal, index)}
                      >
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        <Text style={styles.acceptButtonText}>Accept Goal</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.acceptedIndicator}>
                        <Ionicons name="checkmark-circle" size={16} color="#00B894" />
                        <Text style={styles.acceptedText}>Accepted</Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>
      )}

      {/* Insights Section */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={24} color="#F39C12" />
            <Text style={styles.sectionTitle}>Budget Insights</Text>
            <View style={styles.insightsBadge}>
              <Text style={styles.insightsBadgeText}>{insights.length}</Text>
            </View>
          </View>

          <View style={styles.insightsList}>
            {insights.map((insight, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.insightCard,
                  { borderLeftColor: getImpactColor(insight.impact) }
                ]}
                onPress={() => toggleInsightExpansion(index)}
              >
                <View style={styles.insightHeader}>
                  <View style={styles.insightLeft}>
                    <Ionicons 
                      name={getImpactIcon(insight.impact) as any} 
                      size={20} 
                      color={getImpactColor(insight.impact)} 
                    />
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                  </View>
                  <Ionicons 
                    name={expandedInsights.has(index) ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#74C69D" 
                  />
                </View>

                <Text style={styles.insightDescription} numberOfLines={2}>
                  {insight.description}
                </Text>

                {expandedInsights.has(index) && (
                  <View style={styles.insightExpanded}>
                    <View style={styles.recommendationContainer}>
                      <Text style={styles.recommendationLabel}>Recommendation:</Text>
                      <Text style={styles.recommendationText}>
                        {insight.recommendation}
                      </Text>
                    </View>

                    {insight.potential_savings && (
                      <View style={styles.potentialSavings}>
                        <Ionicons name="trending-up" size={16} color="#00B894" />
                        <Text style={styles.potentialSavingsText}>
                          Potential savings: {formatCurrency(insight.potential_savings)}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity 
                      style={styles.applyButton}
                      onPress={() => handleInsightAction(insight)}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.applyButtonText}>Apply Recommendation</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {goals.length === 0 && insights.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics" size={64} color="#74C69D" />
          <Text style={styles.emptyTitle}>Building Recommendations</Text>
          <Text style={styles.emptyText}>
            Continue using the app to generate personalized budget goals and insights
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadGoalsAndInsights}
          >
            <Ionicons name="refresh" size={16} color="#00B894" />
            <Text style={styles.refreshButtonText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Goal Detail Modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGoalModal(false)}
      >
        {selectedGoal && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowGoalModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Goal Details</Text>
              <View style={[
                styles.goalTypeBadge,
                { backgroundColor: getGoalTypeColor(selectedGoal.type) }
              ]}>
                <Text style={styles.goalTypeBadgeText}>
                  {selectedGoal.type.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.goalDetailCard}>
                <View style={styles.goalDetailHeader}>
                  <View style={[
                    styles.goalDetailIcon,
                    { backgroundColor: getGoalTypeColor(selectedGoal.type) }
                  ]}>
                    <Ionicons 
                      name={getGoalTypeIcon(selectedGoal.type) as any} 
                      size={32} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.goalDetailTitleContainer}>
                    <Text style={styles.goalDetailTitle}>
                      {selectedGoal.category_name || 'Overall Budget'}
                    </Text>
                    <Text style={styles.goalDetailTimeframe}>
                      {selectedGoal.timeframe.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.goalDetailTargets}>
                  <View style={styles.goalDetailTarget}>
                    <Text style={styles.goalDetailTargetLabel}>Current Amount</Text>
                    <Text style={styles.goalDetailTargetValue}>
                      {formatCurrency(selectedGoal.current_amount)}
                    </Text>
                  </View>
                  <View style={styles.goalDetailTarget}>
                    <Text style={styles.goalDetailTargetLabel}>Target Amount</Text>
                    <Text style={[
                      styles.goalDetailTargetValue,
                      { color: getGoalTypeColor(selectedGoal.type) }
                    ]}>
                      {formatCurrency(selectedGoal.target_amount)}
                    </Text>
                  </View>
                </View>

                <View style={styles.goalProgress}>
                  <Text style={styles.goalProgressLabel}>Progress to Target</Text>
                  <View style={styles.goalProgressBar}>
                    <View style={[
                      styles.goalProgressFill,
                      { 
                        width: `${Math.min((selectedGoal.target_amount / selectedGoal.current_amount) * 100, 100)}%`,
                        backgroundColor: getGoalTypeColor(selectedGoal.type)
                      }
                    ]} />
                  </View>
                  <Text style={styles.goalProgressText}>
                    {selectedGoal.type === 'reduce_spending' 
                      ? `Reduce by ${formatCurrency(selectedGoal.current_amount - selectedGoal.target_amount)}`
                      : `Increase by ${formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)}`
                    }
                  </Text>
                </View>

                <View style={styles.goalImpactSection}>
                  <Text style={styles.goalImpactLabel}>Expected Impact</Text>
                  <Text style={styles.goalImpactDescription}>
                    {selectedGoal.potential_impact}
                  </Text>
                </View>

                <View style={[
                  styles.difficultySection,
                  { backgroundColor: `${getDifficultyColor(selectedGoal.difficulty)}20` }
                ]}>
                  <View style={styles.difficultyHeader}>
                    <Ionicons 
                      name="fitness" 
                      size={20} 
                      color={getDifficultyColor(selectedGoal.difficulty)} 
                    />
                    <Text style={[
                      styles.difficultyLabel,
                      { color: getDifficultyColor(selectedGoal.difficulty) }
                    ]}>
                      {selectedGoal.difficulty.toUpperCase()} GOAL
                    </Text>
                  </View>
                  <Text style={styles.difficultyDescription}>
                    {selectedGoal.difficulty === 'easy' 
                      ? 'This goal should be achievable with minimal effort.'
                      : selectedGoal.difficulty === 'moderate'
                      ? 'This goal will require some planning and discipline.'
                      : 'This goal will be challenging but very rewarding.'
                    }
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalAcceptButton}
                onPress={() => {
                  const goalId = getGoalId(selectedGoal, 0);
                  handleGoalAccept(selectedGoal, 0);
                  setShowGoalModal(false);
                }}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.modalAcceptButtonText}>Accept This Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  goalsBadge: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  goalsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  insightsBadge: {
    backgroundColor: '#F39C12',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  insightsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  goalsGrid: {
    gap: 16,
  },
  goalCard: {
    backgroundColor: '#1B263B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  acceptedGoalCard: {
    borderColor: '#00B894',
    backgroundColor: 'rgba(0, 184, 148, 0.05)',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  goalTargets: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: '#0D1B2A',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  targetItem: {
    alignItems: 'center',
    flex: 1,
  },
  targetLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  savingsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  savingsText: {
    color: '#00B894',
    fontSize: 12,
    fontWeight: '600',
  },
  goalImpact: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 16,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#415A77',
    gap: 6,
  },
  detailsButtonText: {
    color: '#74C69D',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#00B894',
    gap: 6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptedIndicator: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 184, 148, 0.2)',
    gap: 6,
  },
  acceptedText: {
    color: '#00B894',
    fontSize: 14,
    fontWeight: '600',
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: '#74C69D',
    lineHeight: 20,
  },
  insightExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#415A77',
    gap: 12,
  },
  recommendationContainer: {
    backgroundColor: '#0D1B2A',
    borderRadius: 8,
    padding: 12,
  },
  recommendationLabel: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  potentialSavings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  potentialSavingsText: {
    color: '#00B894',
    fontSize: 12,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#00B894',
    gap: 6,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#415A77',
    borderRadius: 8,
    gap: 6,
  },
  refreshButtonText: {
    color: '#00B894',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  goalTypeBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  goalDetailCard: {
    backgroundColor: '#1B263B',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  goalDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  goalDetailIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalDetailTitleContainer: {
    flex: 1,
  },
  goalDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalDetailTimeframe: {
    fontSize: 14,
    color: '#74C69D',
    marginTop: 4,
  },
  goalDetailTargets: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  goalDetailTarget: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  goalDetailTargetLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 6,
  },
  goalDetailTargetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalProgress: {
    marginBottom: 20,
  },
  goalProgressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: '#0D1B2A',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalProgressText: {
    fontSize: 12,
    color: '#74C69D',
    textAlign: 'center',
  },
  goalImpactSection: {
    marginBottom: 20,
  },
  goalImpactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  goalImpactDescription: {
    fontSize: 14,
    color: '#74C69D',
    lineHeight: 20,
  },
  difficultySection: {
    padding: 16,
    borderRadius: 12,
  },
  difficultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  difficultyDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  modalActions: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#1B263B',
  },
  modalAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#00B894',
    gap: 8,
  },
  modalAcceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
