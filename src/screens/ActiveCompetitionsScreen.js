// src/screens/ActiveCompetitionsScreen.js
import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header, Button } from '../components';
import { Ionicons } from '@expo/vector-icons';

import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  or,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

export default function ActiveCompetitionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  /* ---------------- live Firestore data ---------------- */
  const [activeCompetitions, setActiveCompetitions] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [removedCompetitions, setRemovedCompetitions] = useState(new Set()); // Track locally removed competitions
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTimeout, setRefreshTimeout] = useState(null);

  /* ---------------- refresh handler -------------------- */
  const onRefresh = () => {
    setRefreshing(true);
    // Clear removed competitions cache on refresh
    setRemovedCompetitions(new Set());
    
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

  useEffect(() => {
    if (!user) {
      stopRefreshing();
      return;
    }

    // Active competitions where user is owner OR is in participants array
    const activeQuery = query(
      collection(db, 'competitions'),
      or(
        where('ownerId', '==', user.uid),
        where('participants', 'array-contains', user.uid)
      )
    );

    // Pending invitations where user is in pendingParticipants array
    const pendingQuery = query(
      collection(db, 'competitions'),
      where('pendingParticipants', 'array-contains', user.uid)
    );

    const activeUnsub = onSnapshot(
      activeQuery, 
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          // Filter out competitions where user is not in participants (unless they're the owner)
          .filter(comp => comp.ownerId === user.uid || comp.participants?.includes(user.uid))
          // Also filter out locally removed competitions
          .filter(comp => !removedCompetitions.has(comp.id));
        setActiveCompetitions(data);
        setLoading(false);
        stopRefreshing(); // Stop refresh spinner when data loads
      },
      (error) => {
        console.error('Error fetching active competitions:', error);
        setLoading(false);
        stopRefreshing(); // Stop refresh spinner on error
      }
    );

    const pendingUnsub = onSnapshot(
      pendingQuery, 
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPendingInvitations(data);
      },
      (error) => {
        console.error('Error fetching pending invitations:', error);
      }
    );

    return () => {
      activeUnsub();
      pendingUnsub();
      // Clear timeout on cleanup
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [user, removedCompetitions]); // Add removedCompetitions to dependency array

  /* ---------------- competition status helpers ---------- */
  const isCompetitionCompleted = (competition) => {
    const now = new Date();
    const endDate = new Date(competition.endDate);
    return now > endDate;
  };

  const isCompetitionActive = (competition) => {
    const now = new Date();
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);
    return now >= startDate && now <= endDate;
  };

  const isCompetitionUpcoming = (competition) => {
    const now = new Date();
    const startDate = new Date(competition.startDate);
    return now < startDate;
  };

  const getCompetitionStatus = (competition) => {
    if (isCompetitionCompleted(competition)) return 'completed';
    if (isCompetitionActive(competition)) return 'active';
    if (isCompetitionUpcoming(competition)) return 'upcoming';
    return 'unknown';
  };

  const getCompetitionStatusText = (competition) => {
    const status = getCompetitionStatus(competition);
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'upcoming':
        return 'Starting Soon';
      default:
        return '';
    }
  };

  const getTimeRemaining = (competition) => {
    const now = new Date();
    const endDate = new Date(competition.endDate);
    const startDate = new Date(competition.startDate);
    
    if (isCompetitionCompleted(competition)) {
      return 'Completed';
    }
    
    if (isCompetitionUpcoming(competition)) {
      const diff = startDate - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return `Starts in ${days} day${days !== 1 ? 's' : ''}`;
    }
    
    if (isCompetitionActive(competition)) {
      const diff = endDate - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''} left`;
      } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''} left`;
      } else {
        return 'Ending soon';
      }
    }
    
    return '';
  };

  /* ---------------- search filter ---------------------- */
  const [queryText, setQueryText] = useState('');

  const filteredActive = useMemo(
    () =>
      activeCompetitions.filter(c =>
        c.name?.toLowerCase().includes(queryText.toLowerCase().trim()) &&
        !isCompetitionCompleted(c)
      ),
    [queryText, activeCompetitions]
  );

  const filteredCompleted = useMemo(
    () =>
      activeCompetitions.filter(c =>
        c.name?.toLowerCase().includes(queryText.toLowerCase().trim()) &&
        isCompetitionCompleted(c)
      ),
    [queryText, activeCompetitions]
  );

  const filteredPending = useMemo(
    () =>
      pendingInvitations.filter(c =>
        c.name?.toLowerCase().includes(queryText.toLowerCase().trim())
      ),
    [queryText, pendingInvitations]
  );

  /* ---------------- invitation handlers ---------------- */
  const handleAcceptInvite = async (competitionId) => {
    try {
      const compRef = doc(db, 'competitions', competitionId);
      await updateDoc(compRef, {
        participants: arrayUnion(user.uid),
        pendingParticipants: arrayRemove(user.uid),
      });
      Alert.alert('Success', 'You have joined the competition!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept invitation');
      console.error(error);
    }
  };

  const handleDeclineInvite = async (competitionId) => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const compRef = doc(db, 'competitions', competitionId);
              await updateDoc(compRef, {
                pendingParticipants: arrayRemove(user.uid),
              });
              Alert.alert('Success', 'Invitation declined');
            } catch (error) {
              Alert.alert('Error', 'Failed to decline invitation');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  /* ---------------- delete competition handler ---------- */
  const handleDeleteCompetition = (competition) => {
    Alert.alert(
      'Leave Competition',
      `Are you sure you want to leave "${competition.name}"? This will delete all your submissions and remove you from the leaderboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              // Immediately remove from local state for instant UI update
              setRemovedCompetitions(prev => new Set([...prev, competition.id]));
              
              // Step 1: Delete all user's submissions for this competition
              const submissionsQuery = query(
                collection(db, 'submissions'),
                where('competitionId', '==', competition.id),
                where('userId', '==', user.uid)
              );
              
              const submissionsSnapshot = await getDocs(submissionsQuery);
              const deletePromises = submissionsSnapshot.docs.map(doc => 
                deleteDoc(doc.ref)
              );
              await Promise.all(deletePromises);
              
              // Step 2: Remove user from competition participants
              const compRef = doc(db, 'competitions', competition.id);
              await updateDoc(compRef, {
                participants: arrayRemove(user.uid),
              });
              
              Alert.alert('Success', `You have left "${competition.name}" and all your submissions have been deleted.`);
            } catch (error) {
              // If there's an error, restore the competition to the UI
              setRemovedCompetitions(prev => {
                const newSet = new Set(prev);
                newSet.delete(competition.id);
                return newSet;
              });
              Alert.alert('Error', 'Failed to leave competition. Please try again.');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  /* ---------------- leave competition handler (for completed competitions) ---------- */
  const handleLeaveCompetition = (competition) => {
    Alert.alert(
      'Remove Competition',
      'Are you sure you want to remove this completed competition from your list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Immediately remove from local state for instant UI update
              setRemovedCompetitions(prev => new Set([...prev, competition.id]));
              
              const compRef = doc(db, 'competitions', competition.id);
              
              // Handle both owner and participant cases
              if (competition.ownerId === user.uid) {
                // If user is the owner, remove them from both owner and participants
                await updateDoc(compRef, {
                  participants: arrayRemove(user.uid),
                  ownerId: null, // Or you could transfer ownership, but for now we'll just remove them
                });
              } else {
                // If user is just a participant, remove them from participants
                await updateDoc(compRef, {
                  participants: arrayRemove(user.uid),
                });
              }
              
              Alert.alert('Success', 'Competition removed from your list');
            } catch (error) {
              // If there's an error, restore the competition to the UI
              setRemovedCompetitions(prev => {
                const newSet = new Set(prev);
                newSet.delete(competition.id);
                return newSet;
              });
              Alert.alert('Error', 'Failed to remove competition');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  /* ---------------- navigation handlers ---------------- */
  const handleCompetitionPress = (competition) => {
    const status = getCompetitionStatus(competition);
    
    if (status === 'completed') {
      // Navigate directly to leaderboard for completed competitions
      navigation.navigate('Leaderboard', { competition });
    } else {
      // Navigate to competition details for active/upcoming competitions
      navigation.navigate('CompetitionDetails', { competition });
    }
  };

  return (
    <>
      {/* Paint the status‑bar / notch area solid black */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#192126' }}>
        <StatusBar style="light" translucent={false} />
      </SafeAreaView>

      {/* Main content */}
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.root}>
        <Header title="Active Competitions" showProfileIcon />

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="name of competition"
            placeholderTextColor="#999"
            value={queryText}
            onChangeText={setQueryText}
            returnKeyType="search"
          />
        </View>

        {/* Card list */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#A4D65E']} // Android
              tintColor="#A4D65E" // iOS
            />
          }
        >
          {loading && (
            <Text style={styles.loadingText}>Loading competitions…</Text>
          )}

          {/* Pending Invitations Section */}
          {filteredPending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Pending Invitations</Text>
              {filteredPending.map(comp => (
                <View key={comp.id} style={styles.inviteCard}>
                  <Ionicons
                    name="mail"
                    size={90}
                    color="rgba(255,255,255,0.08)"
                    style={styles.bgIcon}
                  />

                  <View style={styles.inviteContent}>
                    <Text style={styles.cardTitle}>{comp.name}</Text>
                    <Text style={styles.inviteText}>You've been invited to join!</Text>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity
                        style={[styles.inviteButton, styles.acceptButton]}
                        onPress={() => handleAcceptInvite(comp.id)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inviteButton, styles.declineButton]}
                        onPress={() => handleDeclineInvite(comp.id)}
                      >
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Active Competitions Section */}
          {filteredActive.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Active Competitions</Text>
              {filteredActive.map(comp => {
                const status = getCompetitionStatus(comp);
                
                return (
                  <TouchableOpacity
                    key={comp.id}
                    style={styles.card}
                    activeOpacity={0.85}
                    onPress={() => handleCompetitionPress(comp)}
                  >
                    <Ionicons
                      name="fitness"
                      size={90}
                      color="rgba(255,255,255,0.08)"
                      style={styles.bgIcon}
                    />

                    {/* Delete Competition Button */}
                    <TouchableOpacity
                      style={styles.deleteCompetitionButton}
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent card press
                        handleDeleteCompetition(comp);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash" size={16} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>
                          {comp.name}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          status === 'active' && styles.activeBadge,
                          status === 'upcoming' && styles.upcomingBadge,
                        ]}>
                          <Text style={styles.statusText}>
                            {getCompetitionStatusText(comp)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.timeRemainingText}>
                        {getTimeRemaining(comp)}
                      </Text>

                      <View style={styles.seeMoreRow}>
                        <Text style={styles.seeMoreText}>See more</Text>
                        <Text style={styles.seeMoreArrow}>›</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Completed Competitions Section */}
          {filteredCompleted.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Completed Competitions</Text>
              {filteredCompleted.map(comp => {
                return (
                  <TouchableOpacity
                    key={comp.id}
                    style={[styles.card, styles.completedCard]}
                    activeOpacity={0.85}
                    onPress={() => handleCompetitionPress(comp)}
                  >
                    <Ionicons
                      name="trophy"
                      size={90}
                      color="rgba(255,255,255,0.08)"
                      style={styles.bgIcon}
                    />

                    {/* Remove Competition Button (for completed competitions) */}
                    <TouchableOpacity
                      style={styles.removeCompetitionButton}
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent card press
                        handleLeaveCompetition(comp);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>

                    {/* Delete Competition Button (also for completed competitions) */}
                    <TouchableOpacity
                      style={styles.deleteCompetitionButton}
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent card press
                        handleDeleteCompetition(comp);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash" size={16} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, styles.completedCardTitle]}>
                          {comp.name}
                        </Text>
                        <View style={[styles.statusBadge, styles.completedBadge]}>
                          <Text style={[styles.statusText, styles.completedStatusText]}>
                            Completed
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.timeRemainingText, styles.completedTimeText]}>
                        {getTimeRemaining(comp)}
                      </Text>

                      <View style={styles.viewResultsContainer}>
                        <Button
                          title="View Results"
                          style={styles.viewResultsButton}
                          textStyle={styles.viewResultsButtonText}
                          onPress={() => navigation.navigate('Leaderboard', { competition: comp })}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {!loading && filteredActive.length === 0 && filteredCompleted.length === 0 && filteredPending.length === 0 && (
            <Text style={styles.loadingText}>
              No competitions yet — create one or wait for an invite!
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

/* ───────────── styles ───────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F8F8' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAEAEA',
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },

  scroll: { flex: 1, paddingHorizontal: 16 },

  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1E23',
    marginBottom: 16,
    marginTop: 8,
  },

  card: {
    backgroundColor: '#262626',
    borderRadius: 16,
    minHeight: 180,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },

  completedCard: {
    backgroundColor: '#2A4A2A',
    borderWidth: 2,
    borderColor: '#A4D65E',
  },

  inviteCard: {
    backgroundColor: '#A4D65E',
    borderRadius: 16,
    minHeight: 160,
    marginBottom: 24,
    overflow: 'hidden',
  },

  bgIcon: { position: 'absolute', right: 12, bottom: 12 },

  cardContent: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'space-between' 
  },
  
  inviteContent: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'space-between' 
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  cardTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },

  completedCardTitle: {
    color: '#A4D65E',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  completedBadge: {
    backgroundColor: '#A4D65E',
  },

  activeBadge: {
    backgroundColor: '#4CAF50',
  },

  upcomingBadge: {
    backgroundColor: '#FF9800',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  completedStatusText: {
    color: '#1A1E23',
  },

  timeRemainingText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
  },

  completedTimeText: {
    color: '#A4D65E',
  },

  viewResultsContainer: {
    alignItems: 'center',
    marginTop: 8,
  },

  viewResultsButton: {
    backgroundColor: '#A4D65E',
    paddingHorizontal: 24,
    paddingVertical: 8,
    minWidth: 120,
  },

  viewResultsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  removeCompetitionButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },

  deleteCompetitionButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  inviteText: { 
    fontSize: 16, 
    color: '#1A1E23', 
    marginTop: 8,
    marginBottom: 16,
  },

  inviteActions: {
    flexDirection: 'row',
    gap: 12,
  },

  inviteButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },

  acceptButton: {
    backgroundColor: '#1A1E23',
  },

  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1A1E23',
  },

  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  declineButtonText: {
    color: '#1A1E23',
    fontWeight: '600',
    fontSize: 16,
  },

  seeMoreRow: { flexDirection: 'row', alignItems: 'center' },
  seeMoreText: { fontSize: 16, fontWeight: '700', color: '#A4D65E' },
  seeMoreArrow: { fontSize: 20, fontWeight: '700', color: '#A4D65E', marginLeft: 4 },
});