import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const OnboardingMockElement = ({ type, measurements }) => {
  if (!measurements) return null;

  const renderMockSubmissionCard = () => (
    <View style={[styles.mockCard, { 
      position: 'absolute',
      left: Math.max(20, measurements.x),
      top: measurements.y + 20,
      width: Math.min(measurements.width || SCREEN_WIDTH - 40, SCREEN_WIDTH - 40),
    }]}>
      <View style={styles.mockCardHeader}>
        <Text style={styles.mockTitle}>Push-Up Challenge</Text>
        <View style={styles.mockBadge}>
          <Text style={styles.mockBadgeText}>Active</Text>
        </View>
      </View>
      
      <View style={styles.mockCardContent}>
        <View style={styles.mockStats}>
          <View style={styles.mockStatItem}>
            <Text style={styles.mockStatLabel}>Your Points</Text>
            <Text style={styles.mockStatValue}>450</Text>
          </View>
          <View style={styles.mockStatItem}>
            <Text style={styles.mockStatLabel}>Days Left</Text>
            <Text style={styles.mockStatValue}>5</Text>
          </View>
        </View>
        
        <View style={styles.mockSubmitButton}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.mockSubmitText}>Add Entry</Text>
        </View>
      </View>
    </View>
  );

  const renderMockLeaderboard = () => (
    <View style={[styles.mockCard, { 
      position: 'absolute',
      left: Math.max(20, measurements.x),
      top: measurements.y + 20,
      width: Math.min(measurements.width || SCREEN_WIDTH - 40, SCREEN_WIDTH - 40),
    }]}>
      <View style={styles.mockCardHeader}>
        <Text style={styles.mockTitle}>Weekly Fitness Battle</Text>
        <View style={styles.mockBadge}>
          <Text style={styles.mockBadgeText}>Active</Text>
        </View>
      </View>
      
      <View style={styles.mockLeaderboardContent}>
        <View style={styles.mockLeaderItem}>
          <View style={styles.mockRankCircle}>
            <Text style={styles.mockRankText}>1</Text>
          </View>
          <Text style={styles.mockLeaderName}>Sarah M.</Text>
          <Text style={styles.mockLeaderScore}>1,250 pts</Text>
        </View>
        
        <View style={[styles.mockLeaderItem, styles.mockLeaderItemHighlight]}>
          <View style={[styles.mockRankCircle, styles.mockRankCircleYou]}>
            <Text style={styles.mockRankText}>2</Text>
          </View>
          <Text style={styles.mockLeaderName}>You</Text>
          <Text style={styles.mockLeaderScore}>1,180 pts</Text>
        </View>
        
        <View style={styles.mockLeaderItem}>
          <View style={styles.mockRankCircle}>
            <Text style={styles.mockRankText}>3</Text>
          </View>
          <Text style={styles.mockLeaderName}>Mike T.</Text>
          <Text style={styles.mockLeaderScore}>980 pts</Text>
        </View>
      </View>
    </View>
  );

  switch (type) {
    case 'submission-card':
      return renderMockSubmissionCard();
    case 'leaderboard-view':
      return renderMockLeaderboard();
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  mockCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mockTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  mockBadge: {
    backgroundColor: 'rgba(147, 209, 60, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mockBadgeText: {
    color: '#93D13C',
    fontSize: 12,
    fontWeight: '600',
  },
  mockCardContent: {
    gap: 16,
  },
  mockStats: {
    flexDirection: 'row',
    gap: 20,
  },
  mockStatItem: {
    flex: 1,
  },
  mockStatLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 4,
  },
  mockStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  mockSubmitButton: {
    backgroundColor: '#B6DB78',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  mockSubmitText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  mockLeaderboardContent: {
    gap: 12,
  },
  mockLeaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  mockLeaderItemHighlight: {
    backgroundColor: 'rgba(182, 219, 120, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182, 219, 120, 0.3)',
  },
  mockRankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mockRankCircleYou: {
    backgroundColor: 'rgba(182, 219, 120, 0.2)',
  },
  mockRankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mockLeaderName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  mockLeaderScore: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OnboardingMockElement;