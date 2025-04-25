import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Header, Button } from '../components';
import { Ionicons } from '@expo/vector-icons';

const CompetitionDetailsScreen = ({ route, navigation }) => {
  const [activeTab, setActiveTab] = useState('all');
  const { competition } = route.params || { name: "Bryce's Competition" };
  
  const workouts = [
    { 
      id: 1, 
      userName: "Zeeyad", 
      activityType: "5K Run", 
      duration: 30, 
      calories: 300, 
      points: 3,
      isNotification: true
    },
    { 
      id: 2, 
      userName: "Bryce", 
      activityType: "3K Run", 
      duration: 20, 
      calories: 200, 
      points: 2,
      isNotification: false
    },
    { 
      id: 3, 
      userName: "Noah", 
      activityType: "10K Run", 
      duration: 60, 
      calories: 600, 
      points: 6,
      isNotification: false
    }
  ];

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
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Leaderboard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'add' && styles.activeTab]} 
          onPress={() => navigation.navigate('SubmissionForm')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>Add</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.workoutsContainer}>
        {workouts.map(workout => (
          <TouchableOpacity key={workout.id} style={styles.workoutCard}>
            <View style={styles.cardBackground}>
              <Ionicons name="fitness" size={60} color="rgba(255,255,255,0.2)" style={styles.backgroundIcon} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutType}>{workout.activityType}</Text>
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
                    <Text style={styles.detailIcon}>♦</Text>
                    <Text style={styles.detailText}>{workout.points} Points</Text>
                  </View>
                </View>
              </View>
              <View style={styles.userLabel}>
                <Text style={styles.userLabelText}>{workout.userName}'s Workout</Text>
              </View>
              {workout.isNotification && (
                <View style={styles.notificationIcon}>
                  <Text style={styles.notificationText}>!</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
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
