import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeIcon from '@/components/SafeIcon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { smsParserService } from '../services/smsParser';
import { SMSPermissionModal } from '../components/SMSPermissionModal';
import { useSMSPermissions } from '../hooks/useSMSPermissions';
import { BACKEND_URL } from '@/config/api';
import { getAuthHeaders } from '@/utils/apiClient';

interface ParsedMessage {
  original_message: string;
  parsed_data: any;
  confidence: number;
  suggested_category: string;
  requires_review: boolean;
}

interface ImportResult {
  successful_imports: number;
  duplicates_found: number;
  parsing_errors: number;
  total_processed: number;
  import_session_id: string;
}

export default function SMSImportScreen() {
  const [manualSMSText, setManualSMSText] = useState('');
  const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [detectedMessageCount, setDetectedMessageCount] = useState(0);

  const router = useRouter();
  const { permissionStatus, requestPermissions } = useSMSPermissions();

  useEffect(() => {
    loadCategories();
  }, []);

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

  const handleRequestPermissions = async () => {
    if (Platform.OS === 'android') {
      await requestPermissions({
        requestReadSMS: true,
        requestReceiveSMS: true,
        showEducationalDialog: false, // Modal handles this
      });

      // Check if permissions were granted
      if (permissionStatus.canReadSMS || permissionStatus.canReceiveSMS) {
        setShowPermissionModal(false);
        Alert.alert(
          'Permissions Granted',
          'SMS permissions granted! You can now use automatic SMS import. Note: Full SMS reading functionality requires a development build or production app.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission Required',
          'SMS access is needed for automatic import. You can:\n\n• Try again\n• Open Settings to grant manually\n• Continue with manual entry',
          [
            { text: 'Try Again', onPress: handleRequestPermissions },
            { text: 'Open Settings', onPress: () => {
              setShowPermissionModal(false);
              setTimeout(() => {
                require('../hooks/useSMSPermissions').smsPermissionsService.openAppSettings();
              }, 500);
            }},
            { text: 'Manual Entry', style: 'cancel', onPress: () => setShowPermissionModal(false) }
          ]
        );
      }
    } else {
      Alert.alert(
        'iOS Limitation',
        'iOS does not allow direct SMS reading. Please use manual SMS sharing instead.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleManualSMSParse = async () => {
    if (!manualSMSText.trim()) {
      Alert.alert('Error', 'Please enter an SMS message to parse');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Detecting messages...');

    try {
      // Split the text into multiple messages
      const messages = smsParserService.splitMultipleMessages(manualSMSText);

      if (messages.length === 0) {
        Alert.alert(
          'No M-Pesa Messages Found',
          'No valid M-Pesa SMS messages were detected in the pasted text.\n\nPlease ensure you have copied actual M-Pesa transaction messages that contain keywords like "confirmed", "sent to", "received from", etc.'
        );
        return;
      }

      setProcessingStatus(`Found ${messages.length} message${messages.length > 1 ? 's' : ''}. Parsing transaction details...`);

      // Parse all messages
      const parseResult = await smsParserService.parseMultipleSMS(messages);

      if (parseResult.success && parseResult.results) {
        const newParsedMessages: ParsedMessage[] = [];
        const failedMessages: string[] = [];

        parseResult.results.forEach((result, index) => {
          if (result.success && result.parsed_data) {
            const parsedMessage: ParsedMessage = {
              original_message: result.message,
              parsed_data: result.parsed_data,
              confidence: result.parsed_data.parsing_confidence || 0,
              suggested_category: result.parsed_data.suggested_category || 'Other',
              requires_review: result.parsed_data.requires_review || false,
            };
            newParsedMessages.push(parsedMessage);
          } else {
            failedMessages.push(`Message ${index + 1}: ${result.error || 'Unknown parsing error'}`);
          }
        });

        if (newParsedMessages.length > 0) {
          // Add to existing parsed messages instead of replacing
          setParsedMessages(prev => [...prev, ...newParsedMessages]);
          setManualSMSText('');

          const successCount = newParsedMessages.length;
          const totalCount = messages.length;
          const failedCount = totalCount - successCount;

          let alertMessage = `Successfully parsed ${successCount} transaction${successCount > 1 ? 's' : ''} from ${totalCount} message${totalCount > 1 ? 's' : ''}!`;

          if (failedCount > 0) {
            alertMessage += `\n\n${failedCount} message${failedCount > 1 ? 's' : ''} could not be parsed:`;
            if (failedMessages.length > 0) {
              alertMessage += '\n\n' + failedMessages.slice(0, 3).join('\n');
              if (failedMessages.length > 3) {
                alertMessage += `\n... and ${failedMessages.length - 3} more`;
              }
            }
          }

          Alert.alert(
            failedCount > 0 ? 'Partial Success' : 'Success',
            alertMessage
          );
        } else {
          Alert.alert(
            'Parsing Failed',
            'None of the detected messages could be parsed successfully.\n\nPlease check that the messages are valid M-Pesa transaction confirmations.'
          );
        }
      } else {
        Alert.alert('Parsing Failed', parseResult.error || 'Failed to parse SMS messages');
      }
    } catch (error) {
      console.error('Parse SMS error:', error);
      Alert.alert('Error', 'Network error occurred while parsing SMS messages. Please check your connection and try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleImportParsedMessages = async () => {
    if (parsedMessages.length === 0) {
      Alert.alert('Error', 'No parsed messages to import');
      return;
    }

    setIsProcessing(true);
    try {
      const messages = parsedMessages.map(pm => pm.original_message);
      const result = await smsParserService.importSMSMessages(messages, {
        auto_categorize: true,
        require_review: false,
        transaction_date: transactionDate.toISOString(),
      });

      if (result.success && result.data) {
        setImportResults(result.data);
        setShowResultModal(true);
        setParsedMessages([]); // Clear parsed messages after import
      } else {
        Alert.alert('Import Failed', result.error || 'Failed to import messages');
      }
    } catch (error) {
      console.error('Import messages error:', error);
      Alert.alert('Error', 'Failed to import messages');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTransactionDate(selectedDate);
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

  const handleSMSTextChange = (text: string) => {
    setManualSMSText(text);

    // Update detected message count in real-time
    if (text.trim()) {
      const messages = smsParserService.splitMultipleMessages(text);
      setDetectedMessageCount(messages.length);
    } else {
      setDetectedMessageCount(0);
    }
  };

  const handleClearParsedMessages = () => {
    setParsedMessages([]);
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#00B894';
    if (confidence >= 0.6) return '#F39C12';
    return '#E74C3C';
  };

  const renderParsedMessage = (message: ParsedMessage, index: number) => {
    const category = getCategoryInfo(message.suggested_category);
    const isFulizaTransaction = message.parsed_data.mpesa_details?.message_type?.includes('fuliza') ||
                                message.parsed_data.description?.toLowerCase().includes('fuliza');
    const isCompoundTransaction = message.parsed_data.mpesa_details?.message_type === 'compound_received_fuliza';

    return (
      <View key={index} style={[
        styles.parsedMessageItem,
        isFulizaTransaction && styles.fulizaMessageItem
      ]}>
        <View style={styles.messageHeader}>
          <View style={styles.messageInfo}>
            <View style={styles.messageHeaderRow}>
              <Text style={styles.messageTitle}>
                {message.parsed_data.type === 'income' ? 'Received' : 'Sent'} {formatCurrency(message.parsed_data.amount)}
              </Text>
              {isFulizaTransaction && (
                <View style={styles.fulizaBadge}>
                  <Ionicons name="wallet" size={12} color="#FFFFFF" />
                  <Text style={styles.fulizaBadgeText}>Fuliza</Text>
                </View>
              )}
              {isCompoundTransaction && (
                <View style={styles.compoundBadge}>
                  <Ionicons name="swap-horizontal" size={12} color="#FFFFFF" />
                  <Text style={styles.compoundBadgeText}>Multi</Text>
                </View>
              )}
            </View>
            <Text style={styles.messageDescription}>{message.parsed_data.description}</Text>
          </View>
          <View style={styles.confidenceContainer}>
            <Text style={[
              styles.confidenceText,
              { color: getConfidenceColor(message.confidence) }
            ]}>
              {Math.round(message.confidence * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.messageDetails}>
          <View style={styles.messageDetailItem}>
            <Ionicons name="calendar" size={16} color="#74C69D" />
            <Text style={styles.messageDetailText}>
              {message.parsed_data.transaction_date
                ? new Date(message.parsed_data.transaction_date).toLocaleDateString()
                : 'No date extracted'
              }
            </Text>
            {message.parsed_data.transaction_date && (
              <View style={styles.extractedDateIndicator}>
                <Text style={styles.extractedDateText}>SMS</Text>
              </View>
            )}
          </View>

          <View style={styles.messageDetailItem}>
            <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
              <SafeIcon name={category.icon} size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.messageDetailText}>{category.name}</Text>
          </View>

          {/* Transaction ID */}
          {message.parsed_data.mpesa_details?.transaction_id && (
            <View style={styles.messageDetailItem}>
              <Ionicons name="receipt-outline" size={16} color="#74C69D" />
              <Text style={styles.messageDetailText}>
                ID: {message.parsed_data.mpesa_details.transaction_id}
              </Text>
            </View>
          )}

          {/* Transaction Fees */}
          {message.parsed_data.sms_metadata?.total_fees && message.parsed_data.sms_metadata.total_fees > 0 && (
            <View style={styles.messageDetailItem}>
              <Ionicons name="card-outline" size={16} color="#F39C12" />
              <Text style={styles.messageDetailText}>
                Fees: {formatCurrency(message.parsed_data.sms_metadata.total_fees)}
              </Text>
            </View>
          )}

          {message.requires_review && (
            <View style={styles.reviewWarning}>
              <Ionicons name="warning" size={16} color="#F39C12" />
              <Text style={styles.reviewWarningText}>Requires Review</Text>
            </View>
          )}
        </View>

        {/* Enhanced Fuliza Details */}
        {isFulizaTransaction && message.parsed_data.mpesa_details && (
          <View style={styles.fulizaDetails}>
            <Text style={styles.fulizaDetailsTitle}>Fuliza Transaction Details</Text>

            {message.parsed_data.mpesa_details.access_fee && (
              <View style={styles.fulizaDetailRow}>
                <Ionicons name="card" size={14} color="#F39C12" />
                <Text style={styles.fulizaDetailLabel}>Access Fee:</Text>
                <Text style={styles.fulizaDetailValue}>
                  {formatCurrency(message.parsed_data.mpesa_details.access_fee)}
                </Text>
              </View>
            )}

            {message.parsed_data.mpesa_details.fuliza_outstanding && (
              <View style={styles.fulizaDetailRow}>
                <Ionicons name="alert-circle" size={14} color="#E74C3C" />
                <Text style={styles.fulizaDetailLabel}>Outstanding:</Text>
                <Text style={styles.fulizaDetailValue}>
                  {formatCurrency(message.parsed_data.mpesa_details.fuliza_outstanding)}
                </Text>
              </View>
            )}

            {message.parsed_data.mpesa_details.fuliza_limit && (
              <View style={styles.fulizaDetailRow}>
                <Ionicons name="checkmark-circle" size={14} color="#00B894" />
                <Text style={styles.fulizaDetailLabel}>Available Limit:</Text>
                <Text style={styles.fulizaDetailValue}>
                  {formatCurrency(message.parsed_data.mpesa_details.fuliza_limit)}
                </Text>
              </View>
            )}

            {message.parsed_data.mpesa_details.due_date && (
              <View style={styles.fulizaDetailRow}>
                <Ionicons name="time" size={14} color="#F39C12" />
                <Text style={styles.fulizaDetailLabel}>Due Date:</Text>
                <Text style={styles.fulizaDetailValue}>
                  {message.parsed_data.mpesa_details.due_date}
                </Text>
              </View>
            )}

            {isCompoundTransaction && (
              <View style={styles.compoundNotice}>
                <Ionicons name="information-circle" size={16} color="#6C5CE7" />
                <Text style={styles.compoundNoticeText}>
                  This transaction includes automatic Fuliza repayment from received funds
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.originalMessage}>
          <Text style={styles.originalMessageLabel}>Original SMS:</Text>
          <Text style={styles.originalMessageText} numberOfLines={3}>
            {message.original_message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SMS Import</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Import Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import Options</Text>
          
          {/* Automatic Import */}
          <TouchableOpacity 
            style={styles.importOption}
            onPress={() => setShowPermissionModal(true)}
          >
            <View style={styles.importOptionLeft}>
              <View style={[styles.importOptionIcon, { backgroundColor: '#00B894' }]}>
                <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.importOptionDetails}>
                <Text style={styles.importOptionTitle}>Read Device SMS</Text>
                <Text style={styles.importOptionDescription}>
                  {Platform.OS === 'android' 
                    ? 'Automatically scan device for M-Pesa messages'
                    : 'Not available on iOS - use manual import'
                  }
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#74C69D" />
          </TouchableOpacity>

          {/* Manual Import */}
          <View style={styles.importOption}>
            <View style={styles.importOptionLeft}>
              <View style={[styles.importOptionIcon, { backgroundColor: '#415A77' }]}>
                <Ionicons name="document-text" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.importOptionDetails}>
                <Text style={styles.importOptionTitle}>Manual SMS Entry</Text>
                <Text style={styles.importOptionDescription}>
                  Copy and paste M-Pesa SMS messages manually
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Manual SMS Entry */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter M-Pesa SMS Messages</Text>
          <Text style={styles.sectionSubtitle}>
            You can paste single or multiple M-Pesa messages here. The app will automatically detect and parse each message.
          </Text>
          <TextInput
            style={styles.smsTextInput}
            value={manualSMSText}
            onChangeText={handleSMSTextChange}
            placeholder="Paste your M-Pesa SMS message(s) here...\n\nFor multiple messages, separate them with empty lines or paste them as they appear in your messaging app."
            placeholderTextColor="#74C69D"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          {/* Message Count Indicator */}
          {manualSMSText.trim() && (
            <View style={styles.messageCountContainer}>
              <Ionicons
                name={detectedMessageCount > 0 ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={detectedMessageCount > 0 ? "#00B894" : "#F39C12"}
              />
              <Text style={[
                styles.messageCountText,
                { color: detectedMessageCount > 0 ? "#00B894" : "#F39C12" }
              ]}>
                {detectedMessageCount > 0
                  ? `${detectedMessageCount} M-Pesa message${detectedMessageCount > 1 ? 's' : ''} detected`
                  : 'No M-Pesa messages detected'
                }
              </Text>
            </View>
          )}

          {/* Transaction Date */}
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Transaction Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#00B894" />
              <Text style={styles.dateText}>{formatDate(transactionDate)}</Text>
              <Ionicons name="chevron-forward" size={20} color="#74C69D" />
            </TouchableOpacity>
            <Text style={styles.dateHint}>
              This date will be used as fallback if dates cannot be extracted from SMS messages. When M-Pesa messages contain date/time information, those will be used instead.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.parseButton, isProcessing && styles.parseButtonDisabled]}
            onPress={handleManualSMSParse}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="analytics" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.parseButtonText}>
              {isProcessing ? processingStatus || 'Parsing...' : 'Parse SMS'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Parsed Messages */}
        {parsedMessages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.parsedHeader}>
              <Text style={styles.sectionTitle}>Parsed Messages ({parsedMessages.length})</Text>
              <TouchableOpacity onPress={handleClearParsedMessages}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            {parsedMessages.map((message, index) => renderParsedMessage(message, index))}
            
            <View style={styles.importActions}>
              <TouchableOpacity 
                style={[styles.importButton, isProcessing && styles.importButtonDisabled]}
                onPress={handleImportParsedMessages}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.importButtonText}>
                  {isProcessing ? 'Importing...' : 'Import as Transactions'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Import Multiple Messages</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Copy multiple M-Pesa SMS messages from your phone's message app. You can select and copy several messages at once.
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Paste them in the text field above. Each message should be on a separate line or separated by empty lines.
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Choose the transaction date as a fallback. The app will automatically extract dates from M-Pesa messages when available (like "on 3/10/25 at 10:55 PM").
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>4</Text>
              </View>
              <Text style={styles.instructionText}>
                Tap "Parse SMS" to identify and extract transaction details from all messages.
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>5</Text>
              </View>
              <Text style={styles.instructionText}>
                Review the parsed transactions and tap "Import as Transactions" to add them to your expense tracker.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* SMS Permission Modal */}
      <SMSPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onPermissionGranted={() => setShowPermissionModal(false)}
        onManualMode={() => setShowPermissionModal(false)}
      />

      {/* Import Results Modal */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Results</Text>
            <TouchableOpacity onPress={() => setShowResultModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {importResults && (
            <View style={styles.modalContent}>
              <View style={styles.resultItem}>
                <Ionicons name="checkmark-circle" size={24} color="#00B894" />
                <Text style={styles.resultLabel}>Successfully Imported</Text>
                <Text style={styles.resultValue}>{importResults.successful_imports}</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Ionicons name="copy" size={24} color="#F39C12" />
                <Text style={styles.resultLabel}>Duplicates Found</Text>
                <Text style={styles.resultValue}>{importResults.duplicates_found}</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Ionicons name="alert-circle" size={24} color="#E74C3C" />
                <Text style={styles.resultLabel}>Parsing Errors</Text>
                <Text style={styles.resultValue}>{importResults.parsing_errors}</Text>
              </View>
              
              <View style={styles.resultSummary}>
                <Text style={styles.resultSummaryText}>
                  Processed {importResults.total_processed} messages
                </Text>
                <TouchableOpacity 
                  style={styles.viewTransactionsButton}
                  onPress={() => {
                    setShowResultModal(false);
                    router.push('/(tabs)/transactions');
                  }}
                >
                  <Text style={styles.viewTransactionsButtonText}>View Transactions</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={transactionDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
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
  section: {
    marginBottom: 32,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#74C69D',
    marginBottom: 16,
    lineHeight: 20,
  },
  importOption: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  importOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  importOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  importOptionDetails: {
    flex: 1,
  },
  importOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  importOptionDescription: {
    fontSize: 14,
    color: '#74C69D',
    lineHeight: 18,
  },
  smsTextInput: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#415A77',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  parseButton: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  parseButtonDisabled: {
    opacity: 0.6,
  },
  parseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
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
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  dateHint: {
    fontSize: 12,
    color: '#74C69D',
    fontStyle: 'italic',
  },
  messageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  messageCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  parsedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
  },
  parsedMessageItem: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  messageInfo: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  messageDescription: {
    fontSize: 14,
    color: '#74C69D',
  },
  confidenceContainer: {
    backgroundColor: '#415A77',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  messageDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageDetailText: {
    fontSize: 12,
    color: '#74C69D',
  },
  categoryIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewWarningText: {
    fontSize: 12,
    color: '#F39C12',
    fontWeight: '600',
  },
  originalMessage: {
    backgroundColor: '#415A77',
    borderRadius: 8,
    padding: 12,
  },
  originalMessageLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 4,
  },
  originalMessageText: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  importActions: {
    marginTop: 16,
  },
  importButton: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#74C69D',
    lineHeight: 20,
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
  modalCloseText: {
    fontSize: 16,
    color: '#00B894',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1B263B',
    gap: 16,
  },
  resultLabel: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B894',
  },
  resultSummary: {
    marginTop: 32,
    alignItems: 'center',
  },
  resultSummaryText: {
    fontSize: 16,
    color: '#74C69D',
    marginBottom: 24,
  },
  viewTransactionsButton: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  viewTransactionsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  extractedDateIndicator: {
    backgroundColor: '#00B894',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  extractedDateText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  fulizaMessageItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
  },
  messageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fulizaBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fulizaBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  compoundBadge: {
    backgroundColor: '#00B894',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compoundBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  fulizaDetails: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6C5CE7',
  },
  fulizaDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6C5CE7',
    marginBottom: 8,
  },
  fulizaDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  fulizaDetailLabel: {
    fontSize: 12,
    color: '#74C69D',
    flex: 1,
  },
  fulizaDetailValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  compoundNotice: {
    backgroundColor: '#4A5568',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  compoundNoticeText: {
    fontSize: 12,
    color: '#CBD5E0',
    lineHeight: 16,
    flex: 1,
  },
});
