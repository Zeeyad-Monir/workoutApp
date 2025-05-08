// AppNavigator.js – bottom‑tab navigation with bigger bar + embedded “+” button
// -----------------------------------------------------------------------------
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
  ProfileScreen,
} from '../screens';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ------------------------- Stacks -------------------------------------------
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ActiveCompetitions" component={ActiveCompetitionsScreen} />
    <Stack.Screen name="CompetitionDetails" component={CompetitionDetailsScreen} />
    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
    <Stack.Screen name="SubmissionForm" component={SubmissionFormScreen} />
  </Stack.Navigator>
);

const CreateStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CompetitionCreation" component={CompetitionCreationScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

// ---------------------- Main navigator -------------------------------------
const AppNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}
  >
    {/* Home */}
    <Tab.Screen
      name="HomeStack"
      component={HomeStack}
      options={{
        tabBarIcon: ({ focused }) => (
          <Ionicons
            name="home"
            size={30}
            color={focused ? '#A4D65E' : '#777777'}
          />
        ),
      }}
    />

    {/* Create / centre “+” */}
    <Tab.Screen
      name="CreateStack"
      component={CreateStack}
      options={{
        tabBarIcon: () => (
          <View style={styles.addButtonContainer}>
            <View style={styles.addButton}>
              <Ionicons name="add" size={34} color="#FFFFFF" />
            </View>
          </View>
        ),
      }}
    />

    {/* Profile */}
    <Tab.Screen
      name="ProfileStack"
      component={ProfileStack}
      options={{
        tabBarIcon: ({ focused }) => (
          <Ionicons
            name="person"
            size={30}
            color={focused ? '#A4D65E' : '#777777'}
          />
        ),
      }}
    />
  </Tab.Navigator>
);

// --------------------------- Styles ----------------------------------------
const styles = StyleSheet.create({
  tabBar: {
    height: 90,              // bigger bar
    backgroundColor: '#192126', // solid black to match header
    borderTopWidth: 0,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  addButton: {
    backgroundColor: '#A4D65E',
    width: 45,
    height: 45,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: -5, // centres inside 90‑px bar
  },
});

export default AppNavigator;
