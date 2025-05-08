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

const workoutTypes = [
  'Walking',
  'Running',
  'Cycling',
  'Cardio Session',
  'Elliptical',
  'Weightlifting',
];

const unitOptions = {
  Walking: ['Kilometre', 'Mile', 'Step'],
  Running: ['Kilometre', 'Mile'],
  Cycling: ['Kilometre', 'Mile'],
  'Cardio Session': ['Minute'],
  Elliptical: ['Minute', 'Calorie'],
  Weightlifting: ['Rep', 'Minute', 'Calorie'],
};

export default function CompetitionCreationScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  /* ---------- form state ---------- */
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [startDate, setStart]     = useState(new Date());
  const [endDate, setEnd]         = useState(new Date(Date.now() + 7 * 864e5));
  const [activities, setActs]     = useState([
    { type: 'Walking', unit: 'Kilometre', points: '1' },
  ]);
  const [dailyCap, setDailyCap]   = useState('');

  /* ---------- invite state ---------- */
  const [inviteEmail, setInvite]  = useState('');
  /** invitedFriends = [{ uid, email }] */
  const [invitedFriends, setInvitedFriends] = useState([]);

  /* ---------- helper functions ---------- */
  const updateAct = (idx, patch) =>
    setActs(a => a.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const addActivity = () =>
    setActs([...activities, { type: 'Walking', unit: 'Kilometre', points: '1' }]);

  const removeAct = idx => setActs(a => a.filter((_, i) => i !== idx));

  /** Look up a user by email in Firestore */
  const findUserByEmail = async email => {
    // 1) try users collection
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { uid: docSnap.id, email };
    }
    // 2) fallback: reverse‑lookup map (emails/{email} -> { uid })
    const reverse = await getDoc(doc(db, 'emails', email));
    if (reverse.exists()) return { uid: reverse.data().uid, email };
    return null;
  };

  const addInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    try {
      const friend = await findUserByEmail(email);
      if (!friend) throw new Error('No user with that email');
      if (friend.uid === user.uid) throw new Error('That’s you!');
      if (invitedFriends.find(f => f.uid === friend.uid))
        throw new Error('Already invited');
      setInvitedFriends([...invitedFriends, friend]);
      setInvite('');
    } catch (e) {
      Alert.alert('Invite error', e.message);
    }
  };

  const removeInvite = uid =>
    setInvitedFriends(invitedFriends.filter(f => f.uid !== uid));

  /* ---------- create competition ---------- */
  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Competition name is required');
      return;
    }
    try {
      await addDoc(collection(db, 'competitions'), {
        name: name.trim(),
        description: description.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ownerId: user.uid,
        participants: [user.uid, ...invitedFriends.map(f => f.uid)],
        rules: activities.map(a => ({
          type: a.type,
          unit: a.unit,
          pointsPerUnit: Number(a.points),
        })),
        dailyCap: dailyCap ? Number(dailyCap) : null,
        bonuses: [],
        createdAt: serverTimestamp(),
      });
      navigation.navigate('HomeStack');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      <Header title="Create Competition" showBackButton onBackPress={navigation.goBack} />

      <ScrollView style={styles.formContainer} nestedScrollEnabled>
        {/* -- details -- */}
        <Text style={styles.sectionTitle}>Competition Details</Text>
        <FormInput label="Competition Name" value={name} onChangeText={setName} />

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <DatePicker label="Start Date" date={startDate} onDateChange={setStart} />
          </View>
          <View style={styles.dateField}>
            <DatePicker label="End Date" date={endDate} onDateChange={setEnd} />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          multiline
          value={description}
          onChangeText={setDesc}
          placeholder="Describe your competition..."
        />

        {/* -- activity rules -- */}
        <Text style={styles.sectionTitle}>Activity Rules</Text>
        {activities.map((act, idx) => {
          const baseZ = 1000 - idx * 10;
          return (
            <View key={idx} style={[styles.activityCard, { zIndex: baseZ }]}>
              <Dropdown
                label="Workout Type"
                selectedValue={act.type}
                onValueChange={val => updateAct(idx, { type: val, unit: unitOptions[val][0] })}
                items={workoutTypes}
                containerStyle={{ zIndex: baseZ + 2 }}
              />
              <Dropdown
                label="Scored Unit"
                selectedValue={act.unit}
                onValueChange={unit => updateAct(idx, { unit })}
                items={unitOptions[act.type]}
                containerStyle={{ zIndex: baseZ + 1 }}
              />
              <FormInput
                label={`Points per ${act.unit}`}
                keyboardType="numeric"
                value={act.points}
                onChangeText={p => updateAct(idx, { points: p })}
              />
              {activities.length > 1 && (
                <TouchableOpacity onPress={() => removeAct(idx)} style={styles.trashBtn}>
                  <Ionicons name="trash" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        <TouchableOpacity style={styles.addBtn} onPress={addActivity}>
          <Ionicons name="add-circle" size={40} color="#A4D65E" />
          <Text style={styles.addText}>Add Activity Rule</Text>
        </TouchableOpacity>

        {/* -- daily cap -- */}
        <FormInput
          label="Daily Point Limit (optional)"
          value={dailyCap}
          onChangeText={setDailyCap}
          keyboardType="numeric"
          placeholder="Leave blank for uncapped"
        />

        {/* -- invites -- */}
        <Text style={styles.sectionTitle}>Invite Participants</Text>
        <View style={styles.inviteRow}>
          <TextInput
            style={[styles.inputInvite, { flex: 1 }]}
            placeholder="Friend's email"
            value={inviteEmail}
            onChangeText={setInvite}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity onPress={addInvite} style={{ marginLeft: 8 }}>
            <Ionicons name="add-circle" size={32} color="#A4D65E" />
          </TouchableOpacity>
        </View>

        {invitedFriends.map(f => (
          <View key={f.uid} style={styles.participant}>
            <View style={styles.participantIcon}>
              <Ionicons name="person-circle" size={40} color="#A4D65E" />
            </View>
            <Text style={styles.participantName}>{f.email}</Text>
            <TouchableOpacity onPress={() => removeInvite(f.uid)} style={styles.removeButton}>
              <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ))}

        <Button title="Create Competition" onPress={handleCreate} style={styles.createButton} />
      </ScrollView>
    </View>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  formContainer: { flex: 1, padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1E23',
    marginTop: 20,
    marginBottom: 15,
  },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateField: { width: '48%' },
  label: { fontSize: 16, color: '#1A1E23', marginBottom: 8, marginTop: 16 },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1E23',
    textAlignVertical: 'top',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  trashBtn: { alignSelf: 'flex-end', marginTop: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#A4D65E',
  },
  addText: { fontSize: 16, color: '#A4D65E', marginLeft: 10 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  inputInvite: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1E23',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  participantIcon: { marginRight: 10 },
  participantName: { flex: 1, fontSize: 16, color: '#1A1E23' },
  removeButton: { padding: 5 },
  createButton: { marginTop: 20, marginBottom: 40 },
});