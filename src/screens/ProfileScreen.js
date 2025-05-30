// ProfileScreen.js
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Header } from '../components';
import NotificationToggle from '../components/NotificationToggle';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  updateNotificationSettings,
  registerForPushNotificationsAsync,
  savePushTokenToProfile,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../utils/notificationUtils';

export default function ProfileScreen() {
  const { user } = useContext(AuthContext);

  // Tab state: only profile & friends
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [profile, setProfile] = useState({
    username: '',
    handle: '',
    favouriteWorkout: '',
    wins: 0,
    totals: 0,
    friends: [],
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  // Friends state
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friendUsername, setFriendUsername] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);

  /* ----- live profile subscription ----- */
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);

    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const userData = snap.data();
        if (!userData.notificationSettings) {
          userData.notificationSettings = DEFAULT_NOTIFICATION_SETTINGS;
        }
        setProfile(userData);
        if (userData.friends?.length > 0) {
          fetchFriendsDetails(userData.friends);
        } else {
          setFriendsList([]);
        }
      } else {
        setDoc(ref, {
          username: user.displayName || user.email.split('@')[0],
          handle: (user.displayName || user.email.split('@')[0])
            .replace(/\s+/g, '')
            .toLowerCase(),
          favouriteWorkout: '',
          wins: 0,
          totals: 0,
          friends: [],
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
        });
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  /* ----- live pending friend-requests subscription ----- */
  useEffect(() => {
    if (!user) return;
    const requestsRef = collection(db, 'users', user.uid, 'friendRequests');
    const unsub = onSnapshot(requestsRef, async snapshot => {
      const requests = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        try {
          const sender = await getDoc(doc(db, 'users', data.fromUserId));
          if (sender.exists()) {
            requests.push({
              id: docSnap.id,
              ...data,
              senderData: sender.data(),
            });
          }
        } catch (e) {
          console.error('Fetch sender error', e);
        }
      }
      setPendingRequests(requests);
    });
    return unsub;
  }, [user]);

  /* ----- live sent friend-requests subscription ----- */
  useEffect(() => {
    if (!user) return;
    const sentRef = collection(db, 'users', user.uid, 'sentRequests');
    const unsub = onSnapshot(sentRef, async snapshot => {
      const requests = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        try {
          const recip = await getDoc(doc(db, 'users', data.toUserId));
          if (recip.exists()) {
            requests.push({
              id: docSnap.id,
              ...data,
              recipientData: recip.data(),
            });
          }
        } catch (e) {
          console.error('Fetch recipient error', e);
        }
      }
      setSentRequests(requests);
    });
    return unsub;
  }, [user]);

  /* ----- fetch friends details ----- */
  const fetchFriendsDetails = async ids => {
    if (!ids?.length) {
      setFriendsList([]);
      return;
    }
    setLoadingFriends(true);
    try {
      const list = [];
      for (const id of ids) {
        const snap = await getDoc(doc(db, 'users', id));
        if (snap.exists()) {
          list.push({ id, ...snap.data() });
        }
      }
      setFriendsList(list);
    } catch (e) {
      console.error('Fetch friends error', e);
    } finally {
      setLoadingFriends(false);
    }
  };

  /* ----- editing handlers ----- */
  const startEdit = () => {
    setDraft(profile);
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    await updateDoc(doc(db, 'users', user.uid), draft);
    setEditing(false);
  };

  /* ----- logout ----- */
  const handleLogout = () => signOut(auth);

  /* ----- notification handlers ----- */
  const handleToggleNotification = async (setting, value) => {
    try {
      setProfile(prev => ({
        ...prev,
        notificationSettings: {
          ...prev.notificationSettings,
          [setting]: value,
        },
      }));
      await updateNotificationSettings(user.uid, { [setting]: value });
    } catch (e) {
      console.error('Toggle notif error', e);
      Alert.alert('Error', 'Could not update notification setting.');
      setProfile(prev => ({
        ...prev,
        notificationSettings: {
          ...prev.notificationSettings,
          [setting]: !value,
        },
      }));
    }
  };
  const requestNotificationPermissions = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await savePushTokenToProfile(user.uid, token);
        Alert.alert('Success', 'Notifications enabled.');
      } else {
        Alert.alert('Permission Required', 'Enable notifications in Settings.');
      }
    } catch (e) {
      console.error('Req notif perm error', e);
      Alert.alert('Error', 'Failed to enable notifications.');
    }
  };

  /* ----- friend-request handlers ----- */
  const findUserByUsername = async username => {
    const name = username.trim();
    if (!name) return null;
    const q = query(collection(db, 'users'), where('username', '==', name));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
  };

  const sendFriendRequest = async () => {
    if (!friendUsername.trim()) {
      return Alert.alert('Error', 'Enter a username');
    }
    if (friendUsername.trim() === profile.username) {
      return Alert.alert('Error', "Can't friend yourself");
    }
    const target = await findUserByUsername(friendUsername);
    if (!target) {
      return Alert.alert('Not Found', `No user "${friendUsername}"`);
    }
    if (profile.friends.includes(target.id)) {
      return Alert.alert('Already Friends', `You and ${target.username} are already friends`);
    }
    // check existing
    const existing = await getDocs(
      query(
        collection(db, 'users', target.id, 'friendRequests'),
        where('fromUserId', '==', user.uid)
      )
    );
    if (!existing.empty) {
      return Alert.alert('Pending', 'You already sent a request');
    }
    const ts = new Date();
    await addDoc(collection(db, 'users', target.id, 'friendRequests'), {
      fromUserId: user.uid,
      fromUsername: profile.username,
      timestamp: ts,
    });
    await addDoc(collection(db, 'users', user.uid, 'sentRequests'), {
      toUserId: target.id,
      toUsername: target.username,
      timestamp: ts,
    });
    setFriendUsername('');
    Alert.alert('Success', `Request sent to ${target.username}`);
  };

  const acceptFriendRequest = async req => {
    try {
      // add each other
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(req.fromUserId),
      });
      await updateDoc(doc(db, 'users', req.fromUserId), {
        friends: arrayUnion(user.uid),
      });
      // remove request
      await deleteDoc(doc(db, 'users', user.uid, 'friendRequests', req.id));
      // remove sent copy
      const sentQ = query(
        collection(db, 'users', req.fromUserId, 'sentRequests'),
        where('toUserId', '==', user.uid)
      );
      const sentSnap = await getDocs(sentQ);
      sentSnap.forEach(d => deleteDoc(d.ref));
      Alert.alert('You are now friends with ' + req.senderData.username);
    } catch (e) {
      console.error('Accept friend error', e);
      Alert.alert('Error', 'Could not accept request');
    }
  };

  const rejectFriendRequest = async req => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'friendRequests', req.id));
      const sentQ = query(
        collection(db, 'users', req.fromUserId, 'sentRequests'),
        where('toUserId', '==', user.uid)
      );
      const sentSnap = await getDocs(sentQ);
      sentSnap.forEach(d => deleteDoc(d.ref));
      Alert.alert('Request declined');
    } catch (e) {
      console.error('Reject friend error', e);
      Alert.alert('Error', 'Could not decline request');
    }
  };

  const cancelSentRequest = req => {
    Alert.alert(
      'Cancel Request',
      `Cancel request to ${req.recipientData.username}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'sentRequests', req.id));
              const q = query(
                collection(db, 'users', req.toUserId, 'friendRequests'),
                where('fromUserId', '==', user.uid)
              );
              const snap = await getDocs(q);
              snap.forEach(d => deleteDoc(d.ref));
              Alert.alert('Request cancelled');
            } catch (e) {
              console.error('Cancel sent error', e);
              Alert.alert('Error', 'Could not cancel');
            }
          },
        },
      ]
    );
  };

  const removeFriend = friend => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friend.username}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                friends: arrayRemove(friend.id),
              });
              await updateDoc(doc(db, 'users', friend.id), {
                friends: arrayRemove(user.uid),
              });
              Alert.alert('Removed ' + friend.username);
            } catch (e) {
              console.error('Remove friend error', e);
              Alert.alert('Error', 'Could not remove friend');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (profile.friends?.length) {
      await fetchFriendsDetails(profile.friends);
    }
    setRefreshing(false);
  };

  if (loading) return null;

  /* ----- render Profile tab ----- */
  const renderProfileTab = () => (
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

      {/* About You */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
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
            <View style={styles.editActionsRow}>
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

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        <View style={styles.notificationSettingsContainer}>
          <NotificationToggle
            title="Invite Pop-ups"
            description="Show pop-up alerts for friend and competition invites"
            iconName="notifications"
            value={profile.notificationSettings.invitePopups}
            onValueChange={val => handleToggleNotification('invitePopups', val)}
          />
          <NotificationToggle
            title="Sound Alerts"
            description="Play sounds when notifications arrive"
            iconName="volume-high"
            value={profile.notificationSettings.soundAlerts}
            onValueChange={val => handleToggleNotification('soundAlerts', val)}
          />
          <NotificationToggle
            title="Badge Counters"
            description="Show badge numbers on app icon"
            iconName="ellipse"
            value={profile.notificationSettings.badgeCounters}
            onValueChange={val => handleToggleNotification('badgeCounters', val)}
          />
        </View>
      </View>

      {/* Notification Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Permissions</Text>
        <View style={styles.permissionsContainer}>
          <Text style={styles.permissionsText}>
            If you're not receiving notifications, enable them in your device settings.
          </Text>
          <TouchableOpacity
            style={styles.permissionsButton}
            onPress={requestNotificationPermissions}
          >
            <Text style={styles.permissionsButtonText}>Request Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountOptions}>
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
    </ScrollView>
  );

  /* ----- render Friends tab ----- */
  const renderFriendsTab = () => (
    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#A4D65E']}
          tintColor="#A4D65E"
        />
      }
    >
      {/* Add Friend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Friend</Text>
        <View style={styles.addFriendContainer}>
          <Text style={styles.addFriendSubtext}>
            Search by username to send a friend request
          </Text>
          <View style={styles.addFriendRow}>
            <TextInput
              style={styles.addFriendInput}
              placeholder="Enter username"
              value={friendUsername}
              onChangeText={setFriendUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={sendFriendRequest} style={styles.addFriendButton}>
              <Ionicons name="person-add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pending Requests ({pendingRequests.length})
          </Text>
          <View style={styles.requestsContainer}>
            {pendingRequests.map(req => (
              <View key={req.id} style={styles.requestItem}>
                <View style={styles.requestUserInfo}>
                  <Ionicons name="person-circle" size={40} color="#A4D65E" />
                  <View style={styles.requestUserText}>
                    <Text style={styles.requestUsername}>
                      {req.senderData.username}
                    </Text>
                    <Text style={styles.requestSubtext}>wants to be friends</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => acceptFriendRequest(req)}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.rejectButton]}
                    onPress={() => rejectFriendRequest(req)}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Sent Requests ({sentRequests.length})
          </Text>
          <View style={styles.requestsContainer}>
            {sentRequests.map(req => (
              <View key={req.id} style={styles.requestItem}>
                <View style={styles.requestUserInfo}>
                  <Ionicons name="person-circle" size={40} color="#A4D65E" />
                  <View style={styles.requestUserText}>
                    <Text style={styles.requestUsername}>
                      {req.recipientData.username}
                    </Text>
                    <Text style={styles.requestSubtext}>request pending</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.requestButton, styles.cancelButton]}
                  onPress={() => cancelSentRequest(req)}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Friends List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friends ({friendsList.length})</Text>
        {loadingFriends ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : friendsList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>
              Add friends to see them here
            </Text>
          </View>
        ) : (
          <View style={styles.friendsContainer}>
            {friendsList.map(friend => (
              <View key={friend.id} style={styles.friendItem}>
                <View style={styles.friendUserInfo}>
                  <Ionicons name="person-circle" size={40} color="#A4D65E" />
                  <View style={styles.friendUserText}>
                    <Text style={styles.friendUsername}>
                      {friend.username}
                    </Text>
                    <Text style={styles.friendSubtext}>
                      @{friend.handle}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeFriendButton}
                  onPress={() => removeFriend(friend)}
                >
                  <Ionicons name="person-remove" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Header title={profile.username} showProfileIcon />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name="person"
            size={20}
            color={activeTab === 'profile' ? '#A4D65E' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'friends' ? '#A4D65E' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
          {pendingRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'profile' ? renderProfileTab() : renderFriendsTab()}
    </View>
  );
}

/* —————————————————————————————— */
/* Helper to render each stat row */
/* —————————————————————————————— */
function renderStat(label, iconName, editing, draftVal, onChange, displayVal) {
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
        <Ionicons name={iconName} size={24} color="#A4D65E" style={styles.statIcon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    position: 'relative',
  },
  activeTab: { backgroundColor: '#F0F9E8' },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#A4D65E',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Profile Tab
  scrollView: { flex: 1, paddingHorizontal: 16 },
  section: { marginTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1E23', marginBottom: 12 },

  profileCard: {
    backgroundColor: '#A4D65E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#1A1E23' },
  profileUsername: { fontSize: 14, color: '#1A1E23', opacity: 0.8 },

  statsContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  statItem: { marginBottom: 16 },
  statLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  statValueContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '500', color: '#1A1E23' },
  statIcon: { marginLeft: 8 },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  editBtn: { marginLeft: 12 },
  editBtnText: { color: '#A4D65E', fontWeight: '600' },

  // Notification Settings
  notificationSettingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  permissionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  permissionsText: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  permissionsButton: {
    backgroundColor: '#A4D65E',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  permissionsButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // Account
  accountOptions: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  accountOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountOptionContent: { flex: 1 },
  accountOptionTitle: { fontSize: 16, fontWeight: '500', color: '#1A1E23' },
  accountOptionSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Friends Tab
  addFriendContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  addFriendSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  addFriendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addFriendInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addFriendButton: {
    backgroundColor: '#A4D65E',
    borderRadius: 8,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  requestsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  requestUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestUserText: {
    marginLeft: 12,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1E23',
  },
  requestSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#A4D65E',
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },

  friendsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  friendUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendUserText: {
    marginLeft: 12,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1E23',
  },
  friendSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  removeFriendButton: { padding: 8 },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: { fontSize: 18, fontWeight: '500', color: '#1A1E23', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { color: '#6B7280', fontSize: 16 },
});