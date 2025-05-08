import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Header } from '../components';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function ProfileScreen() {
  const { user } = useContext(AuthContext);

  const [profile, setProfile] = useState({
    username: '',
    handle: '',
    favouriteWorkout: '',
    wins: 0,
    totals: 0,
  });
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({});

  /* ----- live profile subscription ----- */
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);

    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        // create doc using the username provided at sign‑up
        setDoc(ref, {
          username: user.displayName || user.email.split('@')[0],
          handle:   (user.displayName || user.email.split('@')[0]).replace(/\s+/g, '').toLowerCase(),
          favouriteWorkout: '',
          wins: 0,
          totals: 0,
        });
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  /* ----- handlers ----- */
  const startEdit  = () => { setDraft(profile); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, draft);
    setEditing(false);
  };

  const handleLogout = () => signOut(auth);

  if (loading) return null;

  return (
    <View style={styles.container}>
      <Header title={profile.username} showProfileIcon />

      <ScrollView style={styles.scrollView}>
        {/* Profile card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
              <Ionicons name="person-circle" size={60} color="#A4D65E" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.username}</Text>
              <Text style={styles.profileUsername}>@{profile.handle}</Text>
            </View>
          </View>
        </View>

        {/* About you */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>About You</Text>
            {!editing && (
              <TouchableOpacity onPress={startEdit}>
                <Ionicons name="pencil" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statsContainer}>
            {renderStat(
              'Favourite Workout', 'fitness',
              editing, draft.favouriteWorkout,
              t => setDraft({ ...draft, favouriteWorkout: t }),
              profile.favouriteWorkout
            )}
            {renderStat(
              'Competitions Won', 'trophy',
              editing, String(draft.wins),
              t => setDraft({ ...draft, wins: Number(t) }),
              `${profile.wins} Wins`
            )}
            {renderStat(
              'Total Competitions', 'stats-chart',
              editing, String(draft.totals),
              t => setDraft({ ...draft, totals: Number(t) }),
              `${profile.totals} Total`
            )}

            {editing && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity onPress={cancelEdit} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveEdit} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.accountOptions}>
            {/* … other static options unchanged … */}
            <TouchableOpacity style={styles.accountOption} onPress={handleLogout}>
              <View style={styles.accountOptionIcon}>
                <Ionicons name="log-out" size={24} color="#6B7280" />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={styles.accountOptionTitle}>Log out</Text>
                <Text style={styles.accountOptionSubtitle}>Securely sign off</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* More section unchanged */}
      </ScrollView>
    </View>
  );
}

function renderStat(label, icon, editing, draftVal, onChange, displayVal) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueContainer}>
        {editing ? (
          <TextInput
            style={[styles.statValue, { flex: 1, paddingVertical: 0 }]}
            value={draftVal}
            onChangeText={onChange}
            keyboardType={label.includes('Competitions') ? 'number-pad' : 'default'}
          />
        ) : (
          <Text style={styles.statValue}>{displayVal}</Text>
        )}
        <Ionicons name={icon} size={24} color="#A4D65E" style={styles.statIcon} />
      </View>
    </View>
  );
}

/* ----- styles unchanged ----- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollView:{ flex: 1, paddingHorizontal: 16 },
  section:   { marginTop: 24 },
  sectionTitle:{ fontSize: 18, fontWeight: 'bold', color: '#1A1E23', marginBottom: 12 },
  profileCard:{ backgroundColor: '#A4D65E', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
  profileImageContainer:{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  profileInfo:{ flex: 1 },
  profileName:{ fontSize: 18, fontWeight: 'bold', color: '#1A1E23' },
  profileUsername:{ fontSize: 14, color: '#1A1E23', opacity: 0.8 },
  statsContainer:{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  statItem:{ marginBottom: 16 },
  statLabel:{ fontSize: 14, color: '#6B7280', marginBottom: 4 },
  statValueContainer:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue:{ fontSize: 16, fontWeight: '500', color: '#1A1E23' },
  statIcon:{ marginLeft: 8 },
  accountOptions:{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  accountOption:{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  accountOptionIcon:{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  accountOptionContent:{ flex: 1 },
  accountOptionTitle:{ fontSize: 16, fontWeight: '500', color: '#1A1E23' },
  accountOptionSubtitle:{ fontSize: 12, color: '#6B7280', marginTop: 2 },
  editBtn:{ marginLeft: 12 },
  editBtnText:{ color: '#A4D65E', fontWeight: '600' },
});