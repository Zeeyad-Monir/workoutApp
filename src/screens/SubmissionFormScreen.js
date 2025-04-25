import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Header, Button, FormInput } from '../components';
import { Ionicons } from '@expo/vector-icons';

const SubmissionFormScreen = ({ navigation }) => {
  const [date, setDate] = useState(new Date());
  const [activityType, setActivityType] = useState('Running');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const activityTypes = ['Running', 'Cycling', 'Swimming', 'Weightlifting', 'HIIT'];
  
  const handleSubmit = () => {
    // In a real app, this would save the submission data
    // For now, just navigate back to the competition details
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Add Workout" 
        showBackButton={true} 
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.datePickerContainer}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
            <Ionicons name="calendar" size={24} color="#A4D65E" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.label}>Activity Type</Text>
        <View style={styles.activityTypesContainer}>
          {activityTypes.map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.activityTypeButton,
                activityType === type && styles.selectedActivityType
              ]}
              onPress={() => setActivityType(type)}
            >
              <Ionicons 
                name={
                  type === 'Running' ? 'walk' :
                  type === 'Cycling' ? 'bicycle' :
                  type === 'Swimming' ? 'water' :
                  type === 'Weightlifting' ? 'barbell' : 'fitness'
                } 
                size={24} 
                color={activityType === type ? '#FFFFFF' : '#1A1E23'} 
              />
              <Text 
                style={[
                  styles.activityTypeText,
                  activityType === type && styles.selectedActivityTypeText
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormInput
              label="Duration (min)"
              value={duration}
              onChangeText={setDuration}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfField}>
            <FormInput
              label="Distance (km)"
              value={distance}
              onChangeText={setDistance}
              placeholder="0.0"
              keyboardType="numeric"
            />
          </View>
        </View>
        
        <FormInput
          label="Calories Burned"
          value={calories}
          onChangeText={setCalories}
          placeholder="0"
          keyboardType="numeric"
        />
        
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any additional details about your workout..."
          placeholderTextColor="#999"
        />
        
        <View style={styles.photoSection}>
          <Text style={styles.label}>Add Photo Evidence (Optional)</Text>
          <TouchableOpacity style={styles.addPhotoButton}>
            <Ionicons name="camera" size={40} color="#A4D65E" />
            <Text style={styles.addPhotoText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
        
        <Button 
          title="Submit Workout" 
          onPress={handleSubmit} 
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 16,
    color: '#1A1E23',
  },
  label: {
    fontSize: 16,
    color: '#1A1E23',
    marginBottom: 8,
    marginTop: 16,
  },
  activityTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  activityTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedActivityType: {
    backgroundColor: '#A4D65E',
    borderColor: '#A4D65E',
  },
  activityTypeText: {
    fontSize: 14,
    color: '#1A1E23',
    marginLeft: 5,
  },
  selectedActivityTypeText: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfField: {
    width: '48%',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1E23',
    textAlignVertical: 'top',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  photoSection: {
    marginTop: 20,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    marginTop: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#A4D65E',
  },
  addPhotoText: {
    fontSize: 16,
    color: '#A4D65E',
    marginLeft: 10,
  },
  submitButton: {
    marginTop: 30,
    marginBottom: 40,
  },
});

export default SubmissionFormScreen;
