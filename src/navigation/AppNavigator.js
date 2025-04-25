import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import {
  ActiveCompetitionsScreen,
  CompetitionCreationScreen,
  CompetitionDetailsScreen,
  LeaderboardScreen,
  SubmissionFormScreen,
  ProfileScreen
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ActiveCompetitions" component={ActiveCompetitionsScreen} />
    <Stack.Screen name="CompetitionDetails" component={CompetitionDetailsScreen} />
    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
    <Stack.Screen name="SubmissionForm" component={SubmissionFormScreen} />
  </Stack.Navigator>
);

// Create Stack
const CreateStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CompetitionCreation" component={CompetitionCreationScreen} />
  </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeStack"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name="home" 
              size={24} 
              color={focused ? '#A4D65E' : '#777777'} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="CreateStack"
        component={CreateStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.addButtonContainer}>
              <View style={styles.addButton}>
                <Ionicons 
                  name="add" 
                  size={24} 
                  color="#FFFFFF" 
                />
              </View>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name="person" 
              size={24} 
              color={focused ? '#A4D65E' : '#777777'} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    backgroundColor: '#1A1E23',
    borderTopWidth: 0,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  addButton: {
    backgroundColor: '#A4D65E',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 5,
    borderColor: '#1A1E23',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 20,
  },
});

export default AppNavigator;
