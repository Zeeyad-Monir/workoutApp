// src/screens/ActiveCompetitionsScreen.js
import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
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
} from 'firebase/firestore';
import { AuthContext } from '../contexts/AuthContext';

export default function ActiveCompetitionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  /* ---------------- live Firestore data ---------------- */
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // competitions where user is owner OR is in participants array
    const q = query(
      collection(db, 'competitions'),
      or(
        where('ownerId', '==', user.uid),
        where('participants', 'array-contains', user.uid)
      )
    );

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCompetitions(data);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  /* ---------------- search filter ---------------------- */
  const [queryText, setQueryText] = useState('');

  const filtered = useMemo(
    () =>
      competitions.filter(c =>
        c.name?.toLowerCase().includes(queryText.toLowerCase().trim())
      ),
    [queryText, competitions]
  );

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

          {!loading && filtered.length === 0 && (
            <Text style={styles.loadingText}>
              No competitions yet — create one or wait for an invite!
            </Text>
          )}

          {filtered.map(comp => (
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

  card: {
    backgroundColor: '#262626',
    borderRadius: 16,
    height: 150,
    marginBottom: 24,
    overflow: 'hidden',
  },
  bgIcon: { position: 'absolute', right: 12, bottom: 12 },

  cardContent: { flex: 1, padding: 20, justifyContent: 'space-between' },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },

  seeMoreRow: { flexDirection: 'row', alignItems: 'center' },
  seeMoreText: { fontSize: 16, fontWeight: '700', color: '#A4D65E' },
  seeMoreArrow: { fontSize: 20, fontWeight: '700', color: '#A4D65E', marginLeft: 4 },
});