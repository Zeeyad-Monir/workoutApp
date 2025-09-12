import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OnboardingSpotlight = ({ measurements, shape, padding = 10, radius = 30 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Subtle pulse for the border
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (!measurements) {
    // Full overlay when no target
    return <View style={styles.fullOverlay} pointerEvents="box-none" />;
  }

  const { x, y, width, height } = measurements;
  
  // Calculate cutout area with padding
  const cutoutX = Math.max(0, x - padding);
  const cutoutY = Math.max(0, y - padding);
  const cutoutWidth = Math.min(width + padding * 2, SCREEN_WIDTH - cutoutX);
  const cutoutHeight = Math.min(height + padding * 2, SCREEN_HEIGHT - cutoutY);
  const cutoutRight = cutoutX + cutoutWidth;
  const cutoutBottom = cutoutY + cutoutHeight;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Top overlay section */}
      <View 
        style={[
          styles.overlaySection,
          {
            top: 0,
            left: 0,
            right: 0,
            height: cutoutY,
          }
        ]}
        pointerEvents="auto"
      />
      
      {/* Bottom overlay section */}
      <View 
        style={[
          styles.overlaySection,
          {
            top: cutoutBottom,
            left: 0,
            right: 0,
            bottom: 0,
          }
        ]}
        pointerEvents="auto"
      />
      
      {/* Left overlay section */}
      <View 
        style={[
          styles.overlaySection,
          {
            top: cutoutY,
            left: 0,
            width: cutoutX,
            height: cutoutHeight,
          }
        ]}
        pointerEvents="auto"
      />
      
      {/* Right overlay section */}
      <View 
        style={[
          styles.overlaySection,
          {
            top: cutoutY,
            left: cutoutRight,
            right: 0,
            height: cutoutHeight,
          }
        ]}
        pointerEvents="auto"
      />
      
      {/* Highlight border around cutout */}
      <Animated.View
        style={[
          styles.highlightBorder,
          {
            position: 'absolute',
            left: cutoutX - 2,
            top: cutoutY - 2,
            width: cutoutWidth + 4,
            height: cutoutHeight + 4,
            borderRadius: shape === 'circle' ? (cutoutWidth + 4) / 2 : 12,
            transform: [{ scale: pulseAnim }],
          }
        ]}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  overlaySection: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  highlightBorder: {
    borderWidth: 2,
    borderColor: '#B6DB78',
    backgroundColor: 'transparent',
  },
});

export default OnboardingSpotlight;