import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DatePicker = ({ label, date, onDateChange }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={styles.dateButton} 
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dateText}>{formatDate(date)}</Text>
        <Ionicons name="calendar" size={20} color="#A4D65E" />
      </TouchableOpacity>
      
      {/* In a real implementation, we would show a date picker here */}
      {/* For this example, we're just showing the UI */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#1A1E23',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 16,
    color: '#1A1E23',
  },
});

export default DatePicker;
