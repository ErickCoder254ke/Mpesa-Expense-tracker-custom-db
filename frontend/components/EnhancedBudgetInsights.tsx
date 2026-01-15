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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OptimizationAction {
  id: string;
  type: 'budget_adjust' | 'reallocate' | 'set_limit' | 'categorize' | 'reduce_spending';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  savings?: number;
  category_id?: string;
  category_name?: string;
  current_value?: number;
  suggested_value?: number;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface SmartRecommendation {
  id: string;
  title: string;
  description: string;
  actions: OptimizationAction[];
  potential_impact: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
  estimated_time: string;
}

interface BudgetHealth {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    budget_adherence: number;
    spending_consistency: number;
    categorization_quality: number;
    planning_effectiveness: number;
  };
  improvement_areas: string[];
}

interface EnhancedBudgetInsightsProps {
  month: number;
  year: number;
  onRefresh?: () => void;
  onOptimizationApplied?: (action: OptimizationAction) => void;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function EnhancedBudgetInsights({ 
  month, 
  year, 
  onRefresh,
  onOptimizationApplied 
}: EnhancedBudgetInsightsProps) {
  const [optimizations, setOptimizations] = useState<OptimizationAction[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [budgetHealth, setBudgetHealth] = useState<BudgetHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [selectedOptimization, setSelectedOptimization] = useState<OptimizationAction | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [appliedOptimizations, setAppliedOptimizations] = useState<Set<string>>(new Set());
  const [pulseAnimations] = useState<Map<string, Animated.Value>>(new Map());

  useEffect(() => {
    loadEnhancedInsights();
  }, [month, year]);

  const loadEnhancedInsights = async () => {
    setIsLoading(true);
    try {
      // Generate smart recommendations and optimizations
      const mockOptimizations = await generateOptimizations();
      const mockRecommendations = await generateRecommendations();
      const mockHealth = await calculateBudgetHealth();

      setOptimizations(mockOptimizations);
      setRecommendations(mockRecommendations);
      setBudgetHealth(mockHealth);

      // Setup pulse animations for high priority items
      mockOptimizations
        .filter(opt => opt.priority === 'critical' || opt.priority === 'high')
        .forEach(opt => {
          if (!pulseAnimations.has(opt.id)) {
            const animation = new Animated.Value(1);
            pulseAnimations.set(opt.id, animation);
            startPulseAnimation(animation);
          }
        });

    } catch (error) {
      console.error('Error loading enhanced insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPulseAnimation = (animation: Animated.Value) => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  };

  const generateOptimizations = async (): Promise<OptimizationAction[]> => {
    // In a real app, this would analyze actual budget data
    return [
      {
        id: '1',
        type: 'budget_adjust',
        title: 'Increase Food Budget',
        description: 'Your food spending is consistently 25% over budget',
        impact: 'Prevents budget stress and improves accuracy',
        effort: 'low',
        category_name: 'Food & Dining',
        current_value: 10000,
        suggested_value: 12500,
        confidence: 90,
        priority: 'high',
      },
      {
        id: '2',
        type: 'reallocate',
        title: 'Reallocate Entertainment Budget',
        description: 'You have KSh 1,500 unused in entertainment budget',
        impact: 'Free up budget for overspending categories',
        effort: 'low',
        savings: 1500,
        category_name: 'Entertainment',
        confidence: 85,
        priority: 'medium',
      },
      {
        id: '3',
        type: 'set_limit',
        title: 'Set Daily Spending Limit',
        description: 'Control your food spending with a daily limit',
        impact: 'Stay within budget automatically',
        effort: 'low',
        category_name: 'Food & Dining',
        suggested_value: 350,
        confidence: 95,
        priority: 'high',
      },
      {
        id: '4',
        type: 'categorize',
        title: 'Fix Uncategorized Transactions',
        description: '15 transactions need categorization for accurate tracking',
        impact: 'Improve budget accuracy by 15%',
        effort: 'medium',
        confidence: 100,
        priority: 'critical',
      },
      {
        id: '5',
        type: 'reduce_spending',
        title: 'Transportation Optimization',
        description: 'Switch to public transport 2 days/week',
        impact: 'Save KSh 800/month on transport costs',
        effort: 'medium',
        savings: 800,
        category_name: 'Transportation',
        confidence: 75,
        priority: 'medium',
      },
    ];
  };

  const generateRecommendations = async (): Promise<SmartRecommendation[]> => {
    return [
      {
        id: '1',
        title: 'Budget Rebalancing Package',
        description: 'Optimize your entire budget allocation based on spending patterns',
        potential_impact: 'Reduce budget stress by 40% and improve accuracy',
        difficulty: 'easy',
        estimated_time: '2 minutes',
        actions: [
          {
            id: 'r1_1',
            type: 'budget_adjust',
            title: 'Adjust Food Budget',
            description: 'Increase from KSh 10,000 to KSh 12,000',
            impact: 'Accommodates actual spending',
            effort: 'low',
            confidence: 90,
            priority: 'high',
          },
          {
            id: 'r1_2',
            type: 'reallocate',
            title: 'Reduce Entertainment',
            description: 'Move KSh 2,000 from entertainment to food',
            impact: 'Balances budget allocation',
            effort: 'low',
            confidence: 85,
            priority: 'medium',
          },
        ],
      },
      {
        id: '2',
        title: 'Smart Spending Controls',
        description: 'Set up automatic spending limits to prevent overspending',
        potential_impact: 'Never exceed budgets again',
        difficulty: 'easy',
        estimated_time: '1 minute',
        actions: [
          {
            id: 'r2_1',
            type: 'set_limit',
            title: 'Daily Food Limit',
            description: 'Set KSh 400 daily limit for food expenses',
            impact: 'Automatic spending control',
            effort: 'low',
            confidence: 95,
            priority: 'high',
          },
        ],
      },
    ];
  };

  const calculateBudgetHealth = async (): Promise<BudgetHealth> => {
    // Mock budget health calculation
    return {
      score: 78,
      grade: 'B',
      factors: {
        budget_adherence: 72,
        spending_consistency: 85,
        categorization_quality: 60,
        planning_effectiveness: 90,
      },
      improvement_areas: [
        'Improve transaction categorization',
        'Adjust food budget allocation',
        'Set up spending alerts',
      ],
    };
  };

  const handleOptimizationTap = (optimization: OptimizationAction) => {
    if (appliedOptimizations.has(optimization.id)) {
      Alert.alert('Already Applied', 'This optimization has already been applied.');
      return;
    }

    setSelectedOptimization(optimization);
    
    if (optimization.type === 'budget_adjust' || optimization.type === 'set_limit') {
      setCustomValue(optimization.suggested_value?.toString() || '');
      setShowOptimizationModal(true);
    } else {
      handleApplyOptimization(optimization);
    }
  };

  const handleApplyOptimization = async (optimization: OptimizationAction, customAmount?: number) => {
    try {
      let confirmationMessage = '';
      let actionDescription = '';

      switch (optimization.type) {
        case 'budget_adjust':
          const newAmount = customAmount || optimization.suggested_value;
          actionDescription = `Adjust ${optimization.category_name} budget to ${formatCurrency(newAmount!)}`;
          confirmationMessage = `Budget updated! Your ${optimization.category_name} budget is now ${formatCurrency(newAmount!)}.`;
          break;
        case 'reallocate':
          actionDescription = `Reallocate ${formatCurrency(optimization.savings!)} from ${optimization.category_name}`;
          confirmationMessage = `Budget reallocated! ${formatCurrency(optimization.savings!)} moved to where it's needed.`;
          break;
        case 'set_limit':
          const limitAmount = customAmount || optimization.suggested_value;
          actionDescription = `Set daily spending limit for ${optimization.category_name}`;
          confirmationMessage = `Spending limit set! You'll get alerts when approaching ${formatCurrency(limitAmount!)}/day.`;
          break;
        case 'categorize':
          actionDescription = 'Launch smart categorization';
          confirmationMessage = 'Smart categorization launched! This will improve your budget accuracy.';
          break;
        case 'reduce_spending':
          actionDescription = `Apply spending reduction strategy for ${optimization.category_name}`;
          confirmationMessage = `Strategy applied! This could save you ${formatCurrency(optimization.savings!)}/month.`;
          break;
      }

      Alert.alert(
        'Apply Optimization',
        `${actionDescription}\n\nImpact: ${optimization.impact}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: async () => {
              // Mark as applied
              setAppliedOptimizations(prev => new Set([...prev, optimization.id]));
              
              if (onOptimizationApplied) {
                onOptimizationApplied(optimization);
              }

              Alert.alert('Success!', confirmationMessage);
              
              // Refresh insights
              if (onRefresh) onRefresh();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error applying optimization:', error);
      Alert.alert('Error', 'Failed to apply optimization. Please try again.');
    } finally {
      setShowOptimizationModal(false);
      setSelectedOptimization(null);
    }
  };

  const handleApplyRecommendation = async (recommendation: SmartRecommendation) => {
    Alert.alert(
      'Apply Recommendation Package',
      `Apply "${recommendation.title}"?\n\nThis will:\n${recommendation.actions.map(a => `• ${a.title}`).join('\n')}\n\nEstimated time: ${recommendation.estimated_time}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply All',
          onPress: async () => {
            // Apply all actions in the recommendation
            for (const action of recommendation.actions) {
              setAppliedOptimizations(prev => new Set([...prev, action.id]));
            }
            
            Alert.alert(
              'Package Applied!',
              `Successfully applied "${recommendation.title}". ${recommendation.potential_impact}`
            );
            
            if (onRefresh) onRefresh();
          }
        }
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#E74C3C';
      case 'high': return '#E67E22';
      case 'medium': return '#F39C12';
      case 'low': return '#00B894';
      default: return '#74C69D';
    }
  };

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case 'low': return 'flash';
      case 'medium': return 'build';
      case 'high': return 'construct';
      default: return 'help';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return '#00B894';
    if (score >= 80) return '#74C69D';
    if (score >= 70) return '#F39C12';
    if (score >= 60) return '#E67E22';
    return '#E74C3C';
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Analyzing your budget for optimizations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Budget Health Score */}
      {budgetHealth && (
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthTitle}>Budget Health Score</Text>
            <View style={styles.healthScore}>
              <Text style={[styles.scoreNumber, { color: getHealthScoreColor(budgetHealth.score) }]}>
                {budgetHealth.score}
              </Text>
              <Text style={styles.scoreGrade}>{budgetHealth.grade}</Text>
            </View>
          </View>
          
          <View style={styles.healthFactors}>
            {Object.entries(budgetHealth.factors).map(([key, value]) => (
              <View key={key} style={styles.factorItem}>
                <Text style={styles.factorLabel}>
                  {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <View style={styles.factorBar}>
                  <View 
                    style={[
                      styles.factorProgress, 
                      { 
                        width: `${value}%`,
                        backgroundColor: getHealthScoreColor(value)
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.factorValue}>{value}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Optimizations */}
      <View style={styles.optimizationsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>One-Tap Optimizations</Text>
          <View style={styles.optimizationsBadge}>
            <Text style={styles.badgeText}>{optimizations.filter(opt => !appliedOptimizations.has(opt.id)).length}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optimizationsList}>
          {optimizations
            .filter(opt => !appliedOptimizations.has(opt.id))
            .map((optimization) => {
              const pulseAnimation = pulseAnimations.get(optimization.id);
              
              return (
                <Animated.View
                  key={optimization.id}
                  style={[
                    styles.optimizationCard,
                    { borderLeftColor: getPriorityColor(optimization.priority) },
                    pulseAnimation && {
                      transform: [{ scale: pulseAnimation }],
                    },
                  ]}
                >
                  <TouchableOpacity onPress={() => handleOptimizationTap(optimization)}>
                    <View style={styles.optimizationHeader}>
                      <View style={styles.optimizationLeft}>
                        <Ionicons 
                          name={getEffortIcon(optimization.effort) as any} 
                          size={20} 
                          color={getPriorityColor(optimization.priority)} 
                        />
                        <Text style={styles.optimizationTitle}>{optimization.title}</Text>
                      </View>
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>{optimization.confidence}%</Text>
                      </View>
                    </View>

                    <Text style={styles.optimizationDescription}>{optimization.description}</Text>
                    <Text style={styles.optimizationImpact}>{optimization.impact}</Text>

                    {optimization.savings && (
                      <View style={styles.savingsContainer}>
                        <Ionicons name="trending-down" size={16} color="#00B894" />
                        <Text style={styles.savingsText}>
                          Save {formatCurrency(optimization.savings)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.optimizationFooter}>
                      <View style={[styles.effortBadge, { backgroundColor: getPriorityColor(optimization.priority) }]}>
                        <Text style={styles.effortText}>{optimization.effort.toUpperCase()} EFFORT</Text>
                      </View>
                      <Text style={styles.tapHint}>Tap to apply</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
        </ScrollView>
      </View>

      {/* Smart Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>Smart Recommendation Packages</Text>
          
          {recommendations.map((recommendation) => (
            <View key={recommendation.id} style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <View style={styles.recommendationLeft}>
                  <Ionicons name="bulb" size={24} color="#F39C12" />
                  <View>
                    <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                    <Text style={styles.recommendationDifficulty}>
                      {recommendation.difficulty} • {recommendation.estimated_time}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
              <Text style={styles.recommendationImpact}>{recommendation.potential_impact}</Text>

              <View style={styles.actionsPreview}>
                <Text style={styles.actionsTitle}>Includes:</Text>
                {recommendation.actions.map((action, index) => (
                  <Text key={index} style={styles.actionPreview}>
                    • {action.title}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                style={styles.applyPackageButton}
                onPress={() => handleApplyRecommendation(recommendation)}
              >
                <Ionicons name="flash" size={20} color="#FFFFFF" />
                <Text style={styles.applyPackageText}>Apply Package</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Optimization Modal */}
      <Modal
        visible={showOptimizationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedOptimization?.title}
              </Text>
              <TouchableOpacity onPress={() => setShowOptimizationModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {selectedOptimization && (
              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  {selectedOptimization.description}
                </Text>

                {(selectedOptimization.type === 'budget_adjust' || selectedOptimization.type === 'set_limit') && (
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>
                      {selectedOptimization.type === 'budget_adjust' ? 'New Budget Amount:' : 'Daily Limit:'}
                    </Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.currencySymbol}>KSh</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={customValue}
                        onChangeText={setCustomValue}
                        placeholder={selectedOptimization.suggested_value?.toString()}
                        placeholderTextColor="#74C69D"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowOptimizationModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => handleApplyOptimization(
                      selectedOptimization, 
                      customValue ? parseFloat(customValue) : undefined
                    )}
                  >
                    <Text style={styles.applyButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#74C69D',
    fontSize: 16,
  },
  healthCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  healthScore: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreGrade: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '600',
  },
  healthFactors: {
    gap: 12,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  factorLabel: {
    flex: 1,
    fontSize: 12,
    color: '#74C69D',
  },
  factorBar: {
    flex: 2,
    height: 6,
    backgroundColor: '#415A77',
    borderRadius: 3,
    overflow: 'hidden',
  },
  factorProgress: {
    height: '100%',
    borderRadius: 3,
  },
  factorValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  optimizationsSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  optimizationsBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optimizationsList: {
    paddingRight: 24,
  },
  optimizationCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    borderLeftWidth: 4,
    width: 280,
  },
  optimizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optimizationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  optimizationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#00B894',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  confidenceText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  optimizationDescription: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 6,
    lineHeight: 16,
  },
  optimizationImpact: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
    marginBottom: 8,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  savingsText: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: 'bold',
  },
  optimizationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  effortBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  effortText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tapHint: {
    fontSize: 10,
    color: '#74C69D',
    fontStyle: 'italic',
  },
  recommendationsSection: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recommendationDifficulty: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 2,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#74C69D',
    marginBottom: 8,
    lineHeight: 18,
  },
  recommendationImpact: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsPreview: {
    marginBottom: 16,
  },
  actionsTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 6,
  },
  actionPreview: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 2,
  },
  applyPackageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F39C12',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  applyPackageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1B263B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#415A77',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#74C69D',
    lineHeight: 18,
  },
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1B2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#74C69D',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#415A77',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#74C69D',
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#00B894',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
