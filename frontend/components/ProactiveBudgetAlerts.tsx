import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BudgetAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category_id?: string;
  category_name?: string;
  title: string;
  message: string;
  action_required: string;
  amount?: number;
  percentage?: number;
  days_remaining?: number;
  trend?: string;
  timestamp: number;
}

interface ProactiveBudgetAlertsProps {
  month: number;
  year: number;
  onAlertAction?: (alertId: string, action: 'dismiss' | 'snooze' | 'view') => void;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const ALERT_STORAGE_KEY = 'budget_alerts_';
const DISMISSED_ALERTS_KEY = 'dismissed_alerts_';
const SNOOZE_ALERTS_KEY = 'snoozed_alerts_';

export default function ProactiveBudgetAlerts({ 
  month, 
  year, 
  onAlertAction 
}: ProactiveBudgetAlertsProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [snoozedAlerts, setSnoozedAlerts] = useState<Set<string>>(new Set());
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<BudgetAlert | null>(null);
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [fadeAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    loadAlerts();
    loadUserPreferences();
    
    // Check for alerts every 30 minutes
    const interval = setInterval(loadAlerts, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [month, year]);

  useEffect(() => {
    // Animate critical alerts
    const criticalAlerts = alerts.filter(a => 
      a.severity === 'critical' && 
      !dismissedAlerts.has(a.id) && 
      !snoozedAlerts.has(a.id)
    );

    if (criticalAlerts.length > 0) {
      startPulseAnimation();
      // Vibrate for critical alerts
      Vibration.vibrate([0, 500, 200, 500]);
    }
  }, [alerts, dismissedAlerts, snoozedAlerts]);

  const loadAlerts = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/budgets/monitoring/analysis?month=${month}&year=${year}`
      );

      if (response.ok) {
        const data = await response.json();
        const alertsWithIds = data.alerts.map((alert: any, index: number) => ({
          ...alert,
          id: `${month}-${year}-${alert.type}-${alert.category_id || 'general'}-${index}`,
          timestamp: Date.now()
        }));
        
        setAlerts(alertsWithIds);
        await storeAlerts(alertsWithIds);
      }
    } catch (error) {
      console.error('Error loading budget alerts:', error);
      // Load cached alerts if network fails
      const cachedAlerts = await loadCachedAlerts();
      setAlerts(cachedAlerts);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const [dismissedJson, snoozedJson] = await Promise.all([
        AsyncStorage.getItem(`${DISMISSED_ALERTS_KEY}${month}-${year}`),
        AsyncStorage.getItem(`${SNOOZE_ALERTS_KEY}${month}-${year}`)
      ]);

      if (dismissedJson) {
        setDismissedAlerts(new Set(JSON.parse(dismissedJson)));
      }

      if (snoozedJson) {
        const snoozedData = JSON.parse(snoozedJson);
        const currentTime = Date.now();
        const activeSnoozed = snoozedData.filter((item: any) => 
          currentTime < item.snoozeUntil
        ).map((item: any) => item.alertId);
        
        setSnoozedAlerts(new Set(activeSnoozed));
        
        // Clean up expired snoozes
        if (activeSnoozed.length !== snoozedData.length) {
          await AsyncStorage.setItem(
            `${SNOOZE_ALERTS_KEY}${month}-${year}`,
            JSON.stringify(snoozedData.filter((item: any) => 
              currentTime < item.snoozeUntil
            ))
          );
        }
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const storeAlerts = async (alertsToStore: BudgetAlert[]) => {
    try {
      await AsyncStorage.setItem(
        `${ALERT_STORAGE_KEY}${month}-${year}`,
        JSON.stringify(alertsToStore)
      );
    } catch (error) {
      console.error('Error storing alerts:', error);
    }
  };

  const loadCachedAlerts = async (): Promise<BudgetAlert[]> => {
    try {
      const cachedJson = await AsyncStorage.getItem(`${ALERT_STORAGE_KEY}${month}-${year}`);
      return cachedJson ? JSON.parse(cachedJson) : [];
    } catch (error) {
      console.error('Error loading cached alerts:', error);
      return [];
    }
  };

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  };

  const handleAlertPress = (alert: BudgetAlert) => {
    setSelectedAlert(alert);
    setShowAlertModal(true);
    
    if (onAlertAction) {
      onAlertAction(alert.id, 'view');
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(alertId);
    setDismissedAlerts(newDismissed);

    try {
      await AsyncStorage.setItem(
        `${DISMISSED_ALERTS_KEY}${month}-${year}`,
        JSON.stringify(Array.from(newDismissed))
      );
    } catch (error) {
      console.error('Error storing dismissed alerts:', error);
    }

    if (onAlertAction) {
      onAlertAction(alertId, 'dismiss');
    }

    // Animate fade out
    Animated.timing(fadeAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      fadeAnimation.setValue(1);
    });
  };

  const handleSnoozeAlert = async (alertId: string, hours: number = 24) => {
    const newSnoozed = new Set(snoozedAlerts);
    newSnoozed.add(alertId);
    setSnoozedAlerts(newSnoozed);

    try {
      const currentSnoozed = await AsyncStorage.getItem(`${SNOOZE_ALERTS_KEY}${month}-${year}`);
      const snoozedList = currentSnoozed ? JSON.parse(currentSnoozed) : [];
      
      snoozedList.push({
        alertId,
        snoozeUntil: Date.now() + (hours * 60 * 60 * 1000)
      });

      await AsyncStorage.setItem(
        `${SNOOZE_ALERTS_KEY}${month}-${year}`,
        JSON.stringify(snoozedList)
      );
    } catch (error) {
      console.error('Error storing snoozed alerts:', error);
    }

    if (onAlertAction) {
      onAlertAction(alertId, 'snooze');
    }

    setShowAlertModal(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#E74C3C';
      case 'high': return '#E67E22';
      case 'medium': return '#F39C12';
      case 'low': return '#3498DB';
      default: return '#74C69D';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return 'alert-circle';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getTimeRemaining = (daysRemaining?: number) => {
    if (daysRemaining === undefined) return '';
    if (daysRemaining <= 0) return 'Month ended';
    if (daysRemaining === 1) return '1 day left';
    return `${daysRemaining} days left`;
  };

  // Filter alerts based on user preferences
  const visibleAlerts = alerts.filter(alert => 
    !dismissedAlerts.has(alert.id) && !snoozedAlerts.has(alert.id)
  );

  const criticalAlerts = visibleAlerts.filter(a => a.severity === 'critical');
  const highAlerts = visibleAlerts.filter(a => a.severity === 'high');
  const otherAlerts = visibleAlerts.filter(a => a.severity !== 'critical' && a.severity !== 'high');

  // Sort alerts by severity and timestamp
  const sortedAlerts = [...criticalAlerts, ...highAlerts, ...otherAlerts].sort((a, b) => {
    if (a.severity === b.severity) {
      return b.timestamp - a.timestamp;
    }
    return 0;
  });

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Quick Alert Banner for Critical/High Alerts */}
      {(criticalAlerts.length > 0 || highAlerts.length > 0) && (
        <Animated.View style={[
          styles.alertBanner,
          { 
            transform: [{ scale: pulseAnimation }],
            backgroundColor: criticalAlerts.length > 0 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(230, 126, 34, 0.1)'
          }
        ]}>
          <View style={styles.bannerContent}>
            <Ionicons 
              name={criticalAlerts.length > 0 ? "alert-circle" : "warning"} 
              size={24} 
              color={criticalAlerts.length > 0 ? "#E74C3C" : "#E67E22"} 
            />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>
                {criticalAlerts.length > 0 ? 'Critical Budget Alert!' : 'Budget Warning'}
              </Text>
              <Text style={styles.bannerMessage}>
                {criticalAlerts.length > 0 
                  ? `${criticalAlerts.length} critical issue${criticalAlerts.length > 1 ? 's' : ''} need${criticalAlerts.length === 1 ? 's' : ''} attention`
                  : `${highAlerts.length} budget concern${highAlerts.length > 1 ? 's' : ''} detected`
                }
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.bannerButton}
              onPress={() => handleAlertPress(sortedAlerts[0])}
            >
              <Text style={styles.bannerButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Compact Alert List */}
      <View style={styles.alertsList}>
        {sortedAlerts.slice(0, 3).map((alert, index) => (
          <Animated.View 
            key={alert.id} 
            style={[
              styles.alertItem,
              { opacity: fadeAnimation },
              { borderLeftColor: getSeverityColor(alert.severity) }
            ]}
          >
            <TouchableOpacity 
              style={styles.alertContent}
              onPress={() => handleAlertPress(alert)}
            >
              <View style={styles.alertLeft}>
                <Ionicons 
                  name={getSeverityIcon(alert.severity) as any} 
                  size={20} 
                  color={getSeverityColor(alert.severity)} 
                />
                <View style={styles.alertDetails}>
                  <Text style={styles.alertTitle} numberOfLines={1}>
                    {alert.title}
                  </Text>
                  <Text style={styles.alertMessage} numberOfLines={2}>
                    {alert.message}
                  </Text>
                  {alert.days_remaining !== undefined && (
                    <Text style={styles.alertTimeRemaining}>
                      {getTimeRemaining(alert.days_remaining)}
                    </Text>
                  )}
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.dismissButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDismissAlert(alert.id);
                }}
              >
                <Ionicons name="close" size={16} color="#74C69D" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {visibleAlerts.length > 3 && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => handleAlertPress(sortedAlerts[0])}
          >
            <Text style={styles.viewAllText}>
              View {visibleAlerts.length - 3} more alert{visibleAlerts.length - 3 > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#00B894" />
          </TouchableOpacity>
        )}
      </View>

      {/* Alert Detail Modal */}
      <Modal
        visible={showAlertModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAlertModal(false)}
      >
        {selectedAlert && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAlertModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Budget Alert</Text>
              <View style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(selectedAlert.severity) }
              ]}>
                <Text style={styles.severityText}>
                  {selectedAlert.severity.toUpperCase()}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.alertDetailCard}>
                <View style={styles.alertDetailHeader}>
                  <Ionicons 
                    name={getSeverityIcon(selectedAlert.severity) as any} 
                    size={32} 
                    color={getSeverityColor(selectedAlert.severity)} 
                  />
                  <View style={styles.alertDetailTitleContainer}>
                    <Text style={styles.alertDetailTitle}>{selectedAlert.title}</Text>
                    {selectedAlert.category_name && (
                      <Text style={styles.alertDetailCategory}>
                        {selectedAlert.category_name}
                      </Text>
                    )}
                  </View>
                </View>

                <Text style={styles.alertDetailMessage}>{selectedAlert.message}</Text>

                <View style={styles.alertMetrics}>
                  {selectedAlert.amount && (
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Amount</Text>
                      <Text style={styles.metricValue}>
                        {formatCurrency(selectedAlert.amount)}
                      </Text>
                    </View>
                  )}
                  {selectedAlert.percentage && (
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Percentage</Text>
                      <Text style={styles.metricValue}>
                        {selectedAlert.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                  {selectedAlert.days_remaining !== undefined && (
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Time Remaining</Text>
                      <Text style={styles.metricValue}>
                        {getTimeRemaining(selectedAlert.days_remaining)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionSection}>
                  <Text style={styles.actionTitle}>Recommended Action</Text>
                  <Text style={styles.actionText}>{selectedAlert.action_required}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.snoozeButton}
                onPress={() => {
                  Alert.alert(
                    'Snooze Alert',
                    'How long would you like to snooze this alert?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: '1 Hour', onPress: () => handleSnoozeAlert(selectedAlert.id, 1) },
                      { text: '6 Hours', onPress: () => handleSnoozeAlert(selectedAlert.id, 6) },
                      { text: '24 Hours', onPress: () => handleSnoozeAlert(selectedAlert.id, 24) },
                    ]
                  );
                }}
              >
                <Ionicons name="time" size={20} color="#F39C12" />
                <Text style={styles.snoozeButtonText}>Snooze</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dismissModalButton}
                onPress={() => {
                  handleDismissAlert(selectedAlert.id);
                  setShowAlertModal(false);
                }}
              >
                <Ionicons name="checkmark" size={20} color="#00B894" />
                <Text style={styles.dismissModalButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  alertBanner: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 4,
  },
  bannerMessage: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  bannerButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  alertsList: {
    gap: 8,
  },
  alertItem: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  alertDetails: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    color: '#74C69D',
    lineHeight: 16,
    marginBottom: 4,
  },
  alertTimeRemaining: {
    fontSize: 11,
    color: '#F39C12',
    fontWeight: '600',
  },
  dismissButton: {
    padding: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderRadius: 8,
    gap: 6,
  },
  viewAllText: {
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
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  alertDetailCard: {
    backgroundColor: '#1B263B',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  alertDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  alertDetailTitleContainer: {
    flex: 1,
  },
  alertDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertDetailCategory: {
    fontSize: 14,
    color: '#00B894',
    fontWeight: '600',
  },
  alertDetailMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 20,
  },
  alertMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#74C69D',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionSection: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00B894',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#1B263B',
  },
  snoozeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#415A77',
    gap: 8,
  },
  snoozeButtonText: {
    color: '#F39C12',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#00B894',
    gap: 8,
  },
  dismissModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
