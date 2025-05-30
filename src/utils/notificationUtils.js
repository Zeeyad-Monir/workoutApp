// utils/notificationUtils.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ─────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────
export const NOTIFICATION_SETTINGS_KEY     = '@notification_settings';
export const COMPETITION_NOTIFICATIONS_KEY = '@competition_notifications';

// ─────────────────────────────────────────────
// Default notification settings
// ─────────────────────────────────────────────
export const DEFAULT_NOTIFICATION_SETTINGS = {
  invitePopups:  true,
  soundAlerts:   true,
  badgeCounters: true,
};

// ─────────────────────────────────────────────
// Foreground-notification behaviour
// ─────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  await getNotificationSetting('invitePopups'),
    shouldPlaySound:  await getNotificationSetting('soundAlerts'),
    shouldSetBadge:   await getNotificationSetting('badgeCounters'),
  }),
});

// ─────────────────────────────────────────────
// 1 ► Register for push notifications
// ─────────────────────────────────────────────
export async function registerForPushNotificationsAsync() {
  let token;

  // Android channel (high importance)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:              'default',
      importance:        Notifications.AndroidImportance.MAX,
      vibrationPattern:  [0, 250, 250, 250],
      lightColor:        '#A4D65E',
    });
  }

  // Must be a physical device
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push-notification permission not granted');
      return null;
    }

    // ✅ No projectId param — works fine in Expo Go
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('📲 Expo Push Token:', token);
  } else {
    console.log('❌ Must use physical device for Push Notifications');
  }

  return token;
}

// ─────────────────────────────────────────────
// 2 ► Save push token in Firestore & AsyncStorage
// ─────────────────────────────────────────────
export async function savePushTokenToProfile(userId, token) {
  if (!userId || !token) return;

  try {
    const userRef = doc(db, 'users', userId);
    const snap    = await getDoc(userRef);

    if (snap.exists()) {
      await updateDoc(userRef, {
        pushToken:            token,
        notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      });
    } else {
      await setDoc(
        userRef,
        {
          pushToken:            token,
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
        },
        { merge: true }
      );
    }

    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS)
    );
  } catch (err) {
    console.error('Error saving push token:', err);
  }
}

// ─────────────────────────────────────────────
// 3 ► Read a single setting from storage
// ─────────────────────────────────────────────
export async function getNotificationSetting(setting) {
  try {
    const json = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (json) {
      const obj = JSON.parse(json);
      return obj[setting] ?? DEFAULT_NOTIFICATION_SETTINGS[setting];
    }
    return DEFAULT_NOTIFICATION_SETTINGS[setting];
  } catch (err) {
    console.error('Error reading setting:', err);
    return DEFAULT_NOTIFICATION_SETTINGS[setting];
  }
}

// ─────────────────────────────────────────────
// 4 ► Update settings locally + Firestore
// ─────────────────────────────────────────────
export async function updateNotificationSettings(userId, settings) {
  try {
    const currentJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    const current     = currentJson ? JSON.parse(currentJson) : DEFAULT_NOTIFICATION_SETTINGS;

    const merged = { ...current, ...settings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(merged));

    if (userId) {
      await updateDoc(doc(db, 'users', userId), { notificationSettings: merged });
    }

    return merged;
  } catch (err) {
    console.error('Error updating settings:', err);
    return null;
  }
}

// ─────────────────────────────────────────────
// 5 ► Enable / disable competition-specific notifications
// ─────────────────────────────────────────────
export async function toggleCompetitionNotifications(userId, competitionId, enabled) {
  try {
    // local
    const json = await AsyncStorage.getItem(COMPETITION_NOTIFICATIONS_KEY);
    const map  = json ? JSON.parse(json) : {};
    map[competitionId] = enabled;
    await AsyncStorage.setItem(COMPETITION_NOTIFICATIONS_KEY, JSON.stringify(map));

    // Firestore
    if (userId) {
      const userRef  = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const server   = userSnap.exists() ? userSnap.data().competitionNotifications || {} : {};

      await updateDoc(userRef, {
        competitionNotifications: { ...server, [competitionId]: enabled },
      });
    }

    return true;
  } catch (err) {
    console.error('Error toggling competition notifications:', err);
    return false;
  }
}

// ─────────────────────────────────────────────
// 6 ► Check whether a competition is enabled
// ─────────────────────────────────────────────
export async function isCompetitionNotificationsEnabled(competitionId) {
  try {
    const json = await AsyncStorage.getItem(COMPETITION_NOTIFICATIONS_KEY);
    if (json) {
      const map = JSON.parse(json);
      return map[competitionId] ?? false;
    }
    return false;
  } catch (err) {
    console.error('Error reading competition flag:', err);
    return false;
  }
}

// ─────────────────────────────────────────────
// 7 ► Fire an immediate local notification
// ─────────────────────────────────────────────
export async function sendLocalNotification({ title, body, data = {} }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null, // fire now
    });
    return true;
  } catch (err) {
    console.error('Error sending local notification:', err);
    return false;
  }
}