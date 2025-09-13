import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTENT_MARGIN = 20;
const ESTIMATED_CONTENT_HEIGHT = 180;

const OnboardingContent = ({
  title,
  description,
  onNext,
  onSkip,
  isLastStep,
  targetMeasurements,
  preferredPosition = 'auto',
  spotlightPadding = 0,
}) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [position, setPosition] = useState({ top: SCREEN_HEIGHT / 2 - 100 });

  useEffect(() => {
    // Calculate optimal position based on target
    if (targetMeasurements) {
      const optimalPos = calculateOptimalPosition(targetMeasurements, preferredPosition);
      setPosition(optimalPos);
    } else {
      // Center if no target
      setPosition({ top: SCREEN_HEIGHT / 2 - ESTIMATED_CONTENT_HEIGHT / 2 });
    }
    
    // Reset animations
    slideAnim.setValue(30);
    fadeAnim.setValue(0);
    
    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [targetMeasurements, title]);

  const calculateOptimalPosition = (measurements, preferred = 'auto') => {
    if (!measurements) {
      return { top: SCREEN_HEIGHT / 2 - ESTIMATED_CONTENT_HEIGHT / 2 };
    }

    const { y, height } = measurements;
    const SAFE_GAP = CONTENT_MARGIN + Math.max(spotlightPadding, 8); // ensure card never overlaps spotlight
    
    // Calculate available spaces
    const spaceAbove = y;
    const spaceBelow = SCREEN_HEIGHT - (y + height);
    
    // If a specific position is preferred, try to use it if there's enough space
    if (preferred === 'below' && spaceBelow >= ESTIMATED_CONTENT_HEIGHT + SAFE_GAP) {
      return { 
        top: y + height + SAFE_GAP,
        alignment: 'below'
      };
    } else if (preferred === 'above' && spaceAbove >= ESTIMATED_CONTENT_HEIGHT + SAFE_GAP) {
      return { 
        top: y - ESTIMATED_CONTENT_HEIGHT - SAFE_GAP,
        alignment: 'above'
      };
    }
    
    // Otherwise, determine best position automatically
    if (spaceBelow >= ESTIMATED_CONTENT_HEIGHT + SAFE_GAP) {
      // Enough space below
      return { 
        top: y + height + SAFE_GAP,
        alignment: 'below'
      };
    } else if (spaceAbove >= ESTIMATED_CONTENT_HEIGHT + SAFE_GAP) {
      // Enough space above
      return { 
        top: y - ESTIMATED_CONTENT_HEIGHT - SAFE_GAP,
        alignment: 'above'
      };
    } else {
      // Not enough space, position in largest available area
      if (spaceAbove > spaceBelow) {
        return { 
          top: Math.max(CONTENT_MARGIN, y - ESTIMATED_CONTENT_HEIGHT - SAFE_GAP),
          alignment: 'above'
        };
      } else {
        return { 
          top: Math.min(y + height + SAFE_GAP, SCREEN_HEIGHT - ESTIMATED_CONTENT_HEIGHT - CONTENT_MARGIN),
          alignment: 'below'
        };
      }
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: position.top,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        
        <View style={styles.buttonContainer}>
          {!isLastStep && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>
              {isLastStep ? "Let's Go!" : 'Next'}
            </Text>
            <Ionicons 
              name={isLastStep ? 'checkmark' : 'arrow-forward'} 
              size={20} 
              color="#FFFFFF" 
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>
        
        {/* Optional arrow pointing to target */}
        {position.alignment && targetMeasurements && (
          <View style={[
            styles.arrow,
            position.alignment === 'above' ? styles.arrowDown : styles.arrowUp,
          ]} />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: CONTENT_MARGIN,
    right: CONTENT_MARGIN,
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#444444',
    lineHeight: 22,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#A4D65E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 6,
  },
  icon: {
    marginLeft: 2,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    alignSelf: 'center',
  },
  arrowUp: {
    top: -10,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  arrowDown: {
    bottom: -10,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
});

export default OnboardingContent;
