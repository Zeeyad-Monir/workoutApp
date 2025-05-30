import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isCompetitionNotificationsEnabled, toggleCompetitionNotifications } from '../utils/notificationUtils';

const NotificationBellToggle = ({ competitionId, userId }) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load notification status on mount
  useEffect(() => {
    const loadNotificationStatus = async () => {
      try {
        const isEnabled = await isCompetitionNotificationsEnabled(competitionId);
        setEnabled(isEnabled);
      } catch (error) {
        console.error('Error loading notification status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotificationStatus();
  }, [competitionId]);

  const handleToggle = async () => {
    try {
      setLoading(true);
      const newStatus = !enabled;
      await toggleCompetitionNotifications(userId, competitionId, newStatus);
      setEnabled(newStatus);
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#A4D65E" />
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handleToggle}>
      <Ionicons
        name={enabled ? "notifications" : "notifications-outline"}
        size={24}
        color={enabled ? "#A4D65E" : "#6B7280"}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
});

export default NotificationBellToggle;
