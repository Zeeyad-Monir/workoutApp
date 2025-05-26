// CompetitionCreationScreen.js

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Header, Button, FormInput, Dropdown, DatePicker } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

// All activities can now use any of these units
const workoutTypes = [
  'Walking','Running','Cycling','Cardio Session','Elliptical',
  'Weightlifting','Swimming','Rowing','Yoga','HIIT','Other',
];

// Universal units available for all activities
const universalUnits = [
  'Minute','Hour','Kilometre','Mile','Meter','Yard',
  'Step','Rep','Set','Calorie','Session','Class',
];

// Placeholder helper
const getPointsPlaceholder = unit => {
  const placeholders = {
    Minute: 'e.g., 10 minutes = 1 point',
    Hour: 'e.g., 1 hour = 5 points',
    Kilometre: 'e.g., 1 km = 1 point',
    Mile: 'e.g., 1 mile = 2 points',
    Meter: 'e.g., 100 meters = 1 point',
    Yard: 'e.g., 100 yards = 1 point',
    Step: 'e.g., 500 steps = 1 point',
    Rep: 'e.g., 10 reps = 1 point',
    Set: 'e.g., 1 set = 2 points',
    Calorie: 'e.g., 50 calories = 1 point',
    Session: 'e.g., 1 session = 10 points',
    Class: 'e.g., 1 class = 15 points',
  };
  return placeholders[unit] || 'Enter points value';
};
const getUnitsPlaceholder = unit => `e.g., 30 ${unit.toLowerCase()}`;

// Label helper
const getPointsLabel = unit => `Points per ${unit.toLowerCase()}`;
const getUnitsLabel  = unit => `Units required per point (${unit.toLowerCase()})`;

export default function CompetitionCreationScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  /* ---------- form state ---------- */
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [startDate, setStart]     = useState(new Date());
  const [endDate, setEnd]         = useState(new Date(Date.now() + 7*864e5));
  const [dailyCap, setDailyCap]   = useState('');
  // Each activity now has: type, unit, pointsPerUnit, unitsPerPoint
  const [activities, setActs]   = useState([
    { type: 'Walking', unit: 'Minute', points: '1', unitsPerPoint: '1' }
  ]);

  const [inviteEmail, setInvite]  = useState('');
  const [invitedFriends, setInvitedFriends] = useState([]);

  /* ---------- helpers ---------- */
  const updateAct = (idx, patch) =>
    setActs(a => a.map((row,i) => i===idx ? {...row,...patch} : row));

  const addActivity = () =>
    setActs([...activities, { type:'Walking', unit:'Minute', points:'1', unitsPerPoint:'1' }]);

  const removeAct = idx =>
    setActs(a => a.filter((_,i) => i!==idx));

  const findUserByEmail = async email => {
    const q = query(collection(db,'users'), where('email','==',email));
    const snap = await getDocs(q);
    if (!snap.empty) return { uid: snap.docs[0].id, email };
    const reverse = await getDoc(doc(db,'emails',email));
    if (reverse.exists()) return { uid: reverse.data().uid, email };
    return null;
  };

  const addInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    try {
      const friend = await findUserByEmail(email);
      if (!friend) throw new Error('No user with that email');
      if (friend.uid===user.uid) throw new Error("That's you!");
      if (invitedFriends.find(f=>f.uid===friend.uid)) throw new Error('Already invited');
      setInvitedFriends([...invitedFriends, friend]);
      setInvite('');
    } catch(e) {
      Alert.alert('Invite error', e.message);
    }
  };
  const removeInvite = uid =>
    setInvitedFriends(f=>f.filter(x=>x.uid!==uid));

  /* ---------- create competition ---------- */
  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation','Competition name is required');
      return;
    }
    if (activities.some(a=>!a.points || parseFloat(a.points)<=0 || !a.unitsPerPoint || parseFloat(a.unitsPerPoint)<=0)) {
      Alert.alert('Validation','Please set valid points & units-per-point for all activities');
      return;
    }
    try {
      await addDoc(collection(db,'competitions'), {
        name: name.trim(),
        description: description.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ownerId: user.uid,
        participants: [user.uid],
        pendingParticipants: invitedFriends.map(f=>f.uid),
        rules: activities.map(a=>({
          type: a.type,
          unit: a.unit,
          pointsPerUnit: Number(a.points),
          unitsPerPoint: Number(a.unitsPerPoint),
        })),
        dailyCap: dailyCap ? Number(dailyCap) : null,
        bonuses: [],
        createdAt: serverTimestamp(),
      });
      navigation.navigate('HomeStack');
    } catch(e) {
      Alert.alert('Error', e.message);
    }
  };

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      <Header title="Create Competition" showBackButton onBackPress={navigation.goBack}/>
      <ScrollView style={styles.formContainer} nestedScrollEnabled>
        <Text style={styles.sectionTitle}>Competition Details</Text>
        <FormInput label="Competition Name" value={name} onChangeText={setName}/>
        <View style={styles.dateRow}>
          <DatePicker label="Start Date" date={startDate} onDateChange={setStart} style={styles.dateField}/>
          <DatePicker label="End Date"   date={endDate}   onDateChange={setEnd}   style={styles.dateField}/>
        </View>
        <Text style={styles.label}>Description</Text>
        <TextInput style={styles.textArea} multiline value={description} onChangeText={setDesc} placeholder="Describe your competition..."/>

        <Text style={styles.sectionTitle}>Activity Rules</Text>
        <Text style={styles.sectionSubtext}>Set up custom point & unit thresholds</Text>
        {activities.map((act,idx) => {
          const z = 1000 - idx*10;
          return (
            <View key={idx} style={[styles.activityCard,{zIndex:z}]}>
              <Dropdown
                label="Activity Type"
                selectedValue={act.type}
                onValueChange={val=>updateAct(idx,{type:val})}
                items={workoutTypes}
                containerStyle={{zIndex:z+2}}
              />
              <Dropdown
                label="Measurement Unit"
                selectedValue={act.unit}
                onValueChange={unit=>updateAct(idx,{unit, unitsPerPoint:'1'})}
                items={universalUnits}
                containerStyle={{zIndex:z+1}}
              />

              <FormInput
                label={getPointsLabel(act.unit)}
                keyboardType="numeric"
                value={act.points}
                onChangeText={p=>updateAct(idx,{points:p})}
                placeholder={getPointsPlaceholder(act.unit)}
              />

              <FormInput
                label={getUnitsLabel(act.unit)}
                keyboardType="numeric"
                value={act.unitsPerPoint}
                onChangeText={u=>updateAct(idx,{unitsPerPoint:u})}
                placeholder={getUnitsPlaceholder(act.unit)}
              />

              {activities.length>1 && (
                <TouchableOpacity onPress={()=>removeAct(idx)} style={styles.trashBtn}>
                  <Ionicons name="trash" size={20} color="#FF6B6B"/>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={addActivity}>
          <Ionicons name="add-circle" size={40} color="#A4D65E"/>
          <Text style={styles.addText}>Add Activity Rule</Text>
        </TouchableOpacity>

        <FormInput
          label="Daily Point Limit (optional)"
          value={dailyCap}
          onChangeText={setDailyCap}
          keyboardType="numeric"
          placeholder="Leave blank for unlimited"
        />

        <Text style={styles.sectionTitle}>Invite Participants</Text>
        <View style={styles.inviteRow}>
          <TextInput
            style={[styles.inputInvite,{flex:1}]}
            placeholder="Friend's email"
            value={inviteEmail}
            onChangeText={setInvite}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity onPress={addInvite} style={{marginLeft:8}}>
            <Ionicons name="add-circle" size={32} color="#A4D65E"/>
          </TouchableOpacity>
        </View>

        {invitedFriends.map(f=>(
          <View key={f.uid} style={styles.participant}>
            <Ionicons name="person-circle" size={40} color="#A4D65E"/>
            <Text style={styles.participantName}>{f.email}</Text>
            <TouchableOpacity onPress={()=>removeInvite(f.uid)}>
              <Ionicons name="close-circle" size={24} color="#FF6B6B"/>
            </TouchableOpacity>
          </View>
        ))}

        <Button title="Create Competition" onPress={handleCreate} style={styles.createButton}/>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       {flex:1,backgroundColor:'#F8F8F8'},
  formContainer:   {flex:1,padding:16},
  sectionTitle:    {fontSize:18,fontWeight:'bold',color:'#1A1E23',marginTop:20,marginBottom:8},
  sectionSubtext:  {fontSize:14,color:'#666',marginBottom:15},
  dateRow:         {flexDirection:'row',justifyContent:'space-between'},
  dateField:       {width:'48%'},
  label:           {fontSize:16,color:'#1A1E23',marginBottom:8,marginTop:16},
  textArea:        {backgroundColor:'#FFF',borderRadius:8,padding:12,fontSize:16,color:'#1A1E23',minHeight:120,borderWidth:1,borderColor:'#E5E7EB'},
  activityCard:    {backgroundColor:'#FFF',borderRadius:8,padding:12,marginBottom:16,borderWidth:1,borderColor:'#E5E7EB'},
  trashBtn:        {alignSelf:'flex-end',marginTop:4},
  addBtn:          {flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#FFF',borderRadius:8,padding:10,marginBottom:20,borderStyle:'dashed',borderWidth:1,borderColor:'#A4D65E'},
  addText:         {marginLeft:8,color:'#1A1E23',fontWeight:'600'},
  inviteRow:       {flexDirection:'row',alignItems:'center',marginBottom:16},
  inputInvite:     {backgroundColor:'#FFF',borderRadius:8,padding:12,borderWidth:1,borderColor:'#E5E7EB'},
  participant:     {flexDirection:'row',alignItems:'center',marginVertical:8},
  participantName: {flex:1,marginLeft:12,color:'#1A1E23'},
  createButton:    {marginTop:20},
});