// src/screens/ActiveCompetitionsScreen.js
import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Header } from '../components';
import { Ionicons } from '@expo/vector-icons';

import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  or,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

export default function ActiveCompetitionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  /* ---------------- live Firestore data ---------------- */
  const [activeCompetitions, setActiveCompetitions] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Active competitions where user is owner OR is in participants array
    const activeQuery = query(
      collection(db, 'competitions'),
      or(
        where('ownerId', '==', user.uid),
        where('participants', 'array-contains', user.uid)
      )
    );

    // Pending invitations where user is in pendingParticipants array
    const pendingQuery = query(
      collection(db, 'competitions'),
      where('pendingParticipants', 'array-contains', user.uid)
    );

    const activeUnsub = onSnapshot(activeQuery, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveCompetitions(data);
      setLoading(false);
    });

    const pendingUnsub = onSnapshot(pendingQuery, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingInvitations(data);
    });

    return () => {
      activeUnsub();
      pendingUnsub();
    };
  }, [user]);

  /* ---------------- search filter ---------------------- */
  const [queryText, setQueryText] = useState('');

  const filteredActive = useMemo(
    () =>
      activeCompetitions.filter(c =>
        c.name?.toLowerCase().includes(queryText.toLowerCase().trim())
      ),
    [queryText, activeCompetitions]
  );

  const filteredPending = useMemo(
    () =>
      pendingInvitations.filter(c =>
        c.name?.toLowerCase().includes(queryText.toLowerCase().trim())
      ),
    [queryText, pendingInvitations]
  );

  /* ---------------- invitation handlers ---------------- */
  const handleAcceptInvite = async (competitionId) => {
    try {
      const compRef = doc(db, 'competitions', competitionId);
      await updateDoc(compRef, {
        participants: arrayUnion(user.uid),
        pendingParticipants: arrayRemove(user.uid),
      });
      Alert.alert('Success', 'You have joined the competition!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept invitation');
      console.error(error);
    }
  };

  const handleDeclineInvite = async (competitionId) => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const compRef = doc(db, 'competitions', competitionId);
              await updateDoc(compRef, {
                pendingParticipants: arrayRemove(user.uid),
              });
              Alert.alert('Success', 'Invitation declined');
            } catch (error) {
              Alert.alert('Error', 'Failed to decline invitation');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Paint the status‑bar / notch area solid black */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#192126' }}>
        <StatusBar style="light" translucent={false} />
      </SafeAreaView>

      {/* Main content */}
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.root}>
        <Header title="Active Competitions" showProfileIcon />

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="name of competition"
            placeholderTextColor="#999"
            value={queryText}
            onChangeText={setQueryText}
            returnKeyType="search"
          />
        </View>

        {/* Card list */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        >
          {loading && (
            <Text style={styles.loadingText}>Loading competitions…</Text>
          )}

          {/* Pending Invitations Section */}
          {filteredPending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Pending Invitations</Text>
              {filteredPending.map(comp => (
                <View key={comp.id} style={styles.inviteCard}>
                  <Ionicons
                    name="mail"
                    size={90}
                    color="rgba(255,255,255,0.08)"
                    style={styles.bgIcon}
                  />

                  <View style={styles.inviteContent}>
                    <Text style={styles.cardTitle}>{comp.name}</Text>
                    <Text style={styles.inviteText}>You've been invited to join!</Text>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity
                        style={[styles.inviteButton, styles.acceptButton]}
                        onPress={() => handleAcceptInvite(comp.id)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inviteButton, styles.declineButton]}
                        onPress={() => handleDeclineInvite(comp.id)}
                      >
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Active Competitions Section */}
          {(filteredActive.length > 0 || filteredPending.length > 0) && (
            <Text style={styles.sectionTitle}>Your Competitions</Text>
          )}

          {!loading && filteredActive.length === 0 && filteredPending.length === 0 && (
            <Text style={styles.loadingText}>
              No competitions yet — create one or wait for an invite!
            </Text>
          )}

          {filteredActive.map(comp => (
            <TouchableOpacity
              key={comp.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('CompetitionDetails', { competition: comp })
              }
            >
              <Ionicons
                name="fitness"
                size={90}
                color="rgba(255,255,255,0.08)"
                style={styles.bgIcon}
              />

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{comp.name}</Text>
                <View style={styles.seeMoreRow}>
                  <Text style={styles.seeMoreText}>See more</Text>
                  <Text style={styles.seeMoreArrow}>›</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

/* ───────────── styles ───────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F8F8' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAEAEA',
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },

  scroll: { flex: 1, paddingHorizontal: 16 },

  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1E23',
    marginBottom: 16,
    marginTop: 8,
  },

  card: {
    backgroundColor: '#262626',
    borderRadius: 16,
    height: 150,
    marginBottom: 24,
    overflow: 'hidden',
  },

  inviteCard: {
    backgroundColor: '#A4D65E',
    borderRadius: 16,
    minHeight: 160,
    marginBottom: 24,
    overflow: 'hidden',
  },

  bgIcon: { position: 'absolute', right: 12, bottom: 12 },

  cardContent: { flex: 1, padding: 20, justifyContent: 'space-between' },
  
  inviteContent: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'space-between' 
  },

  cardTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },

  inviteText: { 
    fontSize: 16, 
    color: '#1A1E23', 
    marginTop: 8,
    marginBottom: 16,
  },

  inviteActions: {
    flexDirection: 'row',
    gap: 12,
  },

  inviteButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },

  acceptButton: {
    backgroundColor: '#1A1E23',
  },

  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1A1E23',
  },

  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  declineButtonText: {
    color: '#1A1E23',
    fontWeight: '600',
    fontSize: 16,
  },

  seeMoreRow: { flexDirection: 'row', alignItems: 'center' },
  seeMoreText: { fontSize: 16, fontWeight: '700', color: '#A4D65E' },
  seeMoreArrow: { fontSize: 20, fontWeight: '700', color: '#A4D65E', marginLeft: 4 },
});