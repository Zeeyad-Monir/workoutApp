import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Header } from '../components';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
  return (
    <View style={styles.container}>
      <Header title="Username" showProfileIcon={true} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
              <Ionicons name="person-circle" size={60} color="#A4D65E" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Zeeyad Monir</Text>
              <Text style={styles.profileUsername}>@zeemon</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Favourite Workout</Text>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>Running</Text>
                <Ionicons name="fitness" size={24} color="#A4D65E" style={styles.statIcon} />
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Competitions Won</Text>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>3 Wins</Text>
                <Ionicons name="trophy" size={24} color="#A4D65E" style={styles.statIcon} />
              </View>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Competitions</Text>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>5 Total</Text>
                <Ionicons name="stats-chart" size={24} color="#A4D65E" style={styles.statIcon} />
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.accountOptions}>
            <TouchableOpacity style={styles.accountOption}>
              <View style={styles.accountOptionIcon}>
                <Ionicons name="person" size={24} color="#6B7280" />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={styles.accountOptionTitle}>My Account</Text>
                <Text style={styles.accountOptionSubtitle}>Make changes to your account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountOption}>
              <View style={styles.accountOptionIcon}>
                <Ionicons name="location" size={24} color="#6B7280" />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={styles.accountOptionTitle}>Allow location</Text>
                <Text style={styles.accountOptionSubtitle}>Manage your saved account</Text>
              </View>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleOff} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountOption}>
              <View style={styles.accountOptionIcon}>
                <Ionicons name="finger-print" size={24} color="#6B7280" />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={styles.accountOptionTitle}>Face ID / Touch ID</Text>
                <Text style={styles.accountOptionSubtitle}>Manage your device security</Text>
              </View>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleOff} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountOption}>
              <View style={styles.accountOptionIcon}>
                <Ionicons name="lock-closed" size={24} color="#6B7280" />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={styles.accountOptionTitle}>Two-Factor Authentication</Text>
                <Text style={styles.accountOptionSubtitle}>Further secure your account for safety</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountOption}>
              <View style={styles.accountOptionIcon}>
                <Ionicons name="log-out" size={24} color="#6B7280" />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={styles.accountOptionTitle}>Log out</Text>
                <Text style={styles.accountOptionSubtitle}>Further secure your account for safety</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          <View style={styles.accountOptions}>
            <TouchableOpacity style={styles.accountOption}>
              <View style={styles.accountOptionIcon}>
                <Ionicons name="help-circle" size={24} color="#6B7280" />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={styles.accountOptionTitle}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.accountOption}>
              <View style={styles.accountOptionIcon}>
                <Ionicons name="information-circle" size={24} color="#6B7280" />
              </View>
              <View style={styles.accountOptionContent}>
                <Text style={styles.accountOptionTitle}>About App</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1E23',
    marginBottom: 12,
  },
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
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1E23',
  },
  profileUsername: {
    fontSize: 14,
    color: '#1A1E23',
    opacity: 0.8,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1E23',
  },
  statIcon: {
    marginLeft: 8,
  },
  accountOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
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
  accountOptionContent: {
    flex: 1,
  },
  accountOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1E23',
  },
  accountOptionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  toggleContainer: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOff: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
});

export default ProfileScreen;
