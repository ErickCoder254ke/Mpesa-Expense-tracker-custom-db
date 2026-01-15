import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LineChartData {
  label: string;
  value: number;
  date?: string;
}

interface LineChartProps {
  data: LineChartData[];
  height?: number;
  color?: string;
  showDots?: boolean;
  showArea?: boolean;
  interactive?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function LineChart({ 
  data, 
  height = 200, 
  color = '#00B894',
  showDots = true,
  showArea = true,
  interactive = true
}: LineChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  
  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Ionicons name="trending-up-outline" size={48} color="#415A77" />
        <Text style={styles.emptyText}>No trend data</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const valueRange = maxValue - minValue || 1;
  
  const chartWidth = screenWidth - 80;
  const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  const getYPosition = (value: number) => {
    return height - ((value - minValue) / valueRange) * (height - 40) - 20;
  };

  const getXPosition = (index: number) => {
    return index * pointSpacing;
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Spending Trend</Text>
        <View style={styles.chartLegend}>
          <View style={[styles.legendDot, { backgroundColor: color }]} />
          <Text style={styles.legendText}>Daily Expenses</Text>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={[styles.chartContainer, { width: Math.max(chartWidth, data.length * 50), height }]}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <View
              key={index}
              style={[
                styles.gridLine,
                { bottom: 20 + ratio * (height - 40) }
              ]}
            />
          ))}

          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            {[maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, minValue].map((value, index) => (
              <Text key={index} style={styles.yAxisLabel}>
                {formatValue(value)}
              </Text>
            ))}
          </View>

          {/* Line path */}
          {data.length > 1 && (
            <View style={styles.lineContainer}>
              {data.slice(0, -1).map((point, index) => {
                const x1 = getXPosition(index);
                const y1 = getYPosition(point.value);
                const x2 = getXPosition(index + 1);
                const y2 = getYPosition(data[index + 1].value);
                
                const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                const angle = Math.atan2(y2 - y1, x2 - x1);
                
                return (
                  <View
                    key={index}
                    style={[
                      styles.lineSegment,
                      {
                        left: x1 + 40,
                        top: y1,
                        width: length,
                        backgroundColor: color,
                        transform: [{ rotate: `${angle}rad` }],
                      }
                    ]}
                  />
                );
              })}
            </View>
          )}

          {/* Area fill */}
          {showArea && data.length > 1 && (
            <View style={styles.areaContainer}>
              {data.slice(0, -1).map((point, index) => {
                const x1 = getXPosition(index);
                const y1 = getYPosition(point.value);
                const x2 = getXPosition(index + 1);
                const y2 = getYPosition(data[index + 1].value);
                
                const avgHeight = (height - 20 - y1 + height - 20 - y2) / 2;
                
                return (
                  <View
                    key={index}
                    style={[
                      styles.areaSegment,
                      {
                        left: x1 + 40,
                        bottom: 20,
                        width: x2 - x1,
                        height: avgHeight,
                        backgroundColor: color,
                      }
                    ]}
                  />
                );
              })}
            </View>
          )}

          {/* Data points */}
          {data.map((point, index) => {
            const x = getXPosition(index);
            const y = getYPosition(point.value);
            const isSelected = selectedPoint === index;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dataPoint,
                  {
                    left: x + 40 - 6,
                    top: y - 6,
                    backgroundColor: color,
                    borderColor: isSelected ? '#FFFFFF' : color,
                    borderWidth: isSelected ? 3 : 2,
                    transform: [{ scale: isSelected ? 1.3 : 1 }],
                  }
                ]}
                onPress={() => interactive && setSelectedPoint(isSelected ? null : index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showDots && (
                  <View style={[styles.innerDot, { backgroundColor: '#FFFFFF' }]} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* X-axis labels */}
          <View style={styles.xAxisLabels}>
            {data.map((point, index) => (
              <Text
                key={index}
                style={[
                  styles.xAxisLabel,
                  { left: getXPosition(index) + 40 - 15 }
                ]}
              >
                {point.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Selected point details */}
      {selectedPoint !== null && interactive && (
        <View style={styles.selectedDetails}>
          <View style={styles.detailsHeader}>
            <View style={[styles.detailsIcon, { backgroundColor: color }]}>
              <Ionicons name="trending-up" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.detailsTitle}>
              {data[selectedPoint].label}
            </Text>
            <TouchableOpacity 
              onPress={() => setSelectedPoint(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={16} color="#74C69D" />
            </TouchableOpacity>
          </View>
          <View style={styles.detailsContent}>
            <Text style={styles.detailsValue}>
              KSh {(data[selectedPoint]?.value || 0).toLocaleString()}
            </Text>
            {data[selectedPoint].date && (
              <Text style={styles.detailsDate}>
                {data[selectedPoint].date}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#74C69D',
    fontWeight: '500',
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  chartContainer: {
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 40,
    right: 0,
    height: 1,
    backgroundColor: '#415A77',
    opacity: 0.3,
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 20,
    width: 35,
    justifyContent: 'space-between',
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#74C69D',
    textAlign: 'right',
    fontWeight: '500',
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  areaContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  areaSegment: {
    position: 'absolute',
    opacity: 0.2,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  innerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#74C69D',
    textAlign: 'center',
    width: 30,
    fontWeight: '500',
  },
  selectedDetails: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  detailsTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  detailsContent: {
    alignItems: 'center',
  },
  detailsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B894',
  },
  detailsDate: {
    fontSize: 12,
    color: '#74C69D',
    marginTop: 4,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#415A77',
  },
  emptyText: {
    color: '#74C69D',
    fontSize: 16,
    marginTop: 8,
  },
});
