//LeaderboardScreen.js

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';
import { 
  getScoreVisibility, 
  filterVisibleSubmissions, 
  filterVisibleSubmissionsWithSelf,
  calculateVisiblePoints,
  calculateVisiblePointsWithSelf,
  getVisibilityMessage,
  getLastRevealDate,
  formatRevealDate
} from '../utils/scoreVisibility';

// Design Tokens
const colors = {
  bgDark: '#1C1C1C',
  bgPage: '#FFFFFF',
  brandLime: '#A4E64F',
  rankGold: '#FFD600',
  rankSilver: '#A9A9A9',
  rankBronze: '#B87333',
  textPrimaryLight: '#FFFFFF',
  textPrimaryDark: '#111111',
  textMuted: '#9AA0A6',
  textLightGray: '#E6E6E6',
  borderLight: '#EAEAEA',
  iconGray: '#333333',
};

const typography = {
  h2: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'System' }),
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'System' }),
  },
  bodyM: {
    fontSize: 17,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'System', android: 'System' }),
  },
  bodyMSemibold: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'System', android: 'System' }),
  },
  bodyS: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: Platform.select({ ios: 'System', android: 'System' }),
  },
};

const spacing = {
  base: 8,
  radiusL: 16,
  radiusXL: 20,
};

const LeaderboardScreen = ({ route, navigation }) => {
  const { competition } = route.params;
  const { user } = useContext(AuthContext);
  
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTimeout, setRefreshTimeout] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [visibility, setVisibility] = useState(null);

  /* ---------------- refresh handler -------------------- */
  const onRefresh = () => {
    setRefreshing(true);
    
    // Clear any existing timeout
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    
    // Set timeout fallback to stop refreshing after 3 seconds
    const timeout = setTimeout(() => {
      setRefreshing(false);
    }, 3000);
    
    setRefreshTimeout(timeout);
  };

  // Helper function to stop refreshing and clear timeout
  const stopRefreshing = () => {
    setRefreshing(false);
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      setRefreshTimeout(null);
    }
  };

  // Calculate and update win/loss stats
  const calculateAndUpdateStats = async () => {
    try {
      console.log('Calculating competition stats...');
      
      // Get all submissions for this competition
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('competitionId', '==', competition.id)
      );
      
      const snapshot = await new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(
          submissionsQuery,
          (snap) => {
            unsubscribe();
            resolve(snap);
          },
          reject
        );
      });
      
      // Calculate total points per user
      const userPoints = {};
      snapshot.docs.forEach(doc => {
        const submission = doc.data();
        const userId = submission.userId;
        userPoints[userId] = (userPoints[userId] || 0) + (submission.points || 0);
      });
      
      // Sort users by points to determine rankings
      const sortedRankings = Object.entries(userPoints)
        .sort(([, pointsA], [, pointsB]) => pointsB - pointsA);
      
      if (sortedRankings.length === 0) {
        console.log('No submissions found for competition');
        return { success: false, message: 'No submissions found' };
      }
      
      // Determine winner (highest points)
      const winnerId = sortedRankings[0][0];
      const winnerPoints = sortedRankings[0][1];
      
      // Get all participants except winner
      const participants = competition.participants || [];
      const losers = participants.filter(uid => uid !== winnerId);
      
      console.log(`Winner: ${winnerId} with ${winnerPoints} points`);
      console.log(`Losers: ${losers.length} participants`);
      
      // Update stats using batch write for atomicity
      const batch = writeBatch(db);
      
      // Update winner
      const winnerRef = doc(db, 'users', winnerId);
      batch.update(winnerRef, {
        wins: increment(1),
        lastUpdated: serverTimestamp(),
      });
      
      // Update losers
      losers.forEach(loserId => {
        // Only update if they actually participated (have submissions)
        if (userPoints[loserId] !== undefined) {
          const loserRef = doc(db, 'users', loserId);
          batch.update(loserRef, {
            losses: increment(1),
            lastUpdated: serverTimestamp(),
          });
        }
      });
      
      // Also update the competition with the calculated winner
      const competitionRef = doc(db, 'competitions', competition.id);
      batch.update(competitionRef, {
        winnerId: winnerId,
        winnerPoints: winnerPoints,
        completedAt: serverTimestamp(),
        finalRankings: sortedRankings.map(([userId, points], index) => ({
          userId,
          points,
          position: index + 1
        }))
      });
      
      await batch.commit();
      console.log('Stats updated successfully');
      
      return {
        success: true,
        winnerId,
        winnerPoints,
        totalParticipants: sortedRankings.length
      };
      
    } catch (error) {
      console.error('Error calculating stats:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle completing the competition with stats update
  const handleCompleteCompetition = async () => {
    // Check if competition is already completed
    if (competition.status === 'completed') {
      Alert.alert('Info', 'This competition is already completed');
      return;
    }
    
    // Check if user is the owner
    if (competition.ownerId !== user.uid) {
      Alert.alert('Error', 'Only the competition owner can complete it');
      return;
    }
    
    Alert.alert(
      'Complete Competition',
      'This will finalize the results and update win/loss records. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: async () => {
            setIsCompleting(true);
            try {
              // First calculate and update stats
              const statsResult = await calculateAndUpdateStats();
              
              if (!statsResult.success) {
                if (statsResult.message === 'No submissions found') {
                  Alert.alert('Cannot Complete', 'No submissions found. At least one participant must submit a workout.');
                } else {
                  Alert.alert('Error', statsResult.error || 'Failed to calculate competition results');
                }
                setIsCompleting(false);
                return;
              }
              
              // Update competition status to completed
              await updateDoc(doc(db, 'competitions', competition.id), {
                status: 'completed'
              });
              
              // Get winner's username for the success message
              let winnerName = 'Unknown';
              try {
                const winnerDoc = await getDoc(doc(db, 'users', statsResult.winnerId));
                if (winnerDoc.exists()) {
                  winnerName = winnerDoc.data().username || 'Unknown';
                }
              } catch (error) {
                console.log('Could not fetch winner name:', error);
              }
              
              Alert.alert(
                'Competition Completed!', 
                `Winner: ${winnerName} with ${statsResult.winnerPoints} points!\n\nAll participant stats have been updated.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Error completing competition:', error);
              Alert.alert('Error', 'Failed to complete competition. Please try again.');
            } finally {
              setIsCompleting(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (!competition?.id) {
      stopRefreshing();
      return;
    }

    // Calculate visibility status
    const visibilityStatus = getScoreVisibility(competition);
    setVisibility(visibilityStatus);

    // Listen to submissions for this competition
    const submissionsQuery = query(
      collection(db, 'submissions'),
      where('competitionId', '==', competition.id)
    );

    const unsubscribe = onSnapshot(
      submissionsQuery, 
      async (snapshot) => {
        try {
          // Get all submissions
          const allSubmissions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Filter submissions based on visibility rules, always showing user's own
          const visibleSubmissions = filterVisibleSubmissionsWithSelf(allSubmissions, competition, user.uid);
          
          // Aggregate points by user (only from visible submissions)
          const pointsByUser = {};
          
          visibleSubmissions.forEach(submission => {
            const userId = submission.userId;
            
            if (!pointsByUser[userId]) {
              pointsByUser[userId] = 0;
            }
            pointsByUser[userId] += submission.points || 0;
          });

          // Fetch user data for all participants
          const userDataPromises = competition.participants.map(async (uid) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', uid));
              const userData = userDoc.exists() ? userDoc.data() : {};
              
              return {
                id: uid,
                name: userData.username || 'Unknown User',
                points: pointsByUser[uid] || 0,
                isCurrentUser: uid === user.uid,
              };
            } catch (error) {
              console.error('Error fetching user:', error);
              return {
                id: uid,
                name: 'Unknown User',
                points: pointsByUser[uid] || 0,
                isCurrentUser: uid === user.uid,
              };
            }
          });

          const usersWithPoints = await Promise.all(userDataPromises);
          
          // Sort by points (descending) and assign positions
          const sortedRankings = usersWithPoints
            .sort((a, b) => b.points - a.points)
            .map((user, index) => ({
              ...user,
              position: index + 1,
            }));

          setRankings(sortedRankings);
          setLoading(false);
          stopRefreshing(); // Stop refresh spinner when data loads
        } catch (error) {
          console.error('Error processing leaderboard:', error);
          setLoading(false);
          stopRefreshing();
        }
      },
      (error) => {
        console.error('Error fetching submissions:', error);
        setLoading(false);
        stopRefreshing(); // Stop refresh spinner on error
      }
    );

    return () => {
      unsubscribe();
      // Clear timeout on cleanup
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [competition?.id, competition?.participants, user.uid]);

  // Separate top 3 from the rest
  const topThree = rankings.slice(0, 3);
  const currentUserRanking = rankings.find(r => r.isCurrentUser);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      </View>
    );
  }

  // Reorder top three for podium display: [2nd, 1st, 3rd]
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push(topThree[1]); // 2nd place
  if (topThree[0]) podiumOrder.push(topThree[0]); // 1st place
  if (topThree[2]) podiumOrder.push(topThree[2]); // 3rd place

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Dark Header Block with Trophy */}
      <SafeAreaView style={styles.headerBlock}>
        {/* Trophy Icon */}
        <View style={styles.trophyContainer}>
          <Ionicons name="trophy" size={24} color={colors.brandLime} />
        </View>
        
        {/* Podium Row - Top 3 */}
        {topThree.length > 0 && (
          <View style={styles.podiumRow}>
            {podiumOrder.map((user, index) => {
              if (!user) return <View key={index} style={styles.podiumColumn} />;
              
              const isFirst = user.position === 1;
              const isSecond = user.position === 2;
              const isThird = user.position === 3;
              
              return (
                <View key={user.id} style={styles.podiumColumn}>
                  {/* Avatar with Badge */}
                  <View style={styles.avatarContainer}>
                    <View style={[
                      styles.avatar,
                      isFirst && styles.avatarFirst,
                      (isSecond || isThird) && styles.avatarOthers,
                      { 
                        width: isFirst ? 72 : 60,
                        height: isFirst ? 72 : 60,
                      }
                    ]}>
                      <Ionicons 
                        name="person" 
                        size={isFirst ? 36 : 30} 
                        color={isFirst ? colors.textPrimaryLight : colors.textMuted}
                      />
                    </View>
                    {/* Rank Badge */}
                    <View style={[
                      styles.rankBadge,
                      isFirst && styles.rankBadgeGold,
                      isSecond && styles.rankBadgeSilver,
                      isThird && styles.rankBadgeBronze,
                    ]}>
                      <Text style={styles.rankBadgeText}>{user.position}</Text>
                    </View>
                  </View>
                  
                  {/* Name */}
                  <Text style={[
                    styles.podiumName,
                    isFirst ? styles.podiumNameFirst : styles.podiumNameOthers
                  ]} numberOfLines={1}>
                    {user.name}
                  </Text>
                  
                  {/* Points */}
                  <View style={styles.podiumPointsContainer}>
                    <Ionicons name="star" size={14} color={colors.brandLime} />
                    <Text style={styles.podiumPoints}>{`${user.points.toFixed(0)} pts`}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </SafeAreaView>

      {/* Visibility Status Banner */}
      {visibility && visibility.isInHiddenPeriod && (
        <View style={styles.visibilityBanner}>
          <Ionicons name="eye-off" size={20} color="#FFF" />
          <View style={styles.visibilityTextContainer}>
            <Text style={styles.visibilityText}>
              Current cycle scores hidden • Showing accumulated points through cycle {visibility.currentCycle}
            </Text>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampText}>
                Last updated: {formatRevealDate(getLastRevealDate(competition))}
              </Text>
              <Text style={styles.timestampText}>
                Next reveal: {formatRevealDate(visibility.nextRevealDate)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Show completion status if already completed */}
      {competition.status === 'completed' && (
        <View style={styles.completedBanner}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.completedText}>Competition Completed</Text>
          {competition.winnerId && rankings.length > 0 && (
            <Text style={styles.winnerText}>
              Winner: {rankings.find(r => r.id === competition.winnerId)?.name}
            </Text>
          )}
        </View>
      )}

      {/* Rankings Section */}
      <View style={styles.rankingsSection}>
        <Text style={styles.rankingsTitle}>Rankings</Text>
        
        {/* Highlighted "You" Row */}
        {currentUserRanking && (
          <TouchableOpacity 
            style={styles.youRow}
            activeOpacity={0.8}
          >
            <Text style={styles.youRowRank}>{currentUserRanking.position}</Text>
            <View style={styles.youRowCenter}>
              <View style={styles.youRowAvatar}>
                <Ionicons name="person" size={16} color={colors.brandLime} />
              </View>
              <Text style={styles.youRowName}>You</Text>
            </View>
            <Text style={styles.youRowPoints}>{`${currentUserRanking.points.toFixed(0)} pts`}</Text>
          </TouchableOpacity>
        )}

        {/* Empty State */}
        {rankings.length === 0 && (
          <Text style={styles.emptyText}>No submissions yet. Be the first to earn points!</Text>
        )}
      </View>

      {/* Flexible white space */}
      <View style={{ flex: 1 }} />

      {/* Bottom navigation is handled by the navigator */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  
  // Header Block
  headerBlock: {
    backgroundColor: colors.bgDark,
    minHeight: 212,
    maxHeight: 232,
  },
  trophyContainer: {
    alignItems: 'center',
    marginTop: spacing.base * 2, // 16px from safe area
  },
  
  // Podium
  podiumRow: {
    flexDirection: 'row',
    marginTop: spacing.base * 2.5, // 20px
    paddingBottom: spacing.base * 3,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFirst: {
    backgroundColor: colors.rankGold,
  },
  avatarOthers: {
    backgroundColor: colors.textPrimaryLight,
  },
  rankBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeGold: {
    backgroundColor: colors.rankGold,
  },
  rankBadgeSilver: {
    backgroundColor: colors.rankSilver,
  },
  rankBadgeBronze: {
    backgroundColor: colors.rankBronze,
  },
  rankBadgeText: {
    color: colors.textPrimaryDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  podiumName: {
    marginTop: spacing.base,
    ...typography.bodyM,
  },
  podiumNameFirst: {
    color: colors.textPrimaryLight,
    fontWeight: '600',
  },
  podiumNameOthers: {
    color: colors.textLightGray,
    fontWeight: '500',
  },
  podiumPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  podiumPoints: {
    color: colors.brandLime,
    ...typography.bodyS,
    marginLeft: 2,
  },

  // Rankings Section
  rankingsSection: {
    paddingHorizontal: spacing.base * 3, // 24px
    paddingTop: spacing.base * 2, // 16px
  },
  rankingsTitle: {
    ...typography.h2,
    color: colors.textPrimaryDark,
    marginBottom: spacing.base * 2,
  },
  
  // You Row
  youRow: {
    backgroundColor: colors.brandLime,
    borderRadius: spacing.radiusXL,
    height: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  youRowRank: {
    ...typography.bodyMSemibold,
    color: colors.textPrimaryDark,
    width: 24,
  },
  youRowCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.base * 1.5, // 12px gap
  },
  youRowAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youRowName: {
    ...typography.bodyM,
    color: colors.textPrimaryDark,
    marginLeft: spacing.base * 1.5, // 12px
  },
  youRowPoints: {
    ...typography.bodyMSemibold,
    color: colors.textPrimaryDark,
  },

  // Empty state
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.base * 2.5,
    fontSize: 16,
  },

  // Visibility Banner
  visibilityBanner: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  visibilityTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timestampText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },

  // Completed Banner
  completedBanner: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  completedText: {
    color: '#F57C00',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  winnerText: {
    color: '#F57C00',
    fontSize: 14,
    fontWeight: '500',
    width: '100%',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default LeaderboardScreen;