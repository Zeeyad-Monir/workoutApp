import React, { useEffect, useRef } from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler for when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  // Reference to notification listener
  const notificationListener = useRef();
  const responseListener = useRef();

  // Set up notification listeners
  useEffect(() => {
    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      // Here you can handle navigation based on notification data
      // For example: navigation.navigate('CompetitionDetails', { id: response.notification.request.content.data.competitionId });
    });

    // Clean up listeners on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}

function Root() {
  const { user } = React.useContext(AuthContext);
  return user ? <AppNavigator /> : <AuthNavigator />;
}
