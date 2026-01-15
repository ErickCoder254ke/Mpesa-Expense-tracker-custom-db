import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BarChartData {
  label: string;
  value: number;
  color: string;
  count?: number;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  showValues?: boolean;
  showGrid?: boolean;
  interactive?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function BarChart({ 
  data, 
  height = 240, 
  showValues = true, 
  showGrid = true,
  interactive = true 
}: BarChartProps) {
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  
  const maxValue = Math.max(...data.map(item => item.value));
  const chartWidth = screenWidth - 120; // Account for Y-axis labels and padding
  const minBarWidth = 35;
  const maxBarWidth = 70;
  const spacing = 10;
  
  // Calculate optimal bar width based on number of items
  const availableWidth = chartWidth - (data.length - 1) * spacing;
  const calculatedBarWidth = Math.min(maxBarWidth, Math.max(minBarWidth, availableWidth / data.length));
  const barWidth = calculatedBarWidth;

  if (maxValue === 0 || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height: height + 60 }]}>
        <Ionicons name="bar-chart-outline" size={64} color="#415A77" />
        <Text style={styles.emptyText}>No data available</Text>
        <Text style={styles.emptySubtext}>Add transactions to see comparison</Text>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

    if (safeAmount >= 1000000) {
      return `${(safeAmount / 1000000).toFixed(1)}M`;
    }
    if (safeAmount >= 1000) {
      return `${(safeAmount / 1000).toFixed(1)}K`;
    }
    if (safeAmount >= 100) {
      return safeAmount.toFixed(0);
    }
    return safeAmount.toFixed(0);
  };

  const formatFullCurrency = (amount: number) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Generate Y-axis values
  const yAxisValues = [
    maxValue,
    maxValue * 0.75,
    maxValue * 0.5,
    maxValue * 0.25,
    0
  ];

  const totalWidth = data.length * barWidth + (data.length - 1) * spacing;
  const needsScroll = totalWidth > chartWidth;

  const ChartContent = () => (
    <View style={styles.chartArea}>
      {/* Chart title and stats */}
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Spending Comparison</Text>
        <View style={styles.chartStats}>
          <Text style={styles.statText}>
            Highest: {formatFullCurrency(maxValue)}
          </Text>
          <Text style={styles.statText}>
            Categories: {data.length}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={[styles.yAxisContainer, { height }]}>
          {yAxisValues.map((value, index) => (
            <View key={index} style={styles.yAxisLabelContainer}>
              <Text style={styles.yAxisLabel}>
                {value > 0 ? formatCurrency(value) : '0'}
              </Text>
            </View>
          ))}
        </View>

        {/* Chart with bars and grid */}
        <View style={styles.chartMainArea}>
          <View style={[styles.chartGrid, { height }]}>
            {/* Grid lines */}
            {showGrid && yAxisValues.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.gridLine,
                  { bottom: (height / (yAxisValues.length - 1)) * index }
                ]}
              />
            ))}

            {/* Bars container */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.barsScrollContainer,
                !needsScroll && styles.barsNoScroll
              ]}
              style={styles.barsContainer}
            >
              <View style={styles.barsInnerContainer}>
                {data.map((item, index) => {
                  const barHeight = Math.max((item.value / maxValue) * height, 2);
                  const isSelected = selectedBar === index;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.barContainer}
                      onPress={() => interactive && setSelectedBar(isSelected ? null : index)}
                      activeOpacity={interactive ? 0.7 : 1}
                    >
                      {/* Value label above bar */}
                      {showValues && item.value > 0 && (
                        <View style={styles.valueContainer}>
                          <Text style={[
                            styles.valueLabel,
                            isSelected && styles.selectedValueLabel
                          ]}>
                            {formatCurrency(item.value)}
                          </Text>
                          {item.count && (
                            <Text style={styles.countLabel}>
                              {item.count}x
                            </Text>
                          )}
                        </View>
                      )}
                      
                      {/* Bar with enhanced styling */}
                      <View style={styles.barWrapper}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: barHeight,
                              width: barWidth,
                              backgroundColor: item.color,
                              opacity: isSelected ? 1 : 0.85,
                              transform: [{ scale: isSelected ? 1.05 : 1 }],
                            }
                          ]}
                        >
                          {/* Bar gradient effect */}
                          <View style={[
                            styles.barGradient,
                            { backgroundColor: item.color }
                          ]} />
                        </View>
                        
                        {/* Selection indicator */}
                        {isSelected && (
                          <View style={[styles.selectionIndicator, { width: barWidth + 8 }]} />
                        )}
                      </View>
                      
                      {/* X-axis label with better formatting */}
                      <View style={[styles.xAxisLabelContainer, { width: barWidth + 16 }]}>
                        <Text
                          style={[
                            styles.xAxisLabel,
                            isSelected && styles.selectedXAxisLabel
                          ]}
                          numberOfLines={2}
                        >
                          {item.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Selected item details */}
      {selectedBar !== null && interactive && (
        <View style={styles.selectedDetails}>
          <View style={styles.selectedHeader}>
            <View style={[
              styles.selectedColorDot, 
              { backgroundColor: data[selectedBar].color }
            ]} />
            <Text style={styles.selectedTitle}>{data[selectedBar].label}</Text>
            <TouchableOpacity 
              onPress={() => setSelectedBar(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={16} color="#74C69D" />
            </TouchableOpacity>
          </View>
          <View style={styles.selectedStats}>
            <View style={styles.selectedStat}>
              <Text style={styles.selectedStatLabel}>Amount</Text>
              <Text style={styles.selectedStatValue}>
                {formatFullCurrency(data[selectedBar].value)}
              </Text>
            </View>
            {data[selectedBar].count && (
              <View style={styles.selectedStat}>
                <Text style={styles.selectedStatLabel}>Transactions</Text>
                <Text style={styles.selectedStatValue}>
                  {data[selectedBar].count}
                </Text>
              </View>
            )}
            <View style={styles.selectedStat}>
              <Text style={styles.selectedStatLabel}>Percentage</Text>
              <Text style={styles.selectedStatValue}>
                {((data[selectedBar].value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Chart summary */}
      <View style={styles.chartSummary}>
        <View style={styles.summaryItem}>
          <Ionicons name="trending-up" size={16} color="#00B894" />
          <Text style={styles.summaryLabel}>Highest</Text>
          <Text style={styles.summaryValue}>{data[0]?.label || 'N/A'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Ionicons name="analytics" size={16} color="#74C69D" />
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(data.reduce((sum, item) => sum + item.value, 0))}
          </Text>
        </View>
        {needsScroll && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="swap-horizontal" size={16} color="#415A77" />
              <Text style={styles.summaryLabel}>Scroll</Text>
              <Text style={styles.summaryValue}>→</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );

  return <ChartContent />;
}

const styles = StyleSheet.create({
  chartArea: {
    width: '100%',
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  statText: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '500',
  },
  chartContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  yAxisContainer: {
    width: 50,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yAxisLabelContainer: {
    height: 20,
    justifyContent: 'center',
  },
  yAxisLabel: {
    fontSize: 11,
    color: '#74C69D',
    fontWeight: '600',
  },
  chartMainArea: {
    flex: 1,
  },
  chartGrid: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#415A77',
    opacity: 0.4,
  },
  barsContainer: {
    flex: 1,
  },
  barsScrollContainer: {
    paddingHorizontal: 8,
  },
  barsNoScroll: {
    justifyContent: 'center',
    flexGrow: 1,
  },
  barsInnerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    minHeight: '100%',
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 32,
    justifyContent: 'flex-end',
  },
  valueLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 184, 148, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedValueLabel: {
    backgroundColor: '#00B894',
    color: '#FFFFFF',
  },
  countLabel: {
    fontSize: 9,
    color: '#74C69D',
    marginTop: 2,
    fontWeight: '500',
  },
  barWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  bar: {
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  barGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    opacity: 0.6,
  },
  selectionIndicator: {
    position: 'absolute',
    bottom: -4,
    height: 3,
    backgroundColor: '#00B894',
    borderRadius: 2,
  },
  xAxisLabelContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 11,
    color: '#74C69D',
    textAlign: 'center',
    lineHeight: 13,
    fontWeight: '500',
  },
  selectedXAxisLabel: {
    color: '#00B894',
    fontWeight: '700',
  },
  selectedDetails: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  selectedStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  selectedStat: {
    alignItems: 'center',
  },
  selectedStatLabel: {
    fontSize: 11,
    color: '#74C69D',
    marginBottom: 4,
  },
  selectedStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(116, 198, 157, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#74C69D',
    marginTop: 2,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#415A77',
    marginHorizontal: 8,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#415A77',
    borderStyle: 'dashed',
    marginHorizontal: 24,
  },
  emptyText: {
    color: '#74C69D',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#415A77',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
