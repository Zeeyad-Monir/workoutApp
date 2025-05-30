//ProfileScreen.js

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
  getDoc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function ProfileScreen() {
  const { user } = useContext(AuthContext);

  // Tab state
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [profile, setProfile] = useState({
    username: '',
    handle: '',
    favouriteWorkout: '',
    wins: 0,
    totals: 0,
    friends: [],
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
        setProfile(userData);
        // Fetch friend details when friends array changes
        if (userData.friends?.length > 0) {
          fetchFriendsDetails(userData.friends);
        } else {
          setFriendsList([]);
        }
      } else {
        // create doc using the username provided at sign‑up
        setDoc(ref, {
          username: user.displayName || user.email.split('@')[0],
          handle: (user.displayName || user.email.split('@')[0]).replace(/\s+/g, '').toLowerCase(),
          favouriteWorkout: '',
          wins: 0,
          totals: 0,
          friends: [],
        });
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  /* ----- live friend requests subscription ----- */
  useEffect(() => {
    if (!user) return;
    
    const requestsRef = collection(db, 'users', user.uid, 'friendRequests');
    const unsub = onSnapshot(requestsRef, async (snapshot) => {
      const requests = [];
      
      for (const docSnap of snapshot.docs) {
        const requestData = docSnap.data();
        // Fetch sender's details
        try {
          const senderDoc = await getDoc(doc(db, 'users', requestData.fromUserId));
          if (senderDoc.exists()) {
            requests.push({
              id: docSnap.id,
              ...requestData,
              senderData: senderDoc.data(),
            });
          }
        } catch (error) {
          console.error('Error fetching sender data:', error);
        }
      }
      
      setPendingRequests(requests);
    });

    return unsub;
  }, [user]);

  /* ----- live sent requests subscription ----- */
  useEffect(() => {
    if (!user) return;
    
    const sentRequestsRef = collection(db, 'users', user.uid, 'sentRequests');
    const unsub = onSnapshot(sentRequestsRef, async (snapshot) => {
      const requests = [];
      
      for (const docSnap of snapshot.docs) {
        const requestData = docSnap.data();
        // Fetch recipient's details
        try {
          const recipientDoc = await getDoc(doc(db, 'users', requestData.toUserId));
          if (recipientDoc.exists()) {
            requests.push({
              id: docSnap.id,
              ...requestData,
              recipientData: recipientDoc.data(),
            });
          }
        } catch (error) {
          console.error('Error fetching recipient data:', error);
        }
      }
      
      setSentRequests(requests);
    });

    return unsub;
  }, [user]);

  /* ----- fetch friends details ----- */
  const fetchFriendsDetails = async (friendIds) => {
    if (!friendIds || friendIds.length === 0) {
      setFriendsList([]);
      return;
    }

    setLoadingFriends(true);
    try {
      const friendsData = [];
      for (const friendId of friendIds) {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          friendsData.push({
            id: friendId,
            ...friendDoc.data(),
          });
        }
      }
      setFriendsList(friendsData);
    } catch (error) {
      console.error('Error fetching friends details:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  /* ----- profile handlers ----- */
  const startEdit = () => { setDraft(profile); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, draft);
    setEditing(false);
  };

  const handleLogout = () => signOut(auth);

  /* ----- friends handlers ----- */
  const findUserByUsername = async (username) => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return null;

    try {
      const q = query(collection(db, 'users'), where('username', '==', trimmedUsername));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        return {
          id: snapshot.docs[0].id,
          ...userData,
        };
      }
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  };

  const sendFriendRequest = async () => {
    const username = friendUsername.trim();
    if (!username) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (username === profile.username) {
      Alert.alert('Error', "You can't send a friend request to yourself");
      return;
    }

    try {
      const targetUser = await findUserByUsername(username);
      if (!targetUser) {
        Alert.alert('User Not Found', `No user found with username "${username}"`);
        return;
      }

      // Check if already friends
      if (profile.friends?.includes(targetUser.id)) {
        Alert.alert('Already Friends', `You are already friends with ${targetUser.username}`);
        return;
      }

      // Check if request already sent
      const existingRequestQuery = query(
        collection(db, 'users', targetUser.id, 'friendRequests'),
        where('fromUserId', '==', user.uid)
      );
      const existingRequests = await getDocs(existingRequestQuery);
      
      if (!existingRequests.empty) {
        Alert.alert('Request Already Sent', `You have already sent a friend request to ${targetUser.username}`);
        return;
      }

      const timestamp = new Date();

      // Send friend request to recipient
      await addDoc(collection(db, 'users', targetUser.id, 'friendRequests'), {
        fromUserId: user.uid,
        fromUsername: profile.username,
        timestamp: timestamp,
      });

      // Store sent request in sender's collection
      await addDoc(collection(db, 'users', user.uid, 'sentRequests'), {
        toUserId: targetUser.id,
        toUsername: targetUser.username,
        timestamp: timestamp,
      });

      setFriendUsername('');
      Alert.alert('Success', `Friend request sent to ${targetUser.username}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  const acceptFriendRequest = async (request) => {
    try {
      // Add to both users' friends arrays
      const myRef = doc(db, 'users', user.uid);
      const friendRef = doc(db, 'users', request.fromUserId);
      
      await updateDoc(myRef, {
        friends: arrayUnion(request.fromUserId),
      });
      
      await updateDoc(friendRef, {
        friends: arrayUnion(user.uid),
      });

      // Delete the friend request from recipient's collection
      await deleteDoc(doc(db, 'users', user.uid, 'friendRequests', request.id));

      // Delete the sent request from sender's collection
      const sentRequestQuery = query(
        collection(db, 'users', request.fromUserId, 'sentRequests'),
        where('toUserId', '==', user.uid)
      );
      const sentRequestDocs = await getDocs(sentRequestQuery);
      sentRequestDocs.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      Alert.alert('Success', `You are now friends with ${request.senderData.username}!`);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  const rejectFriendRequest = async (request) => {
    try {
      // Delete the friend request from recipient's collection
      await deleteDoc(doc(db, 'users', user.uid, 'friendRequests', request.id));

      // Delete the sent request from sender's collection
      const sentRequestQuery = query(
        collection(db, 'users', request.fromUserId, 'sentRequests'),
        where('toUserId', '==', user.uid)
      );
      const sentRequestDocs = await getDocs(sentRequestQuery);
      sentRequestDocs.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      Alert.alert('Request Declined', `Friend request from ${request.senderData.username} has been declined.`);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Error', 'Failed to reject friend request. Please try again.');
    }
  };

  const cancelSentRequest = async (request) => {
    Alert.alert(
      'Cancel Request',
      `Are you sure you want to cancel your friend request to ${request.recipientData.username}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the sent request from sender's collection
              await deleteDoc(doc(db, 'users', user.uid, 'sentRequests', request.id));

              // Delete the friend request from recipient's collection
              const friendRequestQuery = query(
                collection(db, 'users', request.toUserId, 'friendRequests'),
                where('fromUserId', '==', user.uid)
              );
              const friendRequestDocs = await getDocs(friendRequestQuery);
              friendRequestDocs.forEach(async (docSnap) => {
                await deleteDoc(docSnap.ref);
              });

              Alert.alert('Request Cancelled', `Friend request to ${request.recipientData.username} has been cancelled.`);
            } catch (error) {
              console.error('Error cancelling sent request:', error);
              Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
            }
          },
        },
      ]
    );
  };

  const removeFriend = (friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const myRef = doc(db, 'users', user.uid);
              const friendRef = doc(db, 'users', friend.id);
              
              await updateDoc(myRef, {
                friends: arrayRemove(friend.id),
              });
              
              await updateDoc(friendRef, {
                friends: arrayRemove(user.uid),
              });

              Alert.alert('Success', `${friend.username} has been removed from your friends.`);
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend. Please try again.');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (profile.friends?.length > 0) {
        await fetchFriendsDetails(profile.friends);
      }
    } catch (error) {
      console.error('Error refreshing friends:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return null;

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
      {/* Add Friend Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Friend</Text>
        <View style={styles.addFriendContainer}>
          <Text style={styles.addFriendSubtext}>Search by username to send a friend request</Text>
          <View style={styles.addFriendRow}>
            <TextInput
              style={styles.addFriendInput}
              placeholder="Enter username"
              value={friendUsername}
              onChangeText={setFriendUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={sendFriendRequest} style={styles.addFriendButton}>
              <Ionicons name="person-add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests ({pendingRequests.length})</Text>
          <View style={styles.requestsContainer}>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestItem}>
                <View style={styles.requestUserInfo}>
                  <Ionicons name="person-circle" size={40} color="#A4D65E" />
                  <View style={styles.requestUserText}>
                    <Text style={styles.requestUsername}>{request.senderData.username}</Text>
                    <Text style={styles.requestSubtext}>wants to be friends</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => acceptFriendRequest(request)}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.requestButton, styles.rejectButton]}
                    onPress={() => rejectFriendRequest(request)}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Sent Requests Section */}
      {sentRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sent Requests ({sentRequests.length})</Text>
          <View style={styles.requestsContainer}>
            {sentRequests.map((request) => (
              <View key={request.id} style={styles.requestItem}>
                <View style={styles.requestUserInfo}>
                  <Ionicons name="person-circle" size={40} color="#A4D65E" />
                  <View style={styles.requestUserText}>
                    <Text style={styles.requestUsername}>{request.recipientData.username}</Text>
                    <Text style={styles.requestSubtext}>request pending</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.requestButton, styles.cancelButton]}
                  onPress={() => cancelSentRequest(request)}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Friends List Section */}
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
            <Text style={styles.emptySubtext}>Add friends to see them here</Text>
          </View>
        ) : (
          <View style={styles.friendsContainer}>
            {friendsList.map((friend) => (
              <View key={friend.id} style={styles.friendItem}>
                <View style={styles.friendUserInfo}>
                  <Ionicons name="person-circle" size={40} color="#A4D65E" />
                  <View style={styles.friendUserText}>
                    <Text style={styles.friendUsername}>{friend.username}</Text>
                    <Text style={styles.friendSubtext}>@{friend.handle}</Text>
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
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            Profile
          </Text>
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
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
          {pendingRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'profile' ? renderProfileTab() : renderFriendsTab()}
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
  activeTab: {
    backgroundColor: '#F0F9E8',
  },
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

  // Common
  scrollView: { flex: 1, paddingHorizontal: 16 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1E23', marginBottom: 12 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { color: '#6B7280', fontSize: 16 },

  // Profile Tab
  profileCard: { backgroundColor: '#A4D65E', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
  profileImageContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#1A1E23' },
  profileUsername: { fontSize: 14, color: '#1A1E23', opacity: 0.8 },
  statsContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  statItem: { marginBottom: 16 },
  statLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  statValueContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '500', color: '#1A1E23' },
  statIcon: { marginLeft: 8 },
  accountOptions: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  accountOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  accountOptionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  accountOptionContent: { flex: 1 },
  accountOptionTitle: { fontSize: 16, fontWeight: '500', color: '#1A1E23' },
  accountOptionSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  editBtn: { marginLeft: 12 },
  editBtnText: { color: '#A4D65E', fontWeight: '600' },

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
  removeFriendButton: {
    padding: 8,
  },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1E23',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});