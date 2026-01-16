import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeIcon from '@/components/SafeIcon';
import EnhancedSmartCategorizationModal from '../../components/EnhancedSmartCategorizationModal';
import EnhancedBudgetInsights from '../../components/EnhancedBudgetInsights';
import BudgetMonitoringDashboard from '../../components/BudgetMonitoringDashboard';
import ProactiveBudgetAlerts from '../../components/ProactiveBudgetAlerts';
import BudgetGoalRecommendations from '../../components/BudgetGoalRecommendations';
import PredictiveBudgetInsights from '../../components/PredictiveBudgetInsights';
import { useSmartCategorization } from '../../hooks/useSmartCategorization';
import { testBackendConnection, logEnvironmentInfo } from '../../utils/testBackendConnection';
import { BACKEND_URL } from '@/config/api';
import { getAuthHeaders } from '@/utils/apiClient';

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: 'monthly';
  month: number;
  year: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  keywords?: string[];
  is_default?: boolean;
}

interface BudgetProgress {
  budget: Budget;
  category: Category;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export default function BudgetScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSmartCategorization, setShowSmartCategorization] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);

  // Form state management
  const [formAmount, setFormAmount] = useState('');
  const [formErrors, setFormErrors] = useState<{ amount?: string; category?: string }>({});

  const {
    hasUncategorizedTransactions,
    suggestionCount,
    checkForUncategorizedTransactions,
    markAsCompleted,
    getSmartInsights
  } = useSmartCategorization();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    // Test backend connection on startup (development only)
    if (__DEV__) {
      logEnvironmentInfo();
      testBackendConnection().catch(console.error);
    }

    loadData();
    checkForUncategorizedTransactions();
  }, [checkForUncategorizedTransactions]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Budget screen focused - refreshing data');
      loadData(true);
      checkForUncategorizedTransactions();
    }, [checkForUncategorizedTransactions])
  );

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Try to load categories from backend
      let categoriesData: Category[] = [];
      try {
        console.log('Loading categories from:', `${BACKEND_URL}/api/categories/`);
        const headers = await getAuthHeaders();
        const categoriesResponse = await fetch(`${BACKEND_URL}/api/categories/`, { headers });

        if (categoriesResponse.ok) {
          categoriesData = await categoriesResponse.json();
          console.log('Categories loaded from backend:', categoriesData.length);
          console.log('Backend categories:', categoriesData.map(c => ({ id: c.id, name: c.name })));
        } else {
          console.warn('Categories API failed:', categoriesResponse.status);
          throw new Error(`API responded with status ${categoriesResponse.status}`);
        }
      } catch (error) {
        console.error('Failed to load categories from backend:', error);
        throw new Error('Unable to load categories. Please check your connection.');
      }

      // Filter out Income category for budgeting
      const expenseCategories = categoriesData.filter((cat: Category) => cat.name !== 'Income');
      setCategories(expenseCategories);
      console.log('Final expense categories available:', expenseCategories.length);
      console.log('Final categories for lookup:', expenseCategories.map(c => ({ id: c.id, name: c.name })));

      // Load budgets
      try {
        const headers = await getAuthHeaders();
        const budgetsResponse = await fetch(`${BACKEND_URL}/api/budgets/?month=${currentMonth}&year=${currentYear}`, { headers });

        if (budgetsResponse.ok) {
          const budgetsData = await budgetsResponse.json();
          console.log('Budgets loaded from backend:', budgetsData.length);
          console.log('Budget category IDs:', budgetsData.map((b: any) => ({ id: b.id, category_id: b.category_id })));
          setBudgets(budgetsData);
          await calculateBudgetProgress(budgetsData);
        } else {
          console.error('Budgets API failed:', budgetsResponse.status);
          const errorData = await budgetsResponse.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `Budgets API failed with status ${budgetsResponse.status}`);
        }
      } catch (budgetError) {
        console.error('Failed to load budgets:', budgetError);
        throw budgetError;
      }

    } catch (error) {
      console.error('Load data error:', error);

      // Clear any existing data
      setCategories([]);
      setBudgets([]);
      setBudgetProgress([]);

      if (!isRefresh) {
        Alert.alert(
          'Connection Error',
          'Unable to load budget data. Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: () => loadData() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const calculateBudgetProgress = async (budgetData: Budget[]) => {
    try {
      // Get spending data for current month
      const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const endDate = new Date(currentYear, currentMonth, 0).toISOString();
      
      const spendingResponse = await fetch(
        `${BACKEND_URL}/api/transactions/?type=expense&start_date=${startDate}&end_date=${endDate}`
      );

      if (spendingResponse.ok) {
        const transactions = await spendingResponse.json();
        
        const progress = budgetData.map((budget, index) => {
          // Ensure budget has required fields
          if (!budget || !budget.category_id) {
            console.warn(`Invalid budget data at index ${index}:`, budget);
            return null;
          }

          // Try multiple matching strategies
          let category = categories.find(cat => cat.id === budget.category_id);

          // If no exact match, try name-based matching as fallback
          if (!category && budget.category_name) {
            category = categories.find(cat => cat.name === budget.category_name);
          }

          // If still no match, try partial name matching
          if (!category && budget.category_name) {
            category = categories.find(cat =>
              cat.name.toLowerCase().includes(budget.category_name.toLowerCase()) ||
              budget.category_name.toLowerCase().includes(cat.name.toLowerCase())
            );
          }

          const spent = transactions
            .filter((t: any) => t.category_id === budget.category_id)
            .reduce((sum: number, t: any) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

          const budgetAmount = typeof budget.amount === 'number' ? budget.amount : 0;
          const remaining = budgetAmount - spent;
          const percentage = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
          const isOverBudget = spent > budgetAmount;

          // Enhanced debug logging for category lookup
          console.log(`Budget category lookup:`, {
            budget_id: budget.id,
            budget_category_id: budget.category_id,
            budget_category_name: budget.category_name,
            found_category: category ? { id: category.id, name: category.name } : null,
            available_categories_count: categories.length
          });

          if (!category) {
            console.warn(`No category found for budget ${budget.id}:`, {
              budget_category_id: budget.category_id,
              budget_category_name: budget.category_name,
              available_categories: categories.map(c => ({ id: c.id, name: c.name }))
            });
          }

          return {
            budget: {
              ...budget,
              id: budget.id || `budget_${index}_${Date.now()}`,
              amount: budgetAmount
            },
            category: category || {
              id: budget.category_id || `unknown_${index}`,
              name: `Unknown (${budget.category_id || 'No ID'})`,
              icon: 'help-circle',
              color: '#636E72',
              keywords: [],
              is_default: false
            },
            spent: spent || 0,
            remaining: remaining || 0,
            percentage: percentage || 0,
            isOverBudget,
          };
        }).filter(Boolean); // Remove null entries

        setBudgetProgress(progress);
      }
    } catch (error) {
      console.error('Calculate budget progress error:', error);
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const handleAddBudget = () => {
    setEditingBudget(null);
    setSelectedCategory(null);
    setFormAmount('');
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEditBudget = (budget: Budget) => {
    const category = categories.find(cat => cat.id === budget.category_id);
    setEditingBudget(budget);
    setSelectedCategory(category || null);
    setFormAmount(budget.amount.toString());
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleDeleteBudget = (budget: Budget) => {
    const category = categories.find(cat => cat.id === budget.category_id);
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for ${category?.name || 'this category'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteBudget(budget) }
      ]
    );
  };

  const confirmDeleteBudget = async (budget: Budget) => {
    try {
      console.log('Deleting budget:', budget.id);

      const response = await fetch(`${BACKEND_URL}/api/budgets/${budget.id}`, {
        method: 'DELETE',
      });

      console.log('Delete budget response status:', response.status);

      if (response.ok) {
        console.log('Budget deleted successfully from backend');

        // Remove from local state
        setBudgets(prev => prev.filter(b => b.id !== budget.id));
        setBudgetProgress(prev => prev.filter(p => p.budget.id !== budget.id));
        Alert.alert('Success', 'Budget deleted successfully!');
      } else if (response.status === 404) {
        console.warn('Budget not found on backend');
        Alert.alert('Error', 'Budget not found. It may have already been deleted.');
      } else {
        const errorText = await response.text();
        console.error('Delete budget error:', response.status, errorText);

        try {
          const errorData = JSON.parse(errorText);
          Alert.alert('Error', errorData.detail || 'Failed to delete budget');
        } catch {
          Alert.alert('Error', `Failed to delete budget (Status: ${response.status})`);
        }
      }
    } catch (error) {
      console.error('Delete budget network error:', error);
      Alert.alert(
        'Network Error',
        'Unable to connect to server. Please check your internet connection and try again.'
      );
    }
  };

  const validateForm = () => {
    const errors: { amount?: string; category?: string } = {};

    if (!formAmount || formAmount.trim() === '') {
      errors.amount = 'Budget amount is required';
    } else if (!/^\d+\.?\d{0,2}$/.test(formAmount)) {
      errors.amount = 'Enter a valid amount';
    } else if (parseFloat(formAmount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (!selectedCategory) {
      errors.category = 'Please select a category';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedAmount = parseFloat(formAmount);
      const budgetData = {
        category_id: selectedCategory.id,
        amount: isNaN(parsedAmount) ? 0 : parsedAmount,
        period: 'monthly' as const,
        month: currentMonth,
        year: currentYear,
      };

      const isEditing = !!editingBudget;
      const url = isEditing
        ? `${BACKEND_URL}/api/budgets/${editingBudget.id}`
        : `${BACKEND_URL}/api/budgets/`;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetData),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Budget operation successful:', responseData);

        setShowAddModal(false);
        Alert.alert('Success', `Budget ${isEditing ? 'updated' : 'created'} successfully!`);
        loadData(); // Refresh to recalculate progress
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Budget operation failed:', response.status, errorData);
        Alert.alert('Error', errorData.detail || `Failed to ${isEditing ? 'update' : 'create'} budget`);
      }
    } catch (error) {
      console.error('Budget operation network error:', error);
      Alert.alert(
        'Network Error',
        'Unable to connect to server. Please check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormErrors(prev => ({ ...prev, category: undefined }));
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const handleAlertAction = (alertId: string, action: 'dismiss' | 'snooze' | 'view') => {
    console.log(`Alert ${alertId} action: ${action}`);
    if (action === 'view') {
      // Could navigate to specific budget category or show more details
    }
  };

  const handleGoalAccept = (goal: any) => {
    console.log('Goal accepted:', goal);
    Alert.alert(
      'Goal Accepted!',
      `Great! We'll help you track progress towards your ${goal.category_name || 'budget'} goal.`,
      [{ text: 'Perfect!', style: 'default' }]
    );
  };

  const handleInsightAction = (insight: any) => {
    console.log('Insight action:', insight);
    Alert.alert(
      'Apply Recommendation?',
      `Apply this recommendation: ${insight.recommendation}`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            Alert.alert('Applied!', 'Recommendation has been applied to your budget strategy.');
          }
        }
      ]
    );
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'simple' ? 'advanced' : 'simple');
  };

  const getProgressColor = (progress: BudgetProgress) => {
    if (progress.isOverBudget) return '#E74C3C';
    if ((progress.percentage || 0) > 80) return '#F39C12';
    return '#00B894';
  };

  const getAvailableCategories = () => {
    const budgetCategoryIds = budgets.map(b => b.category_id);
    return categories.filter(cat => 
      !budgetCategoryIds.includes(cat.id) || (editingBudget && cat.id === editingBudget.category_id)
    );
  };

  const getTotalBudget = () => {
    return budgets.reduce((sum, budget) => sum + (typeof budget.amount === 'number' ? budget.amount : 0), 0);
  };

  const getTotalSpent = () => {
    return budgetProgress.reduce((sum, progress) => sum + (typeof progress.spent === 'number' ? progress.spent : 0), 0);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading budget data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Budget</Text>
        <View style={styles.headerActions}>
          {hasUncategorizedTransactions && (
            <TouchableOpacity
              style={styles.smartButton}
              onPress={() => setShowSmartCategorization(true)}
            >
              <Ionicons name="bulb" size={20} color="#F39C12" />
              <Text style={styles.smartButtonText}>{suggestionCount}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={toggleViewMode}
          >
            <Ionicons
              name={viewMode === 'simple' ? 'analytics' : 'list'}
              size={20}
              color="#74C69D"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAddBudget}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'simple' ? (
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
          {/* Proactive Budget Alerts */}
          <View style={styles.alertsSection}>
            <ProactiveBudgetAlerts
              month={currentMonth}
              year={currentYear}
              onAlertAction={handleAlertAction}
            />
          </View>

          {/* Predictive Budget Insights */}
          <View style={styles.predictiveSection}>
            <PredictiveBudgetInsights
              month={currentMonth}
              year={currentYear}
              onActionTaken={(action, category) => {
                console.log(`Smart action applied: ${action} for ${category}`);
                loadData(); // Refresh data after action
              }}
              onRecommendationApplied={(recommendation) => {
                console.log('Recommendation applied:', recommendation);
                loadData(); // Refresh data after recommendation
              }}
            />
          </View>

          {/* Smart Categorization Banner */}
          {hasUncategorizedTransactions && (
            <TouchableOpacity
              style={styles.smartBanner}
              onPress={() => setShowSmartCategorization(true)}
            >
              <View style={styles.smartBannerContent}>
                <View style={styles.smartBannerLeft}>
                  <Ionicons name="bulb" size={24} color="#F39C12" />
                  <View style={styles.smartBannerText}>
                    <Text style={styles.smartBannerTitle}>Smart Categorization</Text>
                    <Text style={styles.smartBannerSubtitle}>
                      {suggestionCount} transactions need categorization for better budget tracking
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#74C69D" />
              </View>
            </TouchableOpacity>
          )}

          {/* Summary Section */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>

            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Budget</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(getTotalBudget())}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={[
                  styles.summaryAmount,
                  { color: getTotalSpent() > getTotalBudget() ? '#E74C3C' : '#00B894' }
                ]}>
                  {formatCurrency(getTotalSpent())}
                </Text>
              </View>
            </View>

            <View style={styles.overallProgress}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Overall Progress</Text>
                <Text style={styles.progressPercentage}>
                  {getTotalBudget() > 0 ? Math.round((getTotalSpent() / getTotalBudget()) * 100) : 0}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  {
                    width: getTotalBudget() > 0 ? `${Math.min((getTotalSpent() / getTotalBudget()) * 100, 100)}%` : '0%',
                    backgroundColor: getTotalSpent() > getTotalBudget() ? '#E74C3C' : '#00B894',
                  }
                ]} />
              </View>
            </View>
          </View>

          {/* Goal Recommendations */}
          <View style={styles.recommendationsSection}>
            <BudgetGoalRecommendations
              month={currentMonth}
              year={currentYear}
              onGoalAccept={handleGoalAccept}
              onInsightAction={handleInsightAction}
            />
          </View>

          {/* Budget Items */}
          {budgetProgress.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color="#415A77" />
              <Text style={styles.emptyStateTitle}>No budgets set</Text>
              <Text style={styles.emptyStateText}>
                Create budgets to track your spending by category
              </Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={handleAddBudget}>
                <Text style={styles.addFirstButtonText}>Create First Budget</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.budgetList}>
              {budgetProgress.map((progress, index) => (
                <View key={progress.budget.id || `budget_item_${index}`} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetLeft}>
                      <View style={[
                        styles.budgetIcon,
                        { backgroundColor: progress.category.color }
                      ]}>
                        <Ionicons name={progress.category.icon as any} size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.budgetDetails}>
                        <Text style={styles.budgetCategoryName}>{progress.category.name}</Text>
                        <Text style={styles.budgetAmount}>
                          {formatCurrency(progress.budget?.amount)} budget
                        </Text>
                      </View>
                    </View>
                    <View style={styles.budgetActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditBudget(progress.budget)}
                      >
                        <Ionicons name="create-outline" size={20} color="#74C69D" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteBudget(progress.budget)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.budgetProgress}>
                    <View style={styles.progressInfo}>
                      <Text style={styles.spentAmount}>
                        {formatCurrency(progress.spent)} spent
                      </Text>
                      <Text style={[
                        styles.remainingAmount,
                        { color: progress.isOverBudget ? '#E74C3C' : '#00B894' }
                      ]}>
                        {progress.isOverBudget
                          ? `${formatCurrency(Math.abs(progress.remaining || 0))} over`
                          : `${formatCurrency(progress.remaining)} left`
                        }
                      </Text>
                    </View>

                    <View style={styles.progressBar}>
                      <View style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(progress.percentage || 0, 100)}%`,
                          backgroundColor: getProgressColor(progress),
                        }
                      ]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <BudgetMonitoringDashboard
          month={currentMonth}
          year={currentYear}
          onRefresh={loadData}
        />
      )}

      {/* Add/Edit Budget Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={styles.modalContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingBudget ? 'Edit Budget' : 'Add Budget'}
              </Text>
              <TouchableOpacity
                onPress={onSubmit}
                disabled={isSubmitting}
              >
                <Text style={[styles.modalSaveText, isSubmitting && styles.modalSaveTextDisabled]}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Amount Input */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Monthly Budget Amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>KSh</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={formAmount}
                    onChangeText={(text) => {
                      setFormAmount(text);
                      setFormErrors(prev => ({ ...prev, amount: undefined }));
                    }}
                    placeholder="0.00"
                    placeholderTextColor="#74C69D"
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
                {formErrors.amount && (
                  <Text style={styles.errorText}>{formErrors.amount}</Text>
                )}
              </View>

              {/* Category Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Category</Text>
                <View style={styles.categoriesGrid}>
                  {getAvailableCategories().map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        selectedCategory?.id === category.id && styles.categoryButtonSelected,
                      ]}
                      onPress={() => selectCategory(category)}
                    >
                      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                        <SafeIcon name={category.icon} size={20} color="#FFFFFF" />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {getAvailableCategories().length === 0 && (
                  <Text style={styles.noCategoriesText}>
                    All categories already have budgets. You can edit existing budgets instead.
                  </Text>
                )}
                {formErrors.category && (
                  <Text style={styles.errorText}>{formErrors.category}</Text>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Enhanced Smart Categorization Modal */}
      <EnhancedSmartCategorizationModal
        visible={showSmartCategorization}
        onClose={() => setShowSmartCategorization(false)}
        onComplete={() => {
          markAsCompleted();
          loadData(); // Refresh budget data after categorization
        }}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smartButton: {
    backgroundColor: 'rgba(243, 156, 18, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  smartButtonText: {
    color: '#F39C12',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewModeButton: {
    backgroundColor: '#415A77',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertsSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  predictiveSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  recommendationsSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  addButton: {
    backgroundColor: '#00B894',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartBanner: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
  },
  smartBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  smartBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  smartBannerText: {
    flex: 1,
  },
  smartBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F39C12',
    marginBottom: 4,
  },
  smartBannerSubtitle: {
    fontSize: 14,
    color: '#74C69D',
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  insightsSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  summarySection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
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
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  overallProgress: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00B894',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1B263B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetList: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  budgetItem: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  budgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  budgetDetails: {
    flex: 1,
  },
  budgetCategoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  budgetAmount: {
    fontSize: 14,
    color: '#74C69D',
  },
  budgetActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  budgetProgress: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentAmount: {
    fontSize: 14,
    color: '#74C69D',
  },
  remainingAmount: {
    fontSize: 14,
    fontWeight: '600',
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
  modalCancelText: {
    fontSize: 16,
    color: '#E74C3C',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#00B894',
    fontWeight: '600',
  },
  modalSaveTextDisabled: {
    opacity: 0.6,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#74C69D',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 120,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1B263B',
    borderWidth: 1,
    borderColor: '#415A77',
    minWidth: '30%',
  },
  categoryButtonSelected: {
    borderColor: '#00B894',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#74C69D',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    marginTop: 8,
  },
});
