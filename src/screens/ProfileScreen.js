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
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);

  // Tab state - check if we should open friends tab from navigation params
  const [activeTab, setActiveTab] = useState(() => {
    return route?.params?.tab === 'friends' ? 'friends' : 'profile';
  });
  
  // Update tab when navigation params change
  useEffect(() => {
    if (route?.params?.tab === 'friends') {
      setActiveTab('friends');
    }
  }, [route?.params?.tab]);

  // Profile state - with wins/losses that are READ-ONLY from Firestore
  const [profile, setProfile] = useState({
    username: '',
    handle: '',
    favouriteWorkout: '',
    wins: 0,
    losses: 0,
    totals: 0,
    friends: [],
    lastUpdated: null,
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

  /* ----- Real-time profile subscription with wins/losses ----- */
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);

    const unsub = onSnapshot(ref, 
      snap => {
        if (snap.exists()) {
          const userData = snap.data();
          setProfile({
            username: userData.username || '',
            handle: userData.handle || '',
            favouriteWorkout: userData.favouriteWorkout || '',
            wins: userData.wins || 0,
            losses: userData.losses || 0,
            totals: userData.totals || 0,
            friends: userData.friends || [],
            lastUpdated: userData.lastUpdated,
          });
          
          // Fetch friend details when friends array changes
          if (userData.friends?.length > 0) {
            fetchFriendsDetails(userData.friends);
          } else {
            setFriendsList([]);
          }
        } else {
          // Create initial user profile without wins/losses (backend will manage those)
          const initialData = {
            username: user.displayName || user.email.split('@')[0],
            handle: (user.displayName || user.email.split('@')[0]).replace(/\s+/g, '').toLowerCase(),
            favouriteWorkout: '',
            wins: 0,
            losses: 0,
            totals: 0,
            friends: [],
          };
          setDoc(ref, initialData)
            .then(() => console.log('User profile created'))
            .catch(error => console.error('Error creating user profile:', error));
        }
        setLoading(false);
      },
      error => {
        console.error('Error in profile subscription:', error);
        setLoading(false);
      }
    );

    // Monitor friend requests for removal notifications
    const requestsRef = collection(db, 'users', user.uid, 'friendRequests');
    const requestsUnsub = onSnapshot(requestsRef, 
      async (snapshot) => {
        for (const docSnap of snapshot.docs) {
          const requestData = docSnap.data();
          
          // Handle friend removal notifications
          if (requestData.type === 'friend_removed') {
            try {
              // Update the local profile state
              setProfile(prev => ({
                ...prev,
                friends: prev.friends.filter(id => id !== requestData.fromUserId)
              }));
              
              // Update in Firestore
              await updateDoc(doc(db, 'users', user.uid), {
                friends: arrayRemove(requestData.fromUserId),
              });
              
              // Delete the processed notification
              await deleteDoc(docSnap.ref);
            } catch (error) {
              console.error('Error processing friend removal:', error);
            }
          }
        }
      }
    );

    return () => {
      unsub();
      requestsUnsub();
    };
  }, [user]);

  /* ----- Friend requests subscription ----- */
  useEffect(() => {
    if (!user) return;
    
    const requestsRef = collection(db, 'users', user.uid, 'friendRequests');
    const unsub = onSnapshot(requestsRef, 
      async (snapshot) => {
        const requests = [];
        
        for (const docSnap of snapshot.docs) {
          const requestData = docSnap.data();
          
          // Skip friend removal notifications
          if (requestData.type === 'friend_removed') {
            continue;
          }
          
          // If this is an accepted request, automatically add to friends
          if (requestData.accepted) {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                friends: arrayUnion(requestData.fromUserId),
              });
              // Delete the processed request
              await deleteDoc(docSnap.ref);
              continue;
            } catch (error) {
              console.error('Error processing accepted request:', error);
            }
          }
          
          // Fetch sender's details for regular requests
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
      },
      error => {
        console.error('Error in friend requests subscription:', error);
      }
    );

    return unsub;
  }, [user]);

  /* ----- Sent requests subscription ----- */
  useEffect(() => {
    if (!user) return;
    
    const sentRequestsRef = collection(db, 'users', user.uid, 'sentRequests');
    const unsub = onSnapshot(sentRequestsRef, 
      async (snapshot) => {
        const requests = [];
        
        for (const docSnap of snapshot.docs) {
          const requestData = docSnap.data();
          
          try {
            const recipientDoc = await getDoc(doc(db, 'users', requestData.toUserId));
            if (recipientDoc.exists()) {
              const recipientData = recipientDoc.data();
              
              // Check if we're already friends
              if (profile.friends?.includes(requestData.toUserId)) {
                // Clean up the sent request
                await deleteDoc(docSnap.ref);
                continue;
              }
              
              requests.push({
                id: docSnap.id,
                ...requestData,
                recipientData: recipientData,
              });
            } else {
              // Recipient doesn't exist, clean up
              await deleteDoc(docSnap.ref);
            }
          } catch (error) {
            console.error('Error fetching recipient data:', error);
          }
        }
        
        setSentRequests(requests);
      },
      error => {
        console.error('Error in sent requests subscription:', error);
      }
    );

    return unsub;
  }, [user, profile.friends]);

  /* ----- Fetch friends details ----- */
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

  /* ----- Profile edit handlers (only for favouriteWorkout) ----- */
  const startEdit = () => { 
    setDraft({ favouriteWorkout: profile.favouriteWorkout }); 
    setEditing(true); 
  };
  
  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    try {
      const ref = doc(db, 'users', user.uid);
      // Only update favourite workout - wins/losses are backend-managed
      await updateDoc(ref, {
        favouriteWorkout: draft.favouriteWorkout || ''
      });
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile changes');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => signOut(auth) }
      ]
    );
  };

  /* ----- Friends handlers ----- */
  const findUserByUsername = async (username) => {
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) return null;

    try {
      // Check username in usernames collection
      const usernameDoc = await getDoc(doc(db, 'usernames', trimmedUsername));
      
      if (!usernameDoc.exists()) {
        return null;
      }
      
      const { uid } = usernameDoc.data();
      
      // Fetch full user profile
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return {
        id: uid,
        ...userDoc.data(),
      };
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

    if (username.toLowerCase() === profile.username.toLowerCase()) {
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
      let requestAlreadySent = false;
      try {
        const sentRequestsSnapshot = await getDocs(collection(db, 'users', user.uid, 'sentRequests'));
        requestAlreadySent = sentRequestsSnapshot.docs.some(doc => 
          doc.data().toUserId === targetUser.id
        );
      } catch (error) {
        console.log('Error checking sent requests:', error);
      }
      
      if (requestAlreadySent) {
        Alert.alert('Request Already Sent', `You have already sent a friend request to ${targetUser.username}`);
        return;
      }

      // Send friend request
      const friendRequestData = {
        fromUserId: user.uid,
        fromUsername: profile.username,
        timestamp: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'users', targetUser.id, 'friendRequests'), friendRequestData);

      // Store sent request
      const sentRequestData = {
        toUserId: targetUser.id,
        toUsername: targetUser.username,
        fromUserId: user.uid,
        timestamp: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'users', user.uid, 'sentRequests'), sentRequestData);

      setFriendUsername('');
      Alert.alert('Success', `Friend request sent to ${targetUser.username}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  const acceptFriendRequest = async (request) => {
    try {
      // Add to friends
      const myRef = doc(db, 'users', user.uid);
      await updateDoc(myRef, {
        friends: arrayUnion(request.fromUserId),
      });

      // Delete the request
      await deleteDoc(doc(db, 'users', user.uid, 'friendRequests', request.id));

      // Create reciprocal accepted request
      try {
        await addDoc(collection(db, 'users', request.fromUserId, 'friendRequests'), {
          fromUserId: user.uid,
          fromUsername: profile.username,
          timestamp: serverTimestamp(),
          accepted: true,
        });
      } catch (error) {
        console.log('Could not create reciprocal request:', error);
      }

      Alert.alert('Success', `You are now friends with ${request.senderData.username}!`);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  const rejectFriendRequest = async (request) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'friendRequests', request.id));
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
              await deleteDoc(doc(db, 'users', user.uid, 'sentRequests', request.id));
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
              // Remove from friends list
              const myRef = doc(db, 'users', user.uid);
              await updateDoc(myRef, {
                friends: arrayRemove(friend.id),
              });

              // Notify friend of removal
              try {
                await addDoc(collection(db, 'users', friend.id, 'friendRequests'), {
                  fromUserId: user.uid,
                  fromUsername: profile.username,
                  timestamp: serverTimestamp(),
                  type: 'friend_removed',
                });
              } catch (error) {
                console.log('Could not notify friend of removal:', error);
              }

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

  // Calculate win rate
  const getWinRate = () => {
    const total = profile.wins + profile.losses;
    if (total === 0) return 'N/A';
    const rate = (profile.wins / total) * 100;
    return `${Math.round(rate)}%`;
  };

  // Format last updated time
  const getLastUpdatedText = () => {
    if (!profile.lastUpdated) return null;
    
    const date = profile.lastUpdated.toDate ? profile.lastUpdated.toDate() : new Date(profile.lastUpdated);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Updated just now';
    if (diffMins < 60) return `Updated ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `Updated ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `Updated ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return `Updated on ${date.toLocaleDateString()}`;
  };

  if (loading) return null;

  const renderProfileTab = () => (
   // Replace the Profile section in renderProfileTab with:
<ScrollView style={styles.scrollView}>
  {/* Profile header with proper spacing */}
  <View style={styles.profileCard}>
    <View style={styles.profileImageContainer}>
      <Ionicons name="person" size={38} color="#FFFFFF" />
    </View>
    <View style={styles.profileInfo}>
      <Text style={styles.profileName} numberOfLines={1}>
        {profile.username}
      </Text>
      <Text style={styles.profileUsername}>@{profile.handle}</Text>
    </View>
  </View>

  {/* Hero Row - Equal height cards */}
  <View style={styles.highlightCardsContainer}>
    {/* Favourite Workout Card */}
    <View style={[styles.highlightCard, styles.favouriteWorkoutCard]}>
      <View>
        <Text style={styles.favouriteWorkoutLabel}>Favourite Workout</Text>
        <Text style={styles.favouriteWorkoutValue} numberOfLines={1}>
          {profile.favouriteWorkout || 'Running'}
        </Text>
      </View>
      <View style={styles.favouriteWorkoutIconContainer}>
        <Ionicons name="fitness" size={52} color="#A4D65E" />
      </View>
    </View>
    
    {/* Competitions Won Card */}
    <View style={[styles.highlightCard, styles.competitionsWonCard]}>
      <View>
        <Text style={styles.competitionsWonLabel}>Competitions Won</Text>
        <Text style={styles.competitionsWonValue} numberOfLines={1}>
          {profile.wins} Wins
        </Text>
      </View>
      <View style={styles.competitionsWonIconContainer}>
        <Ionicons name="trophy" size={44} color="#FFFFFF" />
      </View>
    </View>
  </View>

  {/* Stats Section with proper sizing */}
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Stats</Text>
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <View style={styles.statNumberContainer}>
          <Text style={styles.statNumber} numberOfLines={1}>
            {profile.losses}
          </Text>
        </View>
        <Text style={styles.statLabel}>Losses</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={styles.statNumberContainer}>
          <Text style={styles.statNumber} numberOfLines={1}>
            {getWinRate()}
          </Text>
        </View>
        <Text style={styles.statLabel}>Win Rate</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={styles.statNumberContainer}>
          <Text style={styles.statNumber} numberOfLines={1}>
            {profile.wins + profile.losses}
          </Text>
        </View>
        <Text style={styles.statLabelTwoLine}>
          Total{'\n'}Competitions
        </Text>
      </View>
    </View>
    
    {profile.lastUpdated && (
      <Text style={styles.lastUpdatedText}>{getLastUpdatedText()}</Text>
    )}
  </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountOptions}>
          <TouchableOpacity 
            style={styles.accountOption} 
            onPress={() => navigation.navigate('ChangeCredentials')}
          >
            <View style={styles.accountOptionIcon}>
              <Ionicons name="key" size={24} color="#6B7280" />
            </View>
            <View style={styles.accountOptionContent}>
              <Text style={styles.accountOptionTitle}>Change Password/Email</Text>
              <Text style={styles.accountOptionSubtitle}>Update your account credentials</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.accountOption, { borderBottomWidth: 0 }]} onPress={handleLogout}>
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

      {/* Pending Requests */}
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

      {/* Sent Requests */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#F0F9E8',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#A4D65E',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Common
  scrollView: { 
    flex: 1, 
    paddingHorizontal: 20  // Container padding: 20pt
  },
  section: { 
    marginTop: 24  // Vertical section spacing: 24pt
  },
  sectionTitle: { 
    fontSize: 20,  // Section title: 20pt
    fontWeight: '600', 
    color: '#000000', 
    marginBottom: 8  // 8pt bottom margin
  },
  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { color: '#6B7280', fontSize: 14 },

  // Profile Header - Proper sizing
  profileCard: { 
    backgroundColor: 'transparent', 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 24,  // 24pt gap to hero row
  },
  profileImageContainer: { 
    width: 72,  // Avatar: 72pt diameter
    height: 72, 
    borderRadius: 36, 
    backgroundColor: '#FF6B6B', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,  // 16pt gap from avatar to name
    borderWidth: 6,  // 6pt ring
    borderColor: '#A4D65E',
  },
  profileInfo: { flex: 1 },
  profileName: { 
    fontSize: 30,  // Name: 28-32pt
    fontWeight: '600', 
    color: '#000000',
    lineHeight: 36,
  },
  profileUsername: { 
    fontSize: 15,  // Handle: 14-16pt
    fontWeight: '500',
    color: '#6B7280', 
    marginTop: 2 
  },
  
  // Hero Row - Two equal cards
  highlightCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,  // Gap between columns: 16pt
    marginBottom: 24,  // 24pt gap to stats section
  },
  highlightCard: {
    flex: 1,
    borderRadius: 24,  // Corner radius: 24pt
    padding: 16,  // Inner padding: 16pt
    height: 172,  // Card height: 168-176pt
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  favouriteWorkoutCard: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  competitionsWonCard: {
    backgroundColor: '#A4D65E',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  // Favourite Workout Card Content
  favouriteWorkoutContent: {
    flex: 1,
  },
  favouriteWorkoutLabel: {
    fontSize: 14,  // Top label: 14pt
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  favouriteWorkoutValue: {
    fontSize: 28,  // Value: 28pt
    fontWeight: '600',
    color: '#A4D65E',
  },
  favouriteWorkoutIconContainer: {
    alignItems: 'flex-start',
  },
  
  // Competitions Won Card Content
  competitionsWonContent: {
    flex: 1,
    alignItems: 'center',
  },
  competitionsWonLabel: {
    fontSize: 16,  // Title: 16pt
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  competitionsWonValue: {
    fontSize: 32,  // Value: 32pt
    fontWeight: '600',
    color: '#FFFFFF',
  },
  competitionsWonIconContainer: {
    alignItems: 'center',
    marginBottom: 16,  // 16pt bottom inset
  },
  
  // Stats Grid - Three equal cards
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,  // Gap between cards: 12pt
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,  // Corner radius: 16pt
    padding: 12,  // Inner padding: 12pt
    height: 128,  // Card height: 128pt
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statNumberContainer: {
    backgroundColor: '#E8F5D6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,  // Value number: 28pt
    fontWeight: '600',
    color: '#000000',
  },
  statLabel: {
    fontSize: 14,  // Label: 12-14pt (using 14pt, value is 28pt = 2x)
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 18,
  },
  lastUpdatedText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  
  // About You section - Keep existing
  statsContainer: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 16 
  },
  statItem: { marginBottom: 16 },
  statLabelSmall: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 4 
  },
  statValueContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  statValue: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#1A1E23', 
    flex: 1 
  },
  editableInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#A4D65E',
    paddingVertical: 4,
  },
  statIcon: { marginLeft: 8 },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  editBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A4D65E',
  },
  saveBtn: {
    backgroundColor: '#A4D65E',
  },
  editBtnText: { color: '#A4D65E', fontWeight: '600' },
  saveBtnText: { color: '#FFFFFF' },
  
  // Account Options - Keep existing
  accountOptions: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  accountOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  accountOptionIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  accountOptionContent: { flex: 1 },
  accountOptionTitle: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#1A1E23' 
  },
  accountOptionSubtitle: { 
    fontSize: 12, 
    color: '#6B7280', 
    marginTop: 2 
  },

  // Friends Tab - Keep existing
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