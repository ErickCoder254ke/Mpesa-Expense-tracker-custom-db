import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { smsParserService } from '../services/smsParser';

interface QuickSMSImportProps {
  onTransactionImported?: () => void;
}

interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  suggested_category: string;
  confidence: number;
  original_message: string;
  transaction_date?: string;
  mpesa_details?: {
    transaction_id?: string;
    recipient?: string;
    transaction_fee?: number;
    access_fee?: number;
    fuliza_outstanding?: number;
    fuliza_limit?: number;
    due_date?: string;
    message_type?: string;
  };
  sms_metadata?: {
    total_fees?: number;
    fee_breakdown?: Record<string, number>;
    requires_review?: boolean;
  };
}

export function QuickSMSImport({ onTransactionImported }: QuickSMSImportProps) {
  const [smsText, setSmsText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [detectedMessageCount, setDetectedMessageCount] = useState(0);

  const handleSMSTextChange = (text: string) => {
    setSmsText(text);
    if (text.trim()) {
      const messages = smsParserService.splitMultipleMessages(text);
      setDetectedMessageCount(messages.length);
    } else {
      setDetectedMessageCount(0);
    }
  };

  const handleQuickParse = async () => {
    if (!smsText.trim()) {
      Alert.alert('Error', 'Please paste an SMS message first');
      return;
    }

    setIsProcessing(true);
    try {
      const messages = smsParserService.splitMultipleMessages(smsText);
      
      if (messages.length === 0) {
        Alert.alert(
          'No M-Pesa Messages',
          'No valid M-Pesa SMS messages were detected. Please paste actual M-Pesa transaction messages.'
        );
        return;
      }

      const parseResult = await smsParserService.parseMultipleSMS(messages);
      
      if (parseResult.success && parseResult.results) {
        const transactions: ParsedTransaction[] = [];
        
        parseResult.results.forEach((result) => {
          if (result.success && result.parsed_data) {
            transactions.push({
              amount: result.parsed_data.amount,
              type: result.parsed_data.type,
              description: result.parsed_data.description,
              suggested_category: result.parsed_data.suggested_category,
              confidence: result.parsed_data.parsing_confidence,
              original_message: result.message,
              transaction_date: result.parsed_data.transaction_date,
              mpesa_details: result.parsed_data.mpesa_details,
              sms_metadata: {
                total_fees: (result.parsed_data.mpesa_details?.transaction_fee || 0) +
                           (result.parsed_data.mpesa_details?.access_fee || 0),
                fee_breakdown: {
                  ...(result.parsed_data.mpesa_details?.transaction_fee && {
                    transaction_fee: result.parsed_data.mpesa_details.transaction_fee
                  }),
                  ...(result.parsed_data.mpesa_details?.access_fee && {
                    access_fee: result.parsed_data.mpesa_details.access_fee
                  }),
                },
                requires_review: result.parsed_data.requires_review,
              },
            });
          }
        });

        if (transactions.length > 0) {
          setParsedTransactions(transactions);
          setShowModal(true);
        } else {
          Alert.alert('No Transactions', 'Could not parse any transactions from the SMS messages.');
        }
      } else {
        Alert.alert('Parse Error', parseResult.error || 'Failed to parse SMS messages');
      }
    } catch (error) {
      console.error('Parse error:', error);
      Alert.alert('Error', 'Network error occurred while parsing SMS messages');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportTransactions = async () => {
    setIsProcessing(true);
    try {
      const messages = parsedTransactions.map(t => t.original_message);
      const result = await smsParserService.importSMSMessages(messages, {
        auto_categorize: true,
        require_review: false,
      });

      if (result.success && result.data) {
        Alert.alert(
          'Import Successful',
          `${result.data.successful_imports} transaction${result.data.successful_imports !== 1 ? 's' : ''} imported successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowModal(false);
                setSmsText('');
                setParsedTransactions([]);
                setDetectedMessageCount(0);
                onTransactionImported?.();
              }
            }
          ]
        );
      } else {
        Alert.alert('Import Failed', result.error || 'Failed to import transactions');
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import transactions');
    } finally {
      setIsProcessing(false);
    }
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

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#00B894" />
            </View>
            <View>
              <Text style={styles.title}>Quick SMS Import</Text>
              <Text style={styles.subtitle}>Paste & parse M-Pesa messages</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="expand" size={16} color="#74C69D" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.smsInput}
          value={smsText}
          onChangeText={handleSMSTextChange}
          placeholder="Paste M-Pesa SMS message here..."
          placeholderTextColor="#74C69D"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {smsText.trim() && (
          <View style={styles.messageCountContainer}>
            <Ionicons
              name={detectedMessageCount > 0 ? "checkmark-circle" : "alert-circle"}
              size={14}
              color={detectedMessageCount > 0 ? "#00B894" : "#F39C12"}
            />
            <Text style={[
              styles.messageCountText,
              { color: detectedMessageCount > 0 ? "#00B894" : "#F39C12" }
            ]}>
              {detectedMessageCount > 0
                ? `${detectedMessageCount} message${detectedMessageCount > 1 ? 's' : ''} detected`
                : 'No M-Pesa messages detected'
              }
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.parseButton, (!smsText.trim() || isProcessing) && styles.parseButtonDisabled]}
          onPress={handleQuickParse}
          disabled={!smsText.trim() || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="flash" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.parseButtonText}>
            {isProcessing ? 'Parsing...' : 'Quick Parse'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Detailed Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Parsed Transactions</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#74C69D" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {parsedTransactions.map((transaction, index) => {
              const isFuliza = transaction.mpesa_details?.message_type?.includes('fuliza') ||
                              transaction.description?.toLowerCase().includes('fuliza');
              const hasExtractedDate = !!transaction.transaction_date;
              const hasFees = (transaction.sms_metadata?.total_fees || 0) > 0;

              return (
                <View key={index} style={[
                  styles.transactionCard,
                  isFuliza && styles.fulizaTransactionCard
                ]}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <View style={styles.amountRow}>
                        <Text style={[
                          styles.transactionAmount,
                          { color: isFuliza ? '#6C5CE7' : transaction.type === 'income' ? '#00B894' : '#E74C3C' }
                        ]}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </Text>
                        {isFuliza && (
                          <View style={styles.fulizaBadge}>
                            <Ionicons name="wallet" size={10} color="#FFFFFF" />
                            <Text style={styles.fulizaBadgeText}>FULIZA</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.transactionDescription}>{transaction.description}</Text>

                      {/* Enhanced metadata row */}
                      <View style={styles.metadataRow}>
                        {hasExtractedDate && (
                          <View style={styles.extractedDateBadge}>
                            <Ionicons name="calendar" size={10} color="#00B894" />
                            <Text style={styles.extractedDateText}>SMS Date</Text>
                          </View>
                        )}
                        {hasFees && (
                          <View style={styles.feeBadge}>
                            <Ionicons name="receipt" size={10} color="#F39C12" />
                            <Text style={styles.feeText}>
                              +{formatCurrency(transaction.sms_metadata?.total_fees || 0)} fees
                            </Text>
                          </View>
                        )}
                        {transaction.sms_metadata?.requires_review && (
                          <View style={styles.reviewBadge}>
                            <Ionicons name="alert-circle" size={10} color="#E74C3C" />
                            <Text style={styles.reviewText}>Review</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.rightColumn}>
                      <View style={[
                        styles.confidenceContainer,
                        { backgroundColor: getConfidenceColor(transaction.confidence) + '20' }
                      ]}>
                        <Text style={[
                          styles.confidenceText,
                          { color: getConfidenceColor(transaction.confidence) }
                        ]}>
                          {Math.round(transaction.confidence * 100)}%
                        </Text>
                      </View>

                      {transaction.mpesa_details?.transaction_id && (
                        <Text style={styles.transactionId}>
                          {transaction.mpesa_details.transaction_id}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Fuliza-specific information */}
                  {isFuliza && (transaction.mpesa_details?.fuliza_outstanding || transaction.mpesa_details?.fuliza_limit) && (
                    <View style={styles.fulizaDetails}>
                      {transaction.mpesa_details?.fuliza_outstanding && (
                        <View style={styles.fulizaDetailItem}>
                          <Ionicons name="alert-triangle" size={12} color="#F39C12" />
                          <Text style={styles.fulizaDetailText}>
                            Outstanding: {formatCurrency(transaction.mpesa_details.fuliza_outstanding)}
                          </Text>
                        </View>
                      )}
                      {transaction.mpesa_details?.fuliza_limit && (
                        <View style={styles.fulizaDetailItem}>
                          <Ionicons name="card" size={12} color="#6C5CE7" />
                          <Text style={styles.fulizaDetailText}>
                            Limit: {formatCurrency(transaction.mpesa_details.fuliza_limit)}
                          </Text>
                        </View>
                      )}
                      {transaction.mpesa_details?.due_date && (
                        <View style={styles.fulizaDetailItem}>
                          <Ionicons name="time" size={12} color="#E74C3C" />
                          <Text style={styles.fulizaDetailText}>
                            Due: {transaction.mpesa_details.due_date}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Fee breakdown */}
                  {hasFees && transaction.sms_metadata?.fee_breakdown && (
                    <View style={styles.feeBreakdown}>
                      <Text style={styles.feeBreakdownTitle}>Charges:</Text>
                      <View style={styles.feeBreakdownList}>
                        {Object.entries(transaction.sms_metadata.fee_breakdown).map(([feeType, amount]) => (
                          <View key={feeType} style={styles.feeBreakdownItem}>
                            <Text style={styles.feeBreakdownLabel}>
                              {feeType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                            </Text>
                            <Text style={styles.feeBreakdownAmount}>
                              {formatCurrency(amount)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.transactionDetails}>
                    <View style={styles.categoryContainer}>
                      <Ionicons name="pricetag" size={14} color="#74C69D" />
                      <Text style={styles.categoryText}>{transaction.suggested_category}</Text>
                    </View>
                    <View style={[
                      styles.typeContainer,
                      { backgroundColor: isFuliza ? '#6C5CE7' : transaction.type === 'income' ? '#00B894' : '#E74C3C' }
                    ]}>
                      <Text style={styles.typeText}>
                        {isFuliza
                          ? (transaction.mpesa_details?.message_type?.includes('loan') ? 'LOAN' : 'REPAY')
                          : transaction.type.toUpperCase()
                        }
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {parsedTransactions.length > 0 && (
              <TouchableOpacity
                style={[styles.importButton, isProcessing && styles.importButtonDisabled]}
                onPress={handleImportTransactions}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.importButtonText}>
                  {isProcessing ? 'Importing...' : `Import ${parsedTransactions.length} Transaction${parsedTransactions.length !== 1 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 2,
  },
  expandButton: {
    padding: 4,
  },
  smsInput: {
    backgroundColor: '#0D1B2A',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#415A77',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  messageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  messageCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  parseButton: {
    backgroundColor: '#00B894',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  parseButtonDisabled: {
    opacity: 0.6,
  },
  parseButtonText: {
    fontSize: 14,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  transactionCard: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  fulizaTransactionCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#6C5CE7',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionDescription: {
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
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    color: '#74C69D',
  },
  typeContainer: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  importButton: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 24,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  fulizaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  fulizaBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  extractedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  extractedDateText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  feeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F39C12',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  feeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  reviewText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  transactionId: {
    fontSize: 10,
    color: '#74C69D',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  fulizaDetails: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  fulizaDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  fulizaDetailText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  feeBreakdown: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  feeBreakdownTitle: {
    fontSize: 12,
    color: '#F39C12',
    fontWeight: '600',
    marginBottom: 8,
  },
  feeBreakdownList: {
    gap: 4,
  },
  feeBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeBreakdownLabel: {
    fontSize: 11,
    color: '#74C69D',
    flex: 1,
  },
  feeBreakdownAmount: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
