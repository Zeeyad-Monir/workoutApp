import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { doc, updateDoc, getDoc, addDoc, collection } from 'firebase/firestore';

class NotificationService {
  constructor() {
    this.fcmToken = null;
    this.isInitialized = false;
    this.unsubscribeForeground = null;
  }

  async initialize() {
    try {
      await this.requestPermission();
      await this.getFCMToken();
      this.setupBackgroundHandler();
      this.setupForegroundHandler();
      this.setupTokenRefresh();
      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    } else {
      console.log('Permission denied');
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in your device settings to receive friend requests.',
        [{ text: 'OK' }]
      );
    }
  }

  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('FCM Token:', token);
      
      // Store token locally
      await AsyncStorage.setItem('fcmToken', token);
      
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async updateUserToken(userId) {
    if (!this.fcmToken || !userId) return;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: this.fcmToken,
        lastTokenUpdate: new Date()
      });
      console.log('FCM token updated for user:', userId);
    } catch (error) {
      console.error('Error updating user token:', error);
    }
  }

  setupBackgroundHandler() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });
  }

  setupForegroundHandler() {
    // Handle foreground messages
    this.unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', remoteMessage);
      
      // Show alert when app is in foreground
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'Notification',
          remoteMessage.notification.body || 'You have a new notification',
          [{ text: 'OK' }]
        );
      }
    });
  }

  setupTokenRefresh() {
    // Handle token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed:', token);
      this.fcmToken = token;
      await AsyncStorage.setItem('fcmToken', token);
    });
  }

  async sendFriendInviteNotification(recipientUserId, senderUsername) {
    try {
      // Instead of sending directly, we'll create a notification request
      // that can be processed by a server or cloud function
      const notificationRequest = {
        type: 'friend_invite',
        recipientUserId: recipientUserId,
        senderUsername: senderUsername,
        message: `${senderUsername} has sent you a friend invite on Comp Fit!`,
        timestamp: new Date(),
        processed: false
      };

      // Store notification request in Firestore
      // This can be picked up by a cloud function or server
      await addDoc(collection(db, 'notificationRequests'), notificationRequest);
      
      console.log('Friend invite notification request created');
    } catch (error) {
      console.error('Error creating friend invite notification request:', error);
    }
  }

  cleanup() {
    if (this.unsubscribeForeground) {
      this.unsubscribeForeground();
    }
  }
}

export default new NotificationService();