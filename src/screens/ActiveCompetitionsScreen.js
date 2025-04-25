import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Header, Button } from '../components';
import { Ionicons } from '@expo/vector-icons';

const ActiveCompetitionsScreen = ({ navigation }) => {
  const competitions = [
    { id: 1, name: "Bryce's comp" },
    { id: 2, name: "Zeeyad's comp" },
    { id: 3, name: "Noah's comp" },
    { id: 4, name: "Joe's comp" }
  ];

  return (
    <View style={styles.container}>
      <Header title="Active Competitions" showProfileIcon={true} />
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="name of competition"
          placeholderTextColor="#999"
        />
      </View>
      
      <ScrollView style={styles.competitionsContainer}>
        {competitions.map(competition => (
          <TouchableOpacity
            key={competition.id}
            style={styles.competitionCard}
            onPress={() => navigation.navigate('CompetitionDetails', { competition })}
          >
            <View style={styles.cardBackground}>
              <Ionicons name="fitness" size={80} color="rgba(255,255,255,0.2)" style={styles.backgroundIcon} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.competitionName}>{competition.name}</Text>
              <View style={styles.seeMoreContainer}>
                <Text style={styles.seeMoreText}>See more</Text>
                <Text style={styles.seeMoreArrow}>›</Text>
              </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEEEE',
    borderRadius: 25,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  competitionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  competitionCard: {
    height: 150,
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
    padding: 20,
    justifyContent: 'space-between',
  },
  competitionName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  seeMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeMoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A4D65E',
  },
  seeMoreArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#A4D65E',
    marginLeft: 5,
  },
});

export default ActiveCompetitionsScreen;
