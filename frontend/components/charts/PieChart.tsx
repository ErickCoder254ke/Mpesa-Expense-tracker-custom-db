import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PieChartData {
  label: string;
  value: number;
  color: string;
  count?: number;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  showPercentages?: boolean;
  showValues?: boolean;
  centerLabel?: string;
  centerValue?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function PieChart({
  data,
  size = Math.min(screenWidth - 80, 260),
  showPercentages = true,
  showValues = true,
  centerLabel = "Total Expenses",
  centerValue
}: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <View style={[styles.emptyContainer, { width: size, height: size }]}>
        <Ionicons name="pie-chart-outline" size={size * 0.3} color="#415A77" />
        <Text style={styles.emptyText}>No data available</Text>
        <Text style={styles.emptySubtext}>Add transactions to see breakdown</Text>
      </View>
    );
  }

  // Filter out very small segments (less than 1%)
  const filteredData = data.filter(item => (item.value / total) >= 0.01);
  const otherData = data.filter(item => (item.value / total) < 0.01);
  const otherTotal = otherData.reduce((sum, item) => sum + item.value, 0);
  
  const chartData = [...filteredData];
  if (otherTotal > 0) {
    chartData.push({
      label: 'Other',
      value: otherTotal,
      color: '#415A77',
      count: otherData.reduce((sum, item) => sum + (item.count || 0), 0)
    });
  }

  const formatCurrency = (amount: number, compact: boolean = false) => {
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

    if (compact || screenWidth < 400) {
      if (safeAmount >= 1000000) {
        return `${(safeAmount / 1000000).toFixed(1)}M`;
      }
      if (safeAmount >= 1000) {
        return `${(safeAmount / 1000).toFixed(0)}K`;
      }
      return safeAmount.toFixed(0);
    }

    if (safeAmount >= 1000000) {
      return `KSh ${(safeAmount / 1000000).toFixed(1)}M`;
    }
    if (safeAmount >= 1000) {
      return `KSh ${(safeAmount / 1000).toFixed(1)}K`;
    }
    return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const displayValue = centerValue || formatCurrency(total);

  return (
    <View style={[styles.container, { maxWidth: screenWidth - 80 }]}>
      {/* Chart with enhanced visual design */}
      <View style={styles.chartWrapper}>
        <View style={[styles.chartContainer, { width: size, height: size, maxWidth: '100%' }]}>
          {/* Outer ring for better visual appeal */}
          <View style={[styles.outerRing, { 
            width: size + 8, 
            height: size + 8,
            borderRadius: (size + 8) / 2,
            top: -4,
            left: -4
          }]} />
          
          {/* Chart segments */}
          <PieSegments data={chartData} total={total} size={size} />
          
          {/* Enhanced center display */}
          <View style={[
            styles.centerCircle,
            {
              width: size * 0.55,
              height: size * 0.55,
              borderRadius: size * 0.275,
              top: size * 0.225,
              left: size * 0.225,
            }
          ]}>
            <Text style={styles.centerLabel}>{centerLabel}</Text>
            <Text style={styles.centerValue}>{displayValue}</Text>
            <Text style={styles.centerSubtext}>
              {chartData.length} categor{chartData.length === 1 ? 'y' : 'ies'}
            </Text>
          </View>
        </View>
      </View>

      {/* Enhanced Legend with better mobile layout */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Breakdown by Category</Text>
        <View style={styles.legendGrid}>
          {chartData.map((item, index) => {
            const percentage = ((item.value / total) * 100);
            return (
              <TouchableOpacity 
                key={index} 
                style={styles.legendItem}
                activeOpacity={0.7}
              >
                <View style={styles.legendItemLeft}>
                  <View style={[
                    styles.legendColorDot, 
                    { backgroundColor: item.color }
                  ]} />
                  <View style={styles.legendTextContainer}>
                    <Text style={styles.legendLabel} numberOfLines={1} ellipsizeMode="tail">
                      {item.label}
                    </Text>
                    {item.count && (
                      <Text style={styles.legendCount} numberOfLines={1}>
                        {item.count} transaction{item.count !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.legendItemRight}>
                  {showValues && (
                    <Text style={styles.legendValue} numberOfLines={1} adjustsFontSizeToFit>
                      {formatCurrency(item.value, screenWidth < 400)}
                    </Text>
                  )}
                  {showPercentages && (
                    <Text style={styles.legendPercentage}>
                      {percentage.toFixed(1)}%
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Summary footer */}
        <View style={styles.legendSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Categories</Text>
            <Text style={styles.summaryValue}>{data.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Largest Category</Text>
            <Text style={styles.summaryValue}>
              {((chartData[0]?.value || 0) / total * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Enhanced segment rendering with smooth visual design
function PieSegments({ data, total, size }: { data: PieChartData[], total: number, size: number }) {
  const radius = (size - 40) / 2; // More padding for better appearance
  const centerX = size / 2;
  const centerY = size / 2;
  const strokeWidth = 30; // Thicker segments for better visibility

  let currentAngle = -90; // Start from top

  return (
    <View style={StyleSheet.absoluteFill}>
      {data.map((item, index) => {
        const percentage = item.value / total;
        const angle = percentage * 360;
        
        if (percentage < 0.01) return null; // Skip very small segments

        const segment = (
          <PieSegment
            key={index}
            startAngle={currentAngle}
            endAngle={currentAngle + angle}
            radius={radius}
            centerX={centerX}
            centerY={centerY}
            color={item.color}
            strokeWidth={strokeWidth}
            percentage={percentage}
          />
        );

        currentAngle += angle;
        return segment;
      })}
    </View>
  );
}

function PieSegment({ 
  startAngle, 
  endAngle, 
  radius, 
  centerX, 
  centerY, 
  color, 
  strokeWidth,
  percentage 
}: {
  startAngle: number;
  endAngle: number;
  radius: number;
  centerX: number;
  centerY: number;
  color: string;
  strokeWidth: number;
  percentage: number;
}) {
  const angle = endAngle - startAngle;
  const segments = Math.max(Math.ceil(angle / 3), 1); // Smoother curves
  
  return (
    <>
      {Array.from({ length: segments }, (_, i) => {
        const segStartAngle = startAngle + (i * angle) / segments;
        const segEndAngle = startAngle + ((i + 1) * angle) / segments;
        
        const segStartRad = (segStartAngle * Math.PI) / 180;
        const segEndRad = (segEndAngle * Math.PI) / 180;
        
        const x1 = centerX + radius * Math.cos(segStartRad);
        const y1 = centerY + radius * Math.sin(segStartRad);
        const x2 = centerX + radius * Math.cos(segEndRad);
        const y2 = centerY + radius * Math.sin(segEndRad);
        
        const segmentLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const segmentAngle = Math.atan2(y2 - y1, x2 - x1);
        
        return (
          <View
            key={i}
            style={[
              styles.segment,
              {
                position: 'absolute',
                left: x1 - strokeWidth / 2,
                top: y1 - strokeWidth / 2,
                width: segmentLength + strokeWidth,
                height: strokeWidth,
                backgroundColor: color,
                transform: [
                  { rotate: `${segmentAngle}rad` }
                ],
              }
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  chartWrapper: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  chartContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#415A77',
    opacity: 0.3,
  },
  segment: {
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  centerCircle: {
    position: 'absolute',
    backgroundColor: '#1B263B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#00B894',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerLabel: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '600',
    textAlign: 'center',
  },
  centerValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
  },
  centerSubtext: {
    fontSize: 10,
    color: '#74C69D',
    marginTop: 2,
    textAlign: 'center',
  },
  legend: {
    width: '100%',
    backgroundColor: '#1B263B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#415A77',
    overflow: 'hidden',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  legendGrid: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(116, 198, 157, 0.05)',
    minHeight: 44,
  },
  legendItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  legendColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  legendTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  legendLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  legendCount: {
    fontSize: 11,
    color: '#74C69D',
    marginTop: 2,
  },
  legendItemRight: {
    alignItems: 'flex-end',
    minWidth: 60,
    maxWidth: 80,
    flexShrink: 0,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  legendPercentage: {
    fontSize: 12,
    color: '#00B894',
    fontWeight: '600',
    marginTop: 2,
  },
  legendSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#415A77',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#74C69D',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00B894',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#415A77',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#415A77',
    borderStyle: 'dashed',
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
