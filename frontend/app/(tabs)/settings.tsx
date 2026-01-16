import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import SafeIcon from '@/components/SafeIcon';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/config/api';
import smsParserService from '@/services/smsParser';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default?: boolean;
}

const AVAILABLE_ICONS = [
  'cart', 'restaurant', 'car', 'home', 'medkit', 'school',
  'shirt', 'game-controller', 'gift', 'airplane', 'fitness',
  'phone-portrait', 'subway', 'water', 'bulb', 'card',
  'cash', 'wallet', 'trending-up', 'pizza', 'beer'
];

const AVAILABLE_COLORS = [
  '#E74C3C', '#00B894', '#3498DB', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#27AE60',
  '#2980B9', '#8E44AD', '#F1C40F', '#E74C3C', '#95A5A6'
];

export default function Settings() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('cart');
  const [selectedColor, setSelectedColor] = useState('#E74C3C');

  // SMS Preferences
  const [smsPreferences, setSmsPreferences] = useState({
    autoCategorize: true,
    requireReview: false,
  });

  useEffect(() => {
    loadCategories();
    loadSMSPreferences();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/categories/`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        Alert.alert('Error', 'Failed to load categories');
      }
    } catch (error) {
      console.error('Load categories error:', error);
      Alert.alert('Error', 'Network error loading categories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSMSPreferences = async () => {
    try {
      const prefs = await smsParserService.getSMSPreferences();
      setSmsPreferences({
        autoCategorize: prefs.auto_categorize ?? true,
        requireReview: prefs.require_review ?? false,
      });
    } catch (error) {
      console.error('Error loading SMS preferences:', error);
      // Set default preferences on error
      setSmsPreferences({
        autoCategorize: true,
        requireReview: false,
      });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 User requested logout');
              await logout();
              console.log('✅ Logout successful, navigating to login...');
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('❌ Logout failed:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const saveSMSPreferences = async (prefs: typeof smsPreferences) => {
    try {
      await smsParserService.saveSMSPreferences({
        auto_categorize: prefs.autoCategorize,
        require_review: prefs.requireReview,
        enabled: true, // Add enabled flag
      });
      setSmsPreferences(prefs);
    } catch (error) {
      console.error('Error saving SMS preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setSelectedIcon('cart');
    setSelectedColor('#E74C3C');
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      const categoryData = {
        name: categoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        keywords: [],
      };

      const response = await fetch(`${BACKEND_URL}/api/categories/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Category created successfully');
        setModalVisible(false);
        loadCategories();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to create category');
      }
    } catch (error) {
      console.error('Create category error:', error);
      Alert.alert('Error', 'Network error creating category');
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${categoryName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/categories/${categoryId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Success', 'Category deleted successfully');
                loadCategories();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to delete category');
              }
            } catch (error) {
              console.error('Delete category error:', error);
              Alert.alert('Error', 'Network error deleting category');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileContainer}>
            <View style={styles.profileIcon}>
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={openCreateModal}
            >
              <Ionicons name="add-circle" size={24} color="#00B894" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>
            Manage your transaction categories
          </Text>
          
          <View style={styles.categoriesList}>
            {categories.map((category) => (
              <View key={category.id} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <SafeIcon name={category.icon} size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.is_default && (
                      <Text style={styles.defaultBadge}>Default</Text>
                    )}
                  </View>
                </View>
                {!category.is_default && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(category.id, category.name)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* SMS Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SMS Import Preferences</Text>
          <Text style={styles.sectionDescription}>
            Customize how SMS messages are imported
          </Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="sparkles" size={20} color="#00B894" />
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceName}>Auto-Categorize</Text>
                <Text style={styles.preferenceDescription}>
                  Automatically suggest categories for imported transactions
                </Text>
              </View>
            </View>
            <Switch
              value={smsPreferences.autoCategorize}
              onValueChange={(value) => saveSMSPreferences({ ...smsPreferences, autoCategorize: value })}
              trackColor={{ false: '#415A77', true: '#00B894' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="eye" size={20} color="#00B894" />
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceName}>Require Review</Text>
                <Text style={styles.preferenceDescription}>
                  Mark imported transactions for review before finalizing
                </Text>
              </View>
            </View>
            <Switch
              value={smsPreferences.requireReview}
              onValueChange={(value) => saveSMSPreferences({ ...smsPreferences, requireReview: value })}
              trackColor={{ false: '#415A77', true: '#00B894' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Backend</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
              {BACKEND_URL}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Category Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Category</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                style={styles.input}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="e.g., Entertainment, Utilities"
                placeholderTextColor="#74C69D"
              />

              <Text style={styles.inputLabel}>Select Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                {AVAILABLE_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      selectedIcon === icon && styles.iconOptionSelected
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Select Color</Text>
              <View style={styles.colorGrid}>
                {AVAILABLE_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View style={styles.previewCategory}>
                  <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
                    <Ionicons name={selectedIcon as any} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.previewName}>{categoryName || 'Category Name'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCategory}
              >
                <Text style={styles.saveButtonText}>Save Category</Text>
              </TouchableOpacity>
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
  },
  loadingText: {
    color: '#74C69D',
    fontSize: 16,
  },
  header: {
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
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#74C69D',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#74C69D',
    marginBottom: 16,
  },
  addButton: {
    padding: 4,
  },
  categoriesList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  defaultBadge: {
    fontSize: 12,
    color: '#00B894',
    marginTop: 2,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  preferenceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    color: '#74C69D',
    lineHeight: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  infoLabel: {
    fontSize: 14,
    color: '#74C69D',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0D1B2A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#74C69D',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#415A77',
  },
  iconScroll: {
    marginTop: 8,
    marginBottom: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1B263B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#415A77',
  },
  iconOptionSelected: {
    borderColor: '#00B894',
    backgroundColor: '#00B894',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFFFFF',
  },
  preview: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1B263B',
    borderRadius: 12,
  },
  previewLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 12,
  },
  previewCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#1B263B',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#415A77',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#00B894',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
