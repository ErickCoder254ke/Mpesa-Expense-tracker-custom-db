import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeIcon from '@/components/SafeIcon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BACKEND_URL } from '@/config/api';
import { getAuthHeaders } from '@/utils/apiClient';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function AddTransaction() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Form state
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [formErrors, setFormErrors] = useState<{ amount?: string; description?: string; category?: string }>({});

  const router = useRouter();
  const params = useLocalSearchParams();
  const transactionType = (params.type as string) || 'expense';

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      console.log('Loading categories from:', `${BACKEND_URL}/api/categories/`);
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/categories/`, { headers });

      if (response.ok) {
        const categoriesData = await response.json();
        console.log('Categories loaded:', categoriesData);
        setCategories(categoriesData);

        // Auto-select Income category if type is income
        if (transactionType === 'income') {
          const incomeCategory = categoriesData.find((cat: Category) => cat.name === 'Income');
          if (incomeCategory) {
            setSelectedCategory(incomeCategory);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Failed to load categories:', response.status, errorData);
        Alert.alert('Error', `Failed to load categories: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Load categories error:', error);
      Alert.alert('Error', 'Network error loading categories');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const validateForm = () => {
    const errors: { amount?: string; description?: string; category?: string } = {};

    if (!formAmount || formAmount.trim() === '') {
      errors.amount = 'Amount is required';
    } else if (!/^\d+\.?\d{0,2}$/.test(formAmount)) {
      errors.amount = 'Enter a valid amount';
    } else if (parseFloat(formAmount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (!formDescription || formDescription.trim() === '') {
      errors.description = 'Description is required';
    } else if (formDescription.trim().length < 2) {
      errors.description = 'Description must be at least 2 characters';
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

    setIsLoading(true);
    try {
      const transactionData = {
        amount: parseFloat(formAmount),
        type: transactionType,
        category_id: selectedCategory.id,
        description: formDescription.trim(),
        date: formDate.toISOString(),
      };

      console.log('Submitting transaction:', transactionData);
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/transactions/`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Transaction created:', result);
        Alert.alert(
          'Success',
          `${transactionType === 'income' ? 'Income' : 'Expense'} added successfully!`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Transaction submission failed:', response.status, errorData);
        Alert.alert('Error', errorData.detail || 'Failed to add transaction');
      }
    } catch (error) {
      console.error('Add transaction error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormErrors(prev => ({ ...prev, category: undefined }));
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Add {transactionType === 'income' ? 'Income' : 'Expense'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Amount Input */}
          <View style={styles.amountContainer}>
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

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={styles.textInput}
              value={formDescription}
              onChangeText={(text) => {
                setFormDescription(text);
                setFormErrors(prev => ({ ...prev, description: undefined }));
              }}
              placeholder={`What did you ${transactionType === 'income' ? 'receive money for' : 'spend on'}?`}
              placeholderTextColor="#74C69D"
              multiline
            />
            {formErrors.description && (
              <Text style={styles.errorText}>{formErrors.description}</Text>
            )}
          </View>

          {/* Date Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#00B894" />
              <Text style={styles.dateText}>{formatDate(formDate)}</Text>
              <Ionicons name="chevron-forward" size={20} color="#74C69D" />
            </TouchableOpacity>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            {isLoadingCategories ? (
              <Text style={styles.loadingText}>Loading categories...</Text>
            ) : (
              <View style={styles.categoriesGrid}>
                {categories
                  .filter(category => {
                    // For income, only show Income category
                    // For expenses, show all except Income
                    if (transactionType === 'income') {
                      return category.name === 'Income';
                    } else {
                      return category.name !== 'Income';
                    }
                  })
                  .map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        selectedCategory?.id === category.id && styles.categoryButtonSelected,
                      ]}
                      onPress={() => selectCategory(category)}
                    >
                      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                        <SafeIcon name={category.icon} size={24} color="#FFFFFF" />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
            {formErrors.category && (
              <Text style={styles.errorText}>{formErrors.category}</Text>
            )}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Adding...' : `Add ${transactionType === 'income' ? 'Income' : 'Expense'}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={formDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
    marginBottom: 32,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#74C69D',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#415A77',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#415A77',
  },
  dateText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  categoryButton: {
    alignItems: 'center',
    padding: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#1B263B',
  },
  submitButton: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    marginTop: 8,
  },
  loadingText: {
    color: '#74C69D',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
