import React, { useState, useContext, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { Header, Button, FormInput } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

const SubmissionFormScreen = ({ route, navigation }) => {
  const { competition } = route.params;
  const { user } = useContext(AuthContext);
  
  const [date, setDate] = useState(new Date());
  const [activityType, setActivityType] = useState('Running');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Get activity types from competition rules
  const activityTypes = competition?.rules?.map(r => r.type) || [];
  
  // Set initial activity type to the first available one
  useEffect(() => {
    if (activityTypes.length > 0 && !activityTypes.includes(activityType)) {
      setActivityType(activityTypes[0]);
    }
  }, [competition]);
  
  const calculatePoints = () => {
    if (!competition?.rules) return 0;
    
    // Find the rule for the selected activity type
    const rule = competition.rules.find(r => r.type === activityType);
    if (!rule) return 0;
    
    // Calculate points based on the rule
    let value = 0;
    switch (rule.unit) {
      // Distance units
      case 'Kilometre':
      case 'Mile':
      case 'Meter':
      case 'Yard':
        value = parseFloat(distance) || 0;
        break;
      
      // Time units
      case 'Minute':
        value = parseFloat(duration) || 0;
        break;
      case 'Hour':
        value = (parseFloat(duration) || 0) / 60; // Convert minutes to hours
        break;
      
      // Count units
      case 'Step':
      case 'Rep':
      case 'Set':
        value = parseFloat(distance) || 0; // Using distance field for count-based metrics
        break;
      
      // Energy units
      case 'Calorie':
        value = parseFloat(calories) || 0;
        break;
      
      // Session units
      case 'Session':
      case 'Class':
        value = 1; // Each submission counts as 1 session/class
        break;
      
      default:
        value = parseFloat(distance) || 0;
    }
    
    const points = value * rule.pointsPerUnit;
    
    // Apply daily cap if exists
    if (competition.dailyCap && points > competition.dailyCap) {
      return competition.dailyCap;
    }
    
    return points;
  };
  
  const getUnitForActivity = () => {
    const rule = competition?.rules?.find(r => r.type === activityType);
    return rule?.unit || 'unit';
  };
  
  // Helper to determine which input fields to show based on unit
  const shouldShowField = (field) => {
    const unit = getUnitForActivity();
    switch (field) {
      case 'duration':
        return true; // Always show duration
      case 'distance':
        // Show for distance and count-based units
        return ['Kilometre', 'Mile', 'Meter', 'Yard', 'Step', 'Rep', 'Set'].includes(unit);
      case 'calories':
        return true; // Always show calories as optional
      default:
        return true;
    }
  };
  
  // Get appropriate label for the distance/count field
  const getDistanceLabel = () => {
    const unit = getUnitForActivity();
    const labels = {
      'Kilometre': 'Distance (km)',
      'Mile': 'Distance (miles)',
      'Meter': 'Distance (meters)',
      'Yard': 'Distance (yards)',
      'Step': 'Steps',
      'Rep': 'Reps',
      'Set': 'Sets',
    };
    return labels[unit] || 'Value';
  };
  
  const handleSubmit = async () => {
    try {
      // Validation
      if (!duration || duration === '0') {
        Alert.alert('Validation Error', 'Please enter workout duration');
        return;
      }
      
      const points = calculatePoints();
      
      // Save submission to Firestore
      await addDoc(collection(db, 'submissions'), {
        competitionId: competition.id,
        userId: user.uid,
        activityType,
        duration: parseFloat(duration) || 0,
        distance: parseFloat(distance) || 0,
        calories: parseFloat(calories) || 0,
        unit: getUnitForActivity(),
        points,
        notes,
        date: date.toISOString(),
        createdAt: serverTimestamp(),
      });
      
      Alert.alert(
        'Success!', 
        `Workout submitted! You earned ${points.toFixed(1)} points.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting workout:', error);
      Alert.alert('Error', 'Failed to submit workout. Please try again.');
    }
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
        {activityTypes.length === 0 ? (
          <Text style={styles.emptyText}>No activity types defined for this competition</Text>
        ) : (
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
                    type === 'Walking' ? 'walk' :
                    type === 'Cycling' ? 'bicycle' :
                    type === 'Swimming' ? 'water' :
                    type === 'Weightlifting' ? 'barbell' :
                    type === 'Elliptical' ? 'fitness' :
                    type === 'Cardio Session' ? 'heart' :
                    type === 'Rowing' ? 'boat' :
                    type === 'Yoga' ? 'body' :
                    type === 'HIIT' ? 'flash' :
                    type === 'Other' ? 'apps' : 'fitness'
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
        )}
        
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
          {shouldShowField('distance') && (
            <View style={styles.halfField}>
              <FormInput
                label={getDistanceLabel()}
                value={distance}
                onChangeText={setDistance}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          )}
        </View>
        
        {shouldShowField('calories') && (
          <FormInput
            label="Calories Burned (optional)"
            value={calories}
            onChangeText={setCalories}
            placeholder="0"
            keyboardType="numeric"
          />
        )}
        
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
        
        <View style={styles.pointsPreview}>
          <View>
            <Text style={styles.pointsLabel}>Points Earned:</Text>
            {competition?.rules?.find(r => r.type === activityType) && (
              <Text style={styles.pointsFormula}>
                ({getUnitForActivity()} × {competition.rules.find(r => r.type === activityType).pointsPerUnit})
              </Text>
            )}
          </View>
          <Text style={styles.pointsValue}>{calculatePoints().toFixed(1)}</Text>
        </View>
        
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
    gap: 10,
  },
  halfField: {
    flex: 1,
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
  pointsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#A4D65E',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  pointsLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1E23',
  },
  pointsFormula: {
    fontSize: 14,
    color: '#1A1E23',
    opacity: 0.7,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1E23',
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
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginVertical: 20,
  },
  submitButton: {
    marginTop: 30,
    marginBottom: 40,
  },
});

export default SubmissionFormScreen;