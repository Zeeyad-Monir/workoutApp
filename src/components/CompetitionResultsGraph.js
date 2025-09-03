import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle } from 'react-native-svg';

const CompetitionResultsGraph = ({ 
  startAt, 
  endAt, 
  tickMode, 
  series, 
  initialHiddenUserIds = [],
  ticks = []
}) => {
  const [hiddenUsers, setHiddenUsers] = useState(new Set(initialHiddenUserIds));
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32; // Account for padding
  
  // Filter visible series
  const visibleSeries = useMemo(() => {
    return series.filter(s => !hiddenUsers.has(s.userId));
  }, [series, hiddenUsers]);
  
  // Prepare data for the chart
  const chartData = useMemo(() => {
    if (visibleSeries.length === 0 || !ticks || ticks.length === 0) {
      return null;
    }
    
    // Use provided ticks or generate from first series
    const labels = ticks.length > 0 ? ticks : visibleSeries[0]?.points.map((_, i) => `Day ${i + 1}`) || [];
    
    // Limit labels for display if too many
    const maxLabels = 6;
    const labelStep = Math.ceil(labels.length / maxLabels);
    const displayLabels = labels.filter((_, i) => i % labelStep === 0);
    
    const datasets = visibleSeries.map(userSeries => ({
      data: userSeries.points.map(p => p.cumulative),
      color: (opacity = 1) => userSeries.colorHex || `rgba(164, 214, 94, ${opacity})`,
      strokeWidth: 2,
    }));
    
    return {
      labels: displayLabels,
      datasets,
      legend: visibleSeries.map(s => s.displayName)
    };
  }, [visibleSeries, ticks]);
  
  const toggleUserVisibility = (userId) => {
    setHiddenUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };
  
  // Handle empty or no data state
  if (!series || series.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No graph data available</Text>
        </View>
      </View>
    );
  }
  
  // Handle all users hidden
  if (!chartData) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Select at least one player from the legend to view the graph</Text>
        </View>
        <LegendComponent 
          series={series} 
          hiddenUsers={hiddenUsers} 
          onToggle={toggleUserVisibility}
        />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.graphCard}>
        <Text style={styles.graphTitle}>Score Progression</Text>
        <Text style={styles.graphDescription}>
          See how every player's score grew over time. The chart shows cumulative points from start to finish.
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={Math.max(chartWidth, ticks.length * 50)}
              height={250}
              yAxisSuffix=" pts"
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(164, 214, 94, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(26, 30, 35, ${opacity})`,
                style: {
                  borderRadius: 10,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#FFFFFF'
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: '#E0E0E0',
                  strokeWidth: 1
                }
              }}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withHorizontalLabels={true}
              withVerticalLabels={true}
              withDots={true}
              onDataPointClick={({ value, dataset, getColor }) => {
                // Handle point click for tooltip
                setSelectedPoint({ value, color: getColor(1) });
                setTimeout(() => setSelectedPoint(null), 3000);
              }}
            />
          </View>
        </ScrollView>
        
        {selectedPoint && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{selectedPoint.value} points</Text>
          </View>
        )}
      </View>
      
      <LegendComponent 
        series={series} 
        hiddenUsers={hiddenUsers} 
        onToggle={toggleUserVisibility}
      />
      
      <View style={styles.helpCard}>
        <Text style={styles.helpText}>
          Tap a player name in the legend to hide or show their line. 
          Tap a point on the graph to see exact totals.
        </Text>
      </View>
    </ScrollView>
  );
};

const LegendComponent = ({ series, hiddenUsers, onToggle }) => {
  return (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Players</Text>
      <View style={styles.legendItems}>
        {series.map(userSeries => {
          const isHidden = hiddenUsers.has(userSeries.userId);
          return (
            <TouchableOpacity
              key={userSeries.userId}
              style={[styles.legendItem, isHidden && styles.legendItemHidden]}
              onPress={() => onToggle(userSeries.userId)}
              accessibilityLabel={`${isHidden ? 'Show' : 'Hide'} ${userSeries.displayName}`}
              accessibilityRole="button"
            >
              <View 
                style={[
                  styles.legendColor, 
                  { backgroundColor: userSeries.colorHex },
                  isHidden && styles.legendColorHidden
                ]}
              />
              <Text style={[styles.legendText, isHidden && styles.legendTextHidden]}>
                {userSeries.displayName}
              </Text>
              {userSeries.points.length > 0 && (
                <Text style={[styles.legendPoints, isHidden && styles.legendTextHidden]}>
                  ({userSeries.points[userSeries.points.length - 1].cumulative} pts)
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    padding: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  graphCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1E23',
    marginBottom: 8,
  },
  graphDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 10,
  },
  legendContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1E23',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    marginRight: 8,
    marginBottom: 8,
  },
  legendItemHidden: {
    opacity: 0.5,
    backgroundColor: '#E0E0E0',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendColorHidden: {
    backgroundColor: '#999',
  },
  legendText: {
    fontSize: 14,
    color: '#1A1E23',
    fontWeight: '500',
  },
  legendTextHidden: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  legendPoints: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  helpCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  tooltip: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default CompetitionResultsGraph;