import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Dropdown = ({ label, selectedValue, onValueChange, items }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (value) => {
    onValueChange(value);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={toggleDropdown}
        activeOpacity={0.8}
      >
        <Text style={styles.selectedText}>{selectedValue}</Text>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#1A1E23" 
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.optionsContainer}>
          {items.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.optionItem,
                selectedValue === item && styles.selectedOption
              ]}
              onPress={() => handleSelect(item)}
            >
              <Text 
                style={[
                  styles.optionText,
                  selectedValue === item && styles.selectedOptionText
                ]}
              >
                {item}
              </Text>
              {selectedValue === item && (
                <Ionicons name="checkmark" size={20} color="#A4D65E" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    color: '#1A1E23',
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedText: {
    fontSize: 16,
    color: '#1A1E23',
  },
  optionsContainer: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2,
  },
  optionItem: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#F9FAF9',
  },
  optionText: {
    fontSize: 16,
    color: '#1A1E23',
  },
  selectedOptionText: {
    color: '#A4D65E',
    fontWeight: '500',
  },
});

export default Dropdown;
