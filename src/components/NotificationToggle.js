import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Reusable notification toggle component
 */
export default function NotificationToggle({ 
  title, 
  description, 
  iconName, 
  value, 
  onValueChange 
}) {
  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleIcon}>
        <Ionicons name={iconName} size={24} color="#A4D65E" />
      </View>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        trackColor={{ false: '#E5E7EB', true: '#A4D65E' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
        ios_backgroundColor="#E5E7EB"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1E23',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
