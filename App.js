// 👇 Must be first
import 'react-native-gesture-handler';

import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Create Bottom Tab Navigator
const Tab = createBottomTabNavigator();

function CustomHeader({ username, profilePic }) {
  return (
    <View style={styles.header}>
      <Text style={styles.username}>{username}</Text>
      <TouchableOpacity onPress={() => Alert.alert('Profile Clicked')}>
        <Image source={{ uri: profilePic }} style={styles.profilePic} />
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen() {
  const [posts, setPosts] = useState([
    { id: 1, title: 'Post 1' },
    { id: 2, title: 'Post 2' },
    { id: 3, title: 'Post 3' },
    { id: 4, title: 'Post 4' },
    { id: 5, title: 'Post 5' },
    { id: 6, title: 'Post 6' },
  ]);

  const handleAddPost = () => {
    const newPostId = posts.length + 1;
    setPosts([...posts, { id: newPostId, title: `Post ${newPostId}` }]);
  };

  return (
    <View style={styles.container}>
      <CustomHeader
        username="JohnDoe"
        profilePic="https://randomuser.me/api/portraits/men/1.jpg"
      />
      <Text style={styles.text}>Welcome</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.postsContainer}
      >
        {posts.map(post => (
          <TouchableOpacity
            key={post.id}
            style={styles.post}
            onPress={() => Alert.alert('Post Clicked', post.title)}
          >
            <Text style={styles.postText}>{post.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Button title="Click Me" onPress={handleAddPost} />
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={styles.container}>
      <CustomHeader
        username="JohnDoe"
        profilePic="https://randomuser.me/api/portraits/men/1.jpg"
      />
      <Text style={styles.text}>Settings</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.container}>
      <CustomHeader
        username="JohnDoe"
        profilePic="https://randomuser.me/api/portraits/men/1.jpg"
      />
      <Text style={styles.text}>Profile</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 60,
    backgroundColor: '#6200ea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  username: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: 70,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
  },
  postsContainer: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  post: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 15,
    alignSelf: 'stretch',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  postText: {
    fontSize: 18,
    color: '#333',
  },
});