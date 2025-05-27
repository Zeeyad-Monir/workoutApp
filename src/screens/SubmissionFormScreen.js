// SubmissionFormScreen.js

import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert
} from 'react-native';
import { Header, Button, FormInput, DatePicker } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

export default function SubmissionFormScreen({ route, navigation }) {
  const { competition } = route.params;
  const { user } = useContext(AuthContext);

  const [date, setDate] = useState(new Date());
  const [activityType, setActivityType] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [currentDayPoints, setCurrentDayPoints] = useState(0);
  const [loadingDayPoints, setLoadingDayPoints] = useState(false);

  // Grab types safely
  const activityTypes = competition?.rules?.map(r=>r.type).filter(Boolean)||[];

  useEffect(()=>{
    if (activityTypes.length>0 && (!activityType || !activityTypes.includes(activityType))) {
      setActivityType(activityTypes[0]);
    }
  },[competition, activityType]);

  // Fetch current day's points whenever date changes
  useEffect(() => {
    fetchCurrentDayPoints();
  }, [date, user, competition]);

  // Helper function to get start and end of day in ISO format
  const getDayBounds = (selectedDate) => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    };
  };

  // Fetch user's submissions for the selected date
  const fetchCurrentDayPoints = async () => {
    if (!user || !competition) return;
    
    setLoadingDayPoints(true);
    try {
      const { start, end } = getDayBounds(date);
      
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('competitionId', '==', competition.id),
        where('userId', '==', user.uid),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      
      const snapshot = await getDocs(submissionsQuery);
      const totalPoints = snapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().points || 0);
      }, 0);
      
      setCurrentDayPoints(totalPoints);
    } catch (error) {
      console.error('Error fetching daily points:', error);
      setCurrentDayPoints(0);
    } finally {
      setLoadingDayPoints(false);
    }
  };

  // Check if date is within competition period
  const isDateWithinCompetition = (selectedDate) => {
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);
    return selectedDate >= startDate && selectedDate <= endDate;
  };

  const handleDateChange = (selectedDate) => {
    if (!isDateWithinCompetition(selectedDate)) {
      Alert.alert(
        'Invalid Date',
        'Please select a date within the competition period.',
        [{ text: 'OK' }]
      );
      return;
    }
    setDate(selectedDate);
    // fetchCurrentDayPoints will be called automatically via useEffect
  };

  // helper: find rule with safety check
  const getRule = () => {
    if (!competition?.rules || !Array.isArray(competition.rules)) {
      return { unit: '', pointsPerUnit: 0, unitsPerPoint: 1 };
    }
    const rule = competition.rules.find(r=>r.type===activityType);
    return rule || { unit: '', pointsPerUnit: 0, unitsPerPoint: 1 };
  };

  // calculate points with threshold
  const calculatePoints = () => {
    const rule = getRule();
    const { unit, pointsPerUnit=0, unitsPerPoint=1 } = rule;
    
    if (!unit) return 0; // Return 0 if no unit found
    
    let value = 0;
    
    // Handle predefined units
    if (['Kilometre','Mile','Meter','Yard','Step','Rep','Set'].includes(unit)) {
      value = parseFloat(distance)||0;
    } else if (unit==='Hour') {
      value = (parseFloat(duration)||0)/60;
    } else if (unit==='Minute') {
      value = parseFloat(duration)||0;
    } else if (unit==='Calorie') {
      value = parseFloat(calories)||0;
    } else if (['Session','Class'].includes(unit)) {
      value = 1; // session/class
    } else {
      // For custom units, use the distance field as the primary input
      // This allows users to enter their custom unit count
      value = parseFloat(distance)||0;
    }

    const pointsEarned = Math.floor(value / unitsPerPoint) * pointsPerUnit;
    return pointsEarned;
  };

  // Check if submission would exceed daily cap
  const wouldExceedDailyCap = () => {
    if (!competition.dailyCap) return false;
    const newPoints = calculatePoints();
    return (currentDayPoints + newPoints) > competition.dailyCap;
  };

  // Get final points considering daily cap
  const getFinalPoints = () => {
    const newPoints = calculatePoints();
    if (!competition.dailyCap) return newPoints;
    
    const remainingCap = competition.dailyCap - currentDayPoints;
    return Math.min(newPoints, remainingCap);
  };

  // Get points available for today
  const getRemainingDailyPoints = () => {
    if (!competition.dailyCap) return null;
    return Math.max(0, competition.dailyCap - currentDayPoints);
  };

  // show inputs by unit
  const shouldShowField = field => {
    const { unit } = getRule();
    if (!unit) return field === 'duration'; // Only show duration if no unit found
    if (field==='duration') return true;
    if (field==='distance') {
      // Show distance field for these predefined units AND custom units
      return ['Kilometre','Mile','Meter','Yard','Step','Rep','Set'].includes(unit) || !['Minute','Hour','Calorie','Session','Class'].includes(unit);
    }
    if (field==='calories') return true;
    return true;
  };

  // labels
  const getDistanceLabel = () => {
    const { unit } = getRule();
    if (!unit) return 'Value';
    const map = {
      Kilometre:'Distance (km)', Mile:'Distance (miles)',
      Meter:'Distance (meters)', Yard:'Distance (yards)',
      Step:'Steps', Rep:'Reps', Set:'Sets'
    };
    // For custom units or unknown units, use a generic label
    return map[unit] || `${unit} Count`;
  };

  const handleSubmit = async () => {
    if (!duration||duration==='0') {
      Alert.alert('Validation Error','Please enter workout duration');
      return;
    }
    
    if (!isDateWithinCompetition(date)) {
      Alert.alert('Validation Error','Workout date must be within the competition period');
      return;
    }

    const rule = getRule();
    if (!rule.unit) {
      Alert.alert('Validation Error','Please select a valid activity type');
      return;
    }

    // Allow submission but use capped points
    const points = getFinalPoints();
    try {
      await addDoc(collection(db,'submissions'),{
        competitionId: competition.id,
        userId: user.uid,
        activityType,
        duration: parseFloat(duration)||0,
        distance: parseFloat(distance)||0,
        calories: parseFloat(calories)||0,
        unit: rule.unit,
        points,
        notes,
        date: date.toISOString(),
        createdAt: serverTimestamp(),
      });
      
      Alert.alert(
        'Success!',
        `Workout submitted! You earned ${points.toFixed(1)} points.`,
        [{ text:'OK', onPress: ()=>navigation.goBack() }]
      );
    } catch(e) {
      console.error(e);
      Alert.alert('Error','Failed to submit workout. Please try again.');
    }
  };

  const competitionStartDate = new Date(competition.startDate);
  const competitionEndDate = new Date(competition.endDate);

  return (
    <View style={styles.container}>
      <Header title="Add Workout" showBackButton onBackPress={()=>navigation.goBack()}/>
      <ScrollView 
        style={styles.formContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Date Picker with Competition Period Info */}
        <View style={styles.dateSection}>
          <DatePicker 
            label="Workout Date" 
            date={date} 
            onDateChange={handleDateChange}
            mode="date"
            minimumDate={competitionStartDate}
            maximumDate={competitionEndDate}
          />
          <Text style={styles.dateRangeText}>
            Competition Period: {competitionStartDate.toLocaleDateString()} - {competitionEndDate.toLocaleDateString()}
          </Text>
        </View>

        {/* Activity Type */}
        <Text style={styles.label}>Activity Type</Text>
        {activityTypes.length > 0 ? (
          <View style={styles.activityTypesContainer}>
            {activityTypes.map(type=>(
              <TouchableOpacity
                key={type}
                style={[
                  styles.activityTypeButton,
                  activityType===type&&styles.selectedActivityType
                ]}
                onPress={()=>setActivityType(type)}
              >
                <Ionicons
                  name="fitness"
                  size={24}
                  color={activityType===type?'#FFF':'#1A1E23'}
                />
                <Text style={[
                  styles.activityTypeText,
                  activityType===type&&styles.selectedActivityTypeText
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.noActivitiesContainer}>
            <Text style={styles.noActivitiesText}>
              No activity types available for this competition
            </Text>
          </View>
        )}

        {/* Duration and Distance */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormInput
              label="Duration (min)"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          {shouldShowField('distance') && (
            <View style={styles.halfField}>
              <FormInput
                label={getDistanceLabel()}
                value={distance}
                onChangeText={setDistance}
                keyboardType="numeric"
                placeholder="0"
              />
              {/* Helper text for custom units */}
              {getRule().unit && !['Kilometre','Mile','Meter','Yard','Step','Rep','Set','Minute','Hour','Calorie','Session','Class'].includes(getRule().unit) && (
                <Text style={styles.customUnitHint}>
                  Enter the number of {getRule().unit.toLowerCase()}'s completed
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Calories */}
        {shouldShowField('calories') && (
          <FormInput
            label="Calories Burned (optional)"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            placeholder="0"
          />
        )}

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.textArea}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any additional details..."
          placeholderTextColor="#999"
        />

        {/* Points Preview */}
        <View style={styles.pointsPreview}>
          <View>
            <Text style={styles.pointsLabel}>Points Earned:</Text>
            <Text style={styles.pointsFormula}>
              ({getRule().unit || 'unit'} ÷ {getRule().unitsPerPoint} × {getRule().pointsPerUnit})
            </Text>
            {/* Show calculation method for custom units */}
            {getRule().unit && !['Kilometre','Mile','Meter','Yard','Step','Rep','Set','Minute','Hour','Calorie','Session','Class'].includes(getRule().unit) && (
              <Text style={styles.customUnitFormula}>
                Using {getRule().unit} count from field above
              </Text>
            )}
          </View>
          <Text style={styles.pointsValue}>{calculatePoints().toFixed(1)}</Text>
        </View>

        {/* Daily Cap Warning for Points */}
        {competition.dailyCap && wouldExceedDailyCap() && (
          <View style={styles.pointsWarning}>
            <Text style={styles.pointsWarningText}>
              Only {getFinalPoints().toFixed(1)} points will count toward your daily limit.
            </Text>
          </View>
        )}

        {/* Daily Cap Information */}
        {competition.dailyCap && (
          <View style={[
            styles.dailyCapInfo,
            wouldExceedDailyCap() && styles.dailyCapWarning
          ]}>
            <View style={styles.dailyCapHeader}>
              <Text style={[
                styles.dailyCapTitle,
                wouldExceedDailyCap() && styles.dailyCapWarningText
              ]}>
                Daily Progress
              </Text>
              {loadingDayPoints && (
                <Text style={styles.loadingText}>Loading...</Text>
              )}
            </View>
            <Text style={[
              styles.dailyCapText,
              wouldExceedDailyCap() && styles.dailyCapWarningText
            ]}>
              {currentDayPoints} / {competition.dailyCap} points used today
            </Text>
            {wouldExceedDailyCap() && (
              <Text style={styles.warningText}>
                ⚠️ This submission would exceed your daily limit!
              </Text>
            )}
            {getRemainingDailyPoints() !== null && getRemainingDailyPoints() > 0 && (
              <Text style={styles.remainingText}>
                {getRemainingDailyPoints()} points remaining today
              </Text>
            )}
          </View>
        )}

        {/* Photo Evidence (optional) */}
        <Text style={styles.label}>Add Photo Evidence (Optional)</Text>
        <TouchableOpacity style={styles.addPhotoButton}>
          <Ionicons name="camera" size={40} color="#A4D65E"/>
          <Text style={styles.addPhotoText}>Take Photo</Text>
        </TouchableOpacity>

        {/* Submit */}
        <Button 
          title="Submit Workout"
          onPress={handleSubmit} 
          style={styles.submitButton}
          disabled={loadingDayPoints}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       {flex:1,backgroundColor:'#F8F8F8'},
  formContainer:   {flex:1,padding:16},
  scrollContent:   {paddingBottom:40},
  dateSection:     {marginBottom:16},
  dateRangeText:   {fontSize:12,color:'#666',marginTop:4,textAlign:'center'},
  label:           {fontSize:16,color:'#1A1E23',marginBottom:8,marginTop:16},
  activityTypesContainer:{flexDirection:'row',flexWrap:'wrap',marginHorizontal:-5},
  noActivitiesContainer:{backgroundColor:'#FFF2F2',borderRadius:8,padding:16,marginBottom:16},
  noActivitiesText:{fontSize:14,color:'#D32F2F',textAlign:'center'},
  activityTypeButton:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderRadius:20,paddingVertical:8,paddingHorizontal:12,marginHorizontal:5,marginBottom:20,borderWidth:1,borderColor:'#E5E7EB'},
  selectedActivityType:{backgroundColor:'#A4D65E',borderColor:'#A4D65E'},
  activityTypeText:{fontSize:14,color:'#1A1E23',marginLeft:5},
  selectedActivityTypeText:{color:'#FFF'},
  row:             {flexDirection:'row',justifyContent:'space-between',gap:10},
  halfField:       {flex:1},
  textArea:        {backgroundColor:'#FFF',borderRadius:8,padding:12,fontSize:16,color:'#1A1E23',minHeight:100,borderWidth:1,borderColor:'#E5E7EB'},
  pointsPreview:   {flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#A4D65E',borderRadius:8,padding:16,marginTop:20},
  pointsLabel:     {fontSize:18,fontWeight:'bold',color:'#1A1E23'},
  pointsFormula:   {fontSize:14,color:'#1A1E23',marginTop:5,opacity:0.7},
  customUnitFormula: {fontSize:12,color:'#1A1E23',opacity:0.6,fontStyle:'italic',marginTop:26},
 customUnitHint:  {fontSize:11,color:'#666',marginTop:-10,marginBottom:20,fontStyle:'italic'},
  pointsValue:     {fontSize:24,fontWeight:'bold',color:'#1A1E23'},
  pointsWarning:   {backgroundColor:'#FFF2F2',borderRadius:8,padding:12,marginTop:8,borderWidth:1,borderColor:'#FF6B6B'},
  pointsWarningText:{fontSize:14,color:'#D32F2F',fontWeight:'500',textAlign:'center'},
  dailyCapInfo:    {backgroundColor:'#E8F5E8',borderRadius:8,padding:16,marginTop:12,borderWidth:1,borderColor:'#A4D65E'},
  dailyCapWarning: {backgroundColor:'#FFF2F2',borderColor:'#FF6B6B'},
  dailyCapHeader:  {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  dailyCapTitle:   {fontSize:16,fontWeight:'bold',color:'#1A1E23'},
  dailyCapText:    {fontSize:14,color:'#1A1E23',marginBottom:4},
  dailyCapWarningText:{color:'#D32F2F'},
  warningText:     {fontSize:14,color:'#D32F2F',fontWeight:'500',marginTop:4},
  remainingText:   {fontSize:12,color:'#666',fontStyle:'italic'},
  loadingText:     {fontSize:12,color:'#666'},
  disabledButton:  {backgroundColor:'#CCCCCC'},
  addPhotoButton:  {flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#FFF',borderRadius:8,padding:12,marginVertical:10},
  addPhotoText:    {marginLeft:8,fontSize:16,color:'#1A1E23'},
  submitButton:    {marginTop:20,marginBottom:20},
});