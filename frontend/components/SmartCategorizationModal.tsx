import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SafeIcon from './SafeIcon';

interface FrequentTransaction {
  pattern: string;
  description_samples: string[];
  count: number;
  total_amount: number;
  avg_amount: number;
  category_id?: string;
  category_name?: string;
  transaction_ids: string[];
  confidence_score: number;
  suggested_category?: string;
  needs_attention: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SmartCategorizationModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function SmartCategorizationModal({ 
  visible, 
  onClose, 
  onComplete 
}: SmartCategorizationModalProps) {
  const [frequentTransactions, setFrequentTransactions] = useState<FrequentTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [frequentResponse, categoriesResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/transactions/frequency-analysis?uncategorized_only=true&min_frequency=3`),
        fetch(`${BACKEND_URL}/api/categories/`)
      ]);

      if (frequentResponse.ok) {
        const frequentData = await frequentResponse.json();
        const needsAttention = frequentData.frequent_transactions.filter(
          (ft: FrequentTransaction) => ft.needs_attention
        );
        setFrequentTransactions(needsAttention);
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        // Filter out Income category for expense categorization
        const expenseCategories = categoriesData.filter((cat: Category) => cat.name !== 'Income');
        setCategories(expenseCategories);
      }
    } catch (error) {
      console.error('Error loading smart categorization data:', error);
      Alert.alert('Error', 'Failed to load categorization suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorize = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    const currentTransaction = frequentTransactions[currentIndex];
    setIsProcessing(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/frequency-analysis/categorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: selectedCategory.id,
          transaction_ids: currentTransaction.transaction_ids,
          pattern: currentTransaction.pattern,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert(
          'Success', 
          `Categorized ${result.updated_count} transactions as "${selectedCategory.name}"`
        );
        moveToNext();
      } else {
        Alert.alert('Error', 'Failed to categorize transactions');
      }
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      Alert.alert('Error', 'Network error while categorizing');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async () => {
    const currentTransaction = frequentTransactions[currentIndex];
    setIsProcessing(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/frequency-analysis/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern: currentTransaction.pattern,
          transaction_ids: currentTransaction.transaction_ids,
          action: 'dismiss',
        }),
      });

      if (response.ok) {
        moveToNext();
      } else {
        Alert.alert('Error', 'Failed to dismiss pattern');
      }
    } catch (error) {
      console.error('Error dismissing pattern:', error);
      Alert.alert('Error', 'Network error while dismissing');
    } finally {
      setIsProcessing(false);
    }
  };

  const moveToNext = () => {
    setSelectedCategory(null);
    if (currentIndex + 1 >= frequentTransactions.length) {
      // Completed all suggestions
      Alert.alert(
        'All Done!', 
        'You\'ve reviewed all categorization suggestions. Your budget tracking will be more accurate now!',
        [{ text: 'OK', onPress: () => { onComplete(); onClose(); } }]
      );
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return '#00B894';
    if (score >= 0.6) return '#F39C12';
    return '#E74C3C';
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  if (!visible) return null;

  if (isLoading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00B894" />
            <Text style={styles.loadingText}>Analyzing your transactions...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (frequentTransactions.length === 0) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Smart Categorization</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#00B894" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              No frequent transactions need categorization right now. Your budget tracking is up to date!
            </Text>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const currentTransaction = frequentTransactions[currentIndex];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Smart Categorization</Text>
          <Text style={styles.progressText}>
            {currentIndex + 1} of {frequentTransactions.length}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Transaction Pattern Info */}
          <View style={styles.patternCard}>
            <View style={styles.patternHeader}>
              <Ionicons name="repeat" size={24} color="#00B894" />
              <Text style={styles.patternTitle}>Frequent Transaction Detected</Text>
            </View>
            
            <View style={styles.patternStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentTransaction.count}</Text>
                <Text style={styles.statLabel}>Occurrences</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(currentTransaction.total_amount)}</Text>
                <Text style={styles.statLabel}>Total Amount</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(currentTransaction.avg_amount)}</Text>
                <Text style={styles.statLabel}>Average</Text>
              </View>
            </View>

            <View style={styles.confidenceContainer}>
              <View style={[
                styles.confidenceBadge,
                { backgroundColor: getConfidenceColor(currentTransaction.confidence_score) }
              ]}>
                <Text style={styles.confidenceText}>
                  {getConfidenceText(currentTransaction.confidence_score)}
                </Text>
              </View>
            </View>

            <Text style={styles.descriptionTitle}>Sample Descriptions:</Text>
            {currentTransaction.description_samples.slice(0, 3).map((description, index) => (
              <View key={index} style={styles.descriptionItem}>
                <Ionicons name="receipt-outline" size={16} color="#74C69D" />
                <Text style={styles.descriptionText}>{description}</Text>
              </View>
            ))}

            {currentTransaction.suggested_category && (
              <View style={styles.suggestionContainer}>
                <Ionicons name="bulb-outline" size={20} color="#F39C12" />
                <Text style={styles.suggestionText}>
                  Suggested: {currentTransaction.suggested_category}
                </Text>
              </View>
            )}
          </View>

          {/* Category Selection */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Choose a Category</Text>
            <Text style={styles.sectionSubtitle}>
              This will categorize all {currentTransaction.count} similar transactions
            </Text>
            
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory?.id === category.id && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <SafeIcon name={category.icon} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            disabled={isProcessing}
          >
            <Text style={styles.dismissButtonText}>Not Now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.categorizeButton, !selectedCategory && styles.categorizeButtonDisabled]}
            onPress={handleCategorize}
            disabled={!selectedCategory || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.categorizeButtonText}>Categorize</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressText: {
    fontSize: 14,
    color: '#74C69D',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  patternCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  patternTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patternStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00B894',
  },
  statLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 4,
  },
  confidenceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  descriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: '#74C69D',
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  suggestionText: {
    color: '#F39C12',
    fontSize: 14,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#74C69D',
    marginBottom: 20,
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
    backgroundColor: '#0D1B2A',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#1B263B',
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#415A77',
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#74C69D',
    fontSize: 16,
    fontWeight: '600',
  },
  categorizeButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#00B894',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  categorizeButtonDisabled: {
    opacity: 0.6,
  },
  categorizeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#74C69D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
