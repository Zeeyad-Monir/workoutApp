// SubmissionFormScreen.js

import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert
} from 'react-native';
import { Header, Button, FormInput } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

export default function SubmissionFormScreen({ route, navigation }) {
  const { competition } = route.params;
  const { user } = useContext(AuthContext);

  const [date, setDate]               = useState(new Date());
  const [activityType, setActivityType] = useState('');
  const [duration, setDuration]       = useState('');
  const [distance, setDistance]       = useState('');
  const [calories, setCalories]       = useState('');
  const [notes, setNotes]             = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Grab types
  const activityTypes = competition?.rules?.map(r=>r.type)||[];

  useEffect(()=>{
    if (activityTypes.length>0 && !activityTypes.includes(activityType)) {
      setActivityType(activityTypes[0]);
    }
  },[competition]);

  // helper: find rule
  const getRule = () => competition.rules.find(r=>r.type===activityType) || {};

  // calculate points with threshold
  const calculatePoints = () => {
    const rule = getRule();
    const { unit, pointsPerUnit=0, unitsPerPoint=1 } = rule;
    let value = 0;
    if (['Kilometre','Mile','Meter','Yard','Step','Rep','Set'].includes(unit)) {
      value = parseFloat(distance)||0;
    } else if (unit==='Hour') {
      value = (parseFloat(duration)||0)/60;
    } else if (unit==='Minute') {
      value = parseFloat(duration)||0;
    } else if (unit==='Calorie') {
      value = parseFloat(calories)||0;
    } else {
      value = 1; // session/class
    }

    const pointsEarned = Math.floor(value / unitsPerPoint) * pointsPerUnit;
    if (competition.dailyCap && pointsEarned > competition.dailyCap) {
      return competition.dailyCap;
    }
    return pointsEarned;
  };

  // show inputs by unit
  const shouldShowField = field => {
    const { unit } = getRule();
    if (field==='duration') return true;
    if (field==='distance') {
      return ['Kilometre','Mile','Meter','Yard','Step','Rep','Set'].includes(unit);
    }
    if (field==='calories') return true;
    return true;
  };

  // labels
  const getDistanceLabel = () => {
    const map = {
      Kilometre:'Distance (km)', Mile:'Distance (miles)',
      Meter:'Distance (meters)', Yard:'Distance (yards)',
      Step:'Steps', Rep:'Reps', Set:'Sets'
    };
    return map[getRule().unit]||'Value';
  };

  const handleSubmit = async () => {
    if (!duration||duration==='0') {
      Alert.alert('Validation Error','Please enter workout duration');
      return;
    }
    const points = calculatePoints();
    try {
      await addDoc(collection(db,'submissions'),{
        competitionId: competition.id,
        userId: user.uid,
        activityType,
        duration: parseFloat(duration)||0,
        distance: parseFloat(distance)||0,
        calories: parseFloat(calories)||0,
        unit: getRule().unit,
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

  return (
    <View style={styles.container}>
      <Header title="Add Workout" showBackButton onBackPress={()=>navigation.goBack()}/>
      <ScrollView style={styles.formContainer}>
        {/* Date Picker */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.datePickerButton} onPress={()=>setShowDatePicker(true)}>
          <Text style={styles.dateText}>
            {date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
          </Text>
          <Ionicons name="calendar" size={24} color="#A4D65E"/>
        </TouchableOpacity>

        {/* Activity Type */}
        <Text style={styles.label}>Activity Type</Text>
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
              ({getRule().unit} ÷ {getRule().unitsPerPoint} × {getRule().pointsPerUnit})
            </Text>
          </View>
          <Text style={styles.pointsValue}>{calculatePoints().toFixed(1)}</Text>
        </View>

        {/* Photo Evidence (optional) */}
        <Text style={styles.label}>Add Photo Evidence (Optional)</Text>
        <TouchableOpacity style={styles.addPhotoButton}>
          <Ionicons name="camera" size={40} color="#A4D65E"/>
          <Text style={styles.addPhotoText}>Take Photo</Text>
        </TouchableOpacity>

        {/* Submit */}
        <Button title="Submit Workout" onPress={handleSubmit} style={styles.submitButton}/>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       {flex:1,backgroundColor:'#F8F8F8'},
  formContainer:   {flex:1,padding:16},
  datePickerButton:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#FFF',borderRadius:8,padding:12,borderWidth:1,borderColor:'#E5E7EB'},
  dateText:        {fontSize:16,color:'#1A1E23'},
  label:           {fontSize:16,color:'#1A1E23',marginBottom:8,marginTop:16},
  activityTypesContainer:{flexDirection:'row',flexWrap:'wrap',marginHorizontal:-5},
  activityTypeButton:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderRadius:20,paddingVertical:8,paddingHorizontal:12,marginHorizontal:5,marginBottom:10,borderWidth:1,borderColor:'#E5E7EB'},
  selectedActivityType:{backgroundColor:'#A4D65E',borderColor:'#A4D65E'},
  activityTypeText:{fontSize:14,color:'#1A1E23',marginLeft:5},
  selectedActivityTypeText:{color:'#FFF'},
  row:             {flexDirection:'row',justifyContent:'space-between',gap:10},
  halfField:       {flex:1},
  textArea:        {backgroundColor:'#FFF',borderRadius:8,padding:12,fontSize:16,color:'#1A1E23',minHeight:100,borderWidth:1,borderColor:'#E5E7EB'},
  pointsPreview:   {flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#A4D65E',borderRadius:8,padding:16,marginTop:20},
  pointsLabel:     {fontSize:18,fontWeight:'bold',color:'#1A1E23'},
  pointsFormula:   {fontSize:14,color:'#1A1E23',opacity:0.7},
  pointsValue:     {fontSize:24,fontWeight:'bold',color:'#1A1E23'},
  addPhotoButton:  {flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#FFF',borderRadius:8,padding:12,marginVertical:10},
  addPhotoText:    {marginLeft:8,fontSize:16,color:'#1A1E23'},
  submitButton:    {marginTop:20},
});