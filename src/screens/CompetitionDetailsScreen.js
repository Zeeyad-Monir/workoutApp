import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Header, Button } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

const CompetitionDetailsScreen = ({ route, navigation }) => {
  const [activeTab, setActiveTab] = useState('all');
  const { competition } = route.params;
  const { user } = useContext(AuthContext);
  
  const [workouts, setWorkouts] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  // Reset to 'all' tab when returning from submission
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reset to 'all' tab when screen comes into focus
      setActiveTab('all');
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!competition?.id) return;

    // Fetch user data for all participants
    const fetchUsers = async () => {
      const userMap = {};
      for (const uid of competition.participants || []) {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            userMap[uid] = userDoc.data();
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      }
      setUsers(userMap);
    };

    fetchUsers();

    // Listen to submissions for this competition
    const submissionsQuery = query(
      collection(db, 'submissions'),
      where('competitionId', '==', competition.id)
      // Temporarily removed orderBy until index is created
      // orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(submissionsQuery, (snapshot) => {
      const submissionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Mark as notification if it's a new submission from someone else
        isNotification: doc.data().userId !== user.uid && 
                       doc.data().createdAt?.toDate() > new Date(Date.now() - 3600000) // Last hour
      }));
      setWorkouts(submissionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [competition?.id, user.uid]);

  const formatWorkoutDisplay = (workout) => {
    const userName = users[workout.userId]?.username || 'Unknown User';
    const activityDisplay = `${workout.distance || workout.duration} ${workout.unit} ${workout.activityType}`;
    
    return {
      ...workout,
      userName,
      activityDisplay,
    };
  };

  return (
    <View style={styles.container}>
      <Header 
        title={competition.name} 
        showBackButton={true} 
        onBackPress={() => navigation.goBack()}
      />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]} 
          onPress={() => {
            setActiveTab('leaderboard');
            navigation.navigate('Leaderboard', { competition });
          }}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Leaderboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'add' && styles.activeTab]} 
          onPress={() => {
            navigation.navigate('SubmissionForm', { competition });
          }}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>Add</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.workoutsContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Loading workouts...</Text>
        ) : workouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts yet. Be the first to add one!</Text>
        ) : (
          workouts.map(workout => {
            const formatted = formatWorkoutDisplay(workout);
            return (
              <TouchableOpacity key={workout.id} style={styles.workoutCard}>
                <View style={styles.cardBackground}>
                  <Ionicons name="fitness" size={60} color="rgba(255,255,255,0.2)" style={styles.backgroundIcon} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutType}>{formatted.activityDisplay}</Text>
                    <View style={styles.workoutDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailIcon}>•</Text>
                        <Text style={styles.detailText}>{workout.duration} Minutes</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailIcon}>♦</Text>
                        <Text style={styles.detailText}>{workout.calories} Kcal</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailIcon}>★</Text>
                        <Text style={styles.detailText}>{workout.points} Points</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.userLabel}>
                    <Text style={styles.userLabelText}>{formatted.userName}'s Workout</Text>
                  </View>
                  {workout.isNotification && (
                    <View style={styles.notificationIcon}>
                      <Text style={styles.notificationText}>!</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 25,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#1A1E23',
  },
  tabText: {
    color: '#777',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#A4D65E',
  },
  workoutsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
  workoutCard: {
    height: 120,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#333',
    position: 'relative',
  },
  cardBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  backgroundIcon: {
    position: 'absolute',
    right: 10,
    bottom: 10,
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  workoutInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  workoutType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A4D65E',
    marginBottom: 10,
  },
  workoutDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  detailIcon: {
    fontSize: 16,
    color: 'white',
    marginRight: 5,
  },
  detailText: {
    fontSize: 14,
    color: 'white',
  },
  userLabel: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#A4D65E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  userLabelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1A1E23',
  },
  notificationIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A4D65E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1E23',
  },
});

export default CompetitionDetailsScreen;