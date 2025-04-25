import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Header, Button, FormInput, Dropdown, DatePicker } from '../components';
import { Ionicons } from '@expo/vector-icons';

const CompetitionCreationScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 1 week from now
  const [competitionType, setCompetitionType] = useState('Running');
  const [pointsSystem, setPointsSystem] = useState('Distance');
  
  const competitionTypes = ['Running', 'Cycling', 'Swimming', 'Weightlifting', 'Mixed'];
  const pointsSystems = ['Distance', 'Duration', 'Calories Burned', 'Custom'];
  
  const handleCreateCompetition = () => {
    // In a real app, this would save the competition data
    // For now, just navigate back to the competitions list
    navigation.navigate('HomeStack');
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Create Competition" 
        showBackButton={true} 
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.formContainer}>
        <Text style={styles.sectionTitle}>Competition Details</Text>
        
        <FormInput
          label="Competition Name"
          value={name}
          onChangeText={setName}
          placeholder="Enter competition name"
        />
        
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <DatePicker
              label="Start Date"
              date={startDate}
              onDateChange={setStartDate}
            />
          </View>
          <View style={styles.dateField}>
            <DatePicker
              label="End Date"
              date={endDate}
              onDateChange={setEndDate}
            />
          </View>
        </View>
        
        <Dropdown
          label="Competition Type"
          selectedValue={competitionType}
          onValueChange={setCompetitionType}
          items={competitionTypes}
        />
        
        <Dropdown
          label="Points System"
          selectedValue={pointsSystem}
          onValueChange={setPointsSystem}
          items={pointsSystems}
        />
        
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your competition..."
          placeholderTextColor="#999"
        />
        
        <Text style={styles.sectionTitle}>Invite Participants</Text>
        
        <View style={styles.participantsContainer}>
          <View style={styles.participant}>
            <View style={styles.participantIcon}>
              <Ionicons name="person-circle" size={40} color="#A4D65E" />
            </View>
            <Text style={styles.participantName}>Bryce</Text>
            <TouchableOpacity style={styles.removeButton}>
              <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.participant}>
            <View style={styles.participantIcon}>
              <Ionicons name="person-circle" size={40} color="#A4D65E" />
            </View>
            <Text style={styles.participantName}>Noah</Text>
            <TouchableOpacity style={styles.removeButton}>
              <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.addParticipantButton}>
            <Ionicons name="add-circle" size={40} color="#A4D65E" />
            <Text style={styles.addParticipantText}>Add Participant</Text>
          </TouchableOpacity>
        </View>
        
        <Button 
          title="Create Competition" 
          onPress={handleCreateCompetition} 
          style={styles.createButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1E23',
    marginTop: 20,
    marginBottom: 15,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateField: {
    width: '48%',
  },
  label: {
    fontSize: 16,
    color: '#1A1E23',
    marginBottom: 8,
    marginTop: 16,
  },
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
  participantsContainer: {
    marginTop: 10,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  participantIcon: {
    marginRight: 10,
  },
  participantName: {
    flex: 1,
    fontSize: 16,
    color: '#1A1E23',
  },
  removeButton: {
    padding: 5,
  },
  addParticipantButton: {
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
  addParticipantText: {
    fontSize: 16,
    color: '#A4D65E',
    marginLeft: 10,
  },
  createButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default CompetitionCreationScreen;
