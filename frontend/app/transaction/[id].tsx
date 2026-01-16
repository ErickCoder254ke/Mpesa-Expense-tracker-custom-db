import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeIcon from '@/components/SafeIcon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BACKEND_URL } from '@/config/api';
import { getAuthHeaders } from '@/utils/apiClient';
import { safeGoBack } from '@/utils/navigationHelpers';

interface Transaction {
  id: string;
  amount: number;
  type: 'expense' | 'income';
  category_id: string;
  description: string;
  date: string;
  created_at: string;
  mpesa_details?: {
    recipient?: string;
    reference?: string;
    transaction_id?: string;
  };
  source?: 'manual' | 'sms';
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function TransactionDetails() {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form state
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [formErrors, setFormErrors] = useState<{ amount?: string; description?: string; category?: string }>({});

  const router = useRouter();
  const params = useLocalSearchParams();
  const transactionId = params.id as string;

  useEffect(() => {
    if (transactionId) {
      loadTransaction();
      loadCategories();
    }
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/transactions/${transactionId}`, { headers });

      if (response.ok) {
        const transactionData = await response.json();
        console.log('Transaction loaded:', transactionData);
        setTransaction(transactionData);

        // Initialize form with transaction data
        setFormAmount(transactionData.amount.toString());
        setFormDescription(transactionData.description);
        setFormDate(new Date(transactionData.date));
      } else if (response.status === 404) {
        Alert.alert('Error', 'Transaction not found', [
          { text: 'OK', onPress: () => safeGoBack(router, '/(tabs)/transactions') }
        ]);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        Alert.alert('Error', `Failed to load transaction: ${errorData.detail}`);
      }
    } catch (error) {
      console.error('Load transaction error:', error);
      Alert.alert('Error', 'Network error loading transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/categories/`, { headers });
      if (response.ok) {
        const categoriesData = await response.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || {
      name: 'Unknown',
      icon: 'help-circle',
      color: '#636E72'
    };
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleEdit = () => {
    if (!transaction) return;
    
    const category = getCategoryInfo(transaction.category_id);
    setSelectedCategory(category);
    setShowEditModal(true);
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

  const handleUpdate = async () => {
    if (!validateForm()) {
      return;
    }

    if (!transaction || !selectedCategory) return;

    setIsUpdating(true);
    try {
      const updateData = {
        amount: parseFloat(formAmount),
        description: formDescription.trim(),
        category_id: selectedCategory.id,
        date: formDate.toISOString(),
      };

      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedTransaction = await response.json();
        setTransaction(updatedTransaction);
        setShowEditModal(false);
        Alert.alert('Success', 'Transaction updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        Alert.alert('Error', errorData.detail || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Update transaction error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BACKEND_URL}/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: headers,
      });

      if (response.ok) {
        Alert.alert('Success', 'Transaction deleted successfully!', [
          { text: 'OK', onPress: () => safeGoBack(router, '/(tabs)/transactions') }
        ]);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        Alert.alert('Error', errorData.detail || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Delete transaction error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsDeleting(false);
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#E74C3C" />
          <Text style={styles.errorTitle}>Transaction Not Found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack(router, '/(tabs)/transactions')}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const category = getCategoryInfo(transaction.category_id);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => safeGoBack(router, '/(tabs)/transactions')}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
          <Ionicons name="create-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Section */}
        <View style={styles.amountSection}>
          <View style={[styles.amountContainer, { backgroundColor: category.color }]}>
            <SafeIcon name={category.icon} size={32} color="#FFFFFF" />
          </View>
          <Text style={[
            styles.amount,
            { color: transaction.type === 'income' ? '#00B894' : '#E74C3C' }
          ]}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
          {(transaction.mpesa_details?.transaction_fee || transaction.mpesa_details?.access_fee) && (
            <Text style={styles.feeText}>
              Fee: {formatCurrency(
                (transaction.mpesa_details.transaction_fee || 0) +
                (transaction.mpesa_details.access_fee || 0)
              )}
            </Text>
          )}
          <Text style={styles.category}>{category.name}</Text>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{transaction.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeItem}>
              <Ionicons name="calendar" size={20} color="#00B894" />
              <Text style={styles.dateTimeText}>{formatDate(transaction.date)}</Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Ionicons name="time" size={20} color="#00B894" />
              <Text style={styles.dateTimeText}>{formatTime(transaction.date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Type</Text>
          <View style={styles.typeContainer}>
            <View style={[
              styles.typeIcon,
              { backgroundColor: transaction.type === 'income' ? '#00B894' : '#E74C3C' }
            ]}>
              <Ionicons 
                name={transaction.type === 'income' ? 'trending-up' : 'trending-down'} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.typeText}>
              {transaction.type === 'income' ? 'Income' : 'Expense'}
            </Text>
          </View>
        </View>

        {/* M-Pesa Details (if SMS transaction) */}
        {transaction.source === 'sms' && transaction.mpesa_details && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>M-Pesa Details</Text>
            <View style={styles.mpesaContainer}>
              {transaction.mpesa_details.transaction_id && (
                <View style={styles.mpesaItem}>
                  <Text style={styles.mpesaLabel}>Transaction ID</Text>
                  <Text style={styles.mpesaValue}>{transaction.mpesa_details.transaction_id}</Text>
                </View>
              )}
              {transaction.mpesa_details.recipient && (
                <View style={styles.mpesaItem}>
                  <Text style={styles.mpesaLabel}>Recipient</Text>
                  <Text style={styles.mpesaValue}>{transaction.mpesa_details.recipient}</Text>
                </View>
              )}
              {transaction.mpesa_details.reference && (
                <View style={styles.mpesaItem}>
                  <Text style={styles.mpesaLabel}>Reference</Text>
                  <Text style={styles.mpesaValue}>{transaction.mpesa_details.reference}</Text>
                </View>
              )}
              {transaction.mpesa_details.transaction_fee && (
                <View style={styles.mpesaItem}>
                  <Text style={styles.mpesaLabel}>Transaction Cost</Text>
                  <Text style={styles.mpesaValue}>{formatCurrency(transaction.mpesa_details.transaction_fee)}</Text>
                </View>
              )}
              {transaction.mpesa_details.access_fee && (
                <View style={styles.mpesaItem}>
                  <Text style={styles.mpesaLabel}>Access Fee</Text>
                  <Text style={styles.mpesaValue}>{formatCurrency(transaction.mpesa_details.access_fee)}</Text>
                </View>
              )}
              {transaction.mpesa_details.fuliza_outstanding && (
                <View style={styles.mpesaItem}>
                  <Text style={styles.mpesaLabel}>Fuliza Outstanding</Text>
                  <Text style={styles.mpesaValue}>{formatCurrency(transaction.mpesa_details.fuliza_outstanding)}</Text>
                </View>
              )}
              {transaction.mpesa_details.fuliza_limit && (
                <View style={styles.mpesaItem}>
                  <Text style={styles.mpesaLabel}>Fuliza Limit</Text>
                  <Text style={styles.mpesaValue}>{formatCurrency(transaction.mpesa_details.fuliza_limit)}</Text>
                </View>
              )}
              {transaction.mpesa_details.due_date && (
                <View style={styles.mpesaItem}>
                  <Text style={styles.mpesaLabel}>Due Date</Text>
                  <Text style={styles.mpesaValue}>{transaction.mpesa_details.due_date}</Text>
                </View>
              )}
              <View style={styles.mpesaItem}>
                <Text style={styles.mpesaLabel}>Source</Text>
                <Text style={styles.mpesaValue}>SMS Import</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Transaction</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]} 
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Deleting...' : 'Delete Transaction'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
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
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Transaction</Text>
              <TouchableOpacity
                onPress={handleUpdate}
                disabled={isUpdating}
              >
                <Text style={[styles.modalSaveText, isUpdating && styles.modalSaveTextDisabled]}>
                  {isUpdating ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Amount Input */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Amount</Text>
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
                  />
                </View>
                {formErrors.amount && (
                  <Text style={styles.errorText}>{formErrors.amount}</Text>
                )}
              </View>

              {/* Description Input */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Description</Text>
                <TextInput
                  style={styles.textInput}
                  value={formDescription}
                  onChangeText={(text) => {
                    setFormDescription(text);
                    setFormErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="What was this transaction for?"
                  placeholderTextColor="#74C69D"
                  multiline
                />
                {formErrors.description && (
                  <Text style={styles.errorText}>{formErrors.description}</Text>
                )}
              </View>

              {/* Date Picker */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color="#00B894" />
                  <Text style={styles.dateText}>
                    {formatDate(formDate.toISOString())}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#74C69D" />
                </TouchableOpacity>
              </View>

              {/* Category Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Category</Text>
                <View style={styles.categoriesGrid}>
                  {categories
                    .filter(cat => {
                      // Filter categories based on transaction type
                      if (transaction?.type === 'income') {
                        return cat.name === 'Income';
                      } else {
                        return cat.name !== 'Income';
                      }
                    })
                    .map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryButton,
                          selectedCategory?.id === cat.id && styles.categoryButtonSelected,
                        ]}
                        onPress={() => selectCategory(cat)}
                      >
                        <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                          <SafeIcon name={cat.icon} size={20} color="#FFFFFF" />
                        </View>
                        <Text style={styles.categoryName}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            </ScrollView>

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
  },
  loadingText: {
    color: '#74C69D',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  headerButton: {
    padding: 8,
    marginHorizontal: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
    marginBottom: 24,
  },
  amountContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feeText: {
    fontSize: 14,
    color: '#E74C3C',
    marginBottom: 4,
  },
  category: {
    fontSize: 18,
    color: '#74C69D',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#74C69D',
    lineHeight: 22,
  },
  dateTimeContainer: {
    gap: 12,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#74C69D',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 16,
    color: '#74C69D',
    fontWeight: '600',
  },
  mpesaContainer: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  mpesaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mpesaLabel: {
    fontSize: 14,
    color: '#74C69D',
  },
  mpesaValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionsSection: {
    gap: 16,
    paddingBottom: 32,
  },
  editButton: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
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
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    marginTop: 8,
  },
});
