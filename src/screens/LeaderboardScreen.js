import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Header, Button } from '../components';
import { Ionicons } from '@expo/vector-icons';

const LeaderboardScreen = ({ navigation }) => {
  const topUsers = [
    { id: 2, name: 'Noah', points: 40, position: 2 },
    { id: 1, name: 'Zeeyad', points: 43, position: 1 },
    { id: 3, name: 'Bryce', points: 38, position: 3 },
  ];
  
  const rankings = [
    { id: 4, name: 'Marsha Fisher', points: 36, position: 4 },
    { id: 5, name: 'Juanita Cormier', points: 35, position: 5 },
    { id: 6, name: 'You', points: 34, position: 6, isCurrentUser: true },
    { id: 7, name: 'Tamara Schmidt', points: 33, position: 7 },
    { id: 8, name: 'Ricardo Veum', points: 32, position: 8 },
    { id: 9, name: 'Gary Sanford', points: 31, position: 9 },
    { id: 10, name: 'Becky Bartell', points: 30, position: 10 },
  ];

  return (
    <View style={styles.container}>
      <Header 
        title="Leaderboard" 
        showBackButton={true} 
        onBackPress={() => navigation.goBack()}
      />
      
      <View style={styles.podiumContainer}>
        <View style={styles.podiumIcon}>
          <Ionicons name="trophy" size={40} color="#A4D65E" />
        </View>
        
        <View style={styles.topThreeContainer}>
          {topUsers.sort((a, b) => a.position - b.position).map(user => (
            <View 
              key={user.id} 
              style={[
                styles.topUserContainer, 
                user.position === 1 && styles.firstPlaceContainer,
                user.position === 2 && styles.secondPlaceContainer,
                user.position === 3 && styles.thirdPlaceContainer,
              ]}
            >
              <View style={styles.userImageContainer}>
                <Ionicons 
                  name="person-circle" 
                  size={user.position === 1 ? 70 : 60} 
                  color={user.position === 1 ? "#FFD700" : "#FFFFFF"} 
                />
                {user.position === 1 && (
                  <View style={styles.crownContainer}>
                    <Ionicons name="crown" size={20} color="#FFD700" />
                  </View>
                )}
                <View style={[
                  styles.positionBadge,
                  user.position === 1 && styles.firstPlaceBadge,
                  user.position === 2 && styles.secondPlaceBadge,
                  user.position === 3 && styles.thirdPlaceBadge,
                ]}>
                  <Text style={styles.positionText}>{user.position}</Text>
                </View>
              </View>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={styles.pointsContainer}>
                <Ionicons name="star" size={14} color="#A4D65E" />
                <Text style={styles.pointsText}>{user.points} pts</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.rankingsContainer}>
        <Text style={styles.rankingsTitle}>Rankings</Text>
        <ScrollView style={styles.rankingsList}>
          {rankings.map(user => (
            <View 
              key={user.id} 
              style={[
                styles.rankingItem, 
                user.isCurrentUser && styles.currentUserRanking
              ]}
            >
              <Text style={styles.rankingPosition}>{user.position}</Text>
              <View style={styles.rankingUserImageContainer}>
                <Ionicons name="person-circle" size={36} color="#777" />
              </View>
              <Text style={[
                styles.rankingUserName,
                user.isCurrentUser && styles.currentUserText
              ]}>
                {user.name}
              </Text>
              <Text style={[
                styles.rankingPoints,
                user.isCurrentUser && styles.currentUserText
              ]}>
                {user.points} pts
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  podiumContainer: {
    backgroundColor: '#1A1E23',
    paddingVertical: 20,
    alignItems: 'center',
  },
  podiumIcon: {
    marginBottom: 10,
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: 20,
  },
  topUserContainer: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  firstPlaceContainer: {
    marginBottom: 0,
    flex: 1.2,
  },
  secondPlaceContainer: {
    marginBottom: 15,
    flex: 1,
  },
  thirdPlaceContainer: {
    marginBottom: 25,
    flex: 1,
  },
  userImageContainer: {
    position: 'relative',
    marginBottom: 5,
  },
  crownContainer: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
  },
  positionBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A4D65E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  firstPlaceBadge: {
    backgroundColor: '#FFD700',
  },
  secondPlaceBadge: {
    backgroundColor: '#C0C0C0',
  },
  thirdPlaceBadge: {
    backgroundColor: '#CD7F32',
  },
  positionText: {
    color: '#1A1E23',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsText: {
    color: '#A4D65E',
    fontSize: 14,
    marginLeft: 4,
  },
  rankingsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  rankingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1E23',
    marginBottom: 15,
  },
  rankingsList: {
    flex: 1,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  currentUserRanking: {
    backgroundColor: '#A4D65E',
  },
  rankingPosition: {
    width: 30,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1E23',
  },
  rankingUserImageContainer: {
    marginRight: 12,
  },
  rankingUserName: {
    flex: 1,
    fontSize: 16,
    color: '#1A1E23',
  },
  rankingPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1E23',
  },
  currentUserText: {
    color: '#1A1E23',
  },
});

export default LeaderboardScreen;
