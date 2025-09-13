import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';
import OnboardingMockElement from './OnboardingMockElement';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OnboardingSpotlight = ({ measurements, shape, padding = 10, radius = 30, mockElement, showMock }) => {
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
    return <View style={styles.fullOverlay} pointerEvents="auto" />;
  }

  const { x, y, width, height } = measurements;

  // Calculate cutout area with padding. For circles, compute a square around the center using radius.
  let cutoutX, cutoutY, cutoutWidth, cutoutHeight;
  let cx = x + width / 2;
  let cy = y + height / 2;
  let r = (radius || Math.max(width, height) / 2) + padding;
  if (shape === 'circle') {
    const left = cx - r;
    const top = cy - r;
    cutoutX = Math.max(0, left);
    cutoutY = Math.max(0, top);
    cutoutWidth = Math.min(2 * r, SCREEN_WIDTH - cutoutX);
    cutoutHeight = Math.min(2 * r, SCREEN_HEIGHT - cutoutY);
  } else {
    cutoutX = Math.max(0, x - padding);
    cutoutY = Math.max(0, y - padding);
    cutoutWidth = Math.min(width + padding * 2, SCREEN_WIDTH - cutoutX);
    cutoutHeight = Math.min(height + padding * 2, SCREEN_HEIGHT - cutoutY);
  }
  const cutoutRight = cutoutX + cutoutWidth;
  const cutoutBottom = cutoutY + cutoutHeight;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* SVG Mask for creating cutout */}
      <Svg 
        width={SCREEN_WIDTH} 
        height={SCREEN_HEIGHT} 
        style={StyleSheet.absoluteFillObject}
        pointerEvents="auto"
      >
        <Defs>
          <Mask id="spotlight-mask">
            {/* White rectangle fills entire screen */}
            <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
            {/* Black shape creates the hole */}
            {shape === 'circle' ? (
              <Circle 
                cx={cx} 
                cy={cy} 
                r={r} 
                fill="black" 
              />
            ) : (
              <Rect 
                x={cutoutX} 
                y={cutoutY} 
                width={cutoutWidth} 
                height={cutoutHeight} 
                rx={12} 
                ry={12}
                fill="black" 
              />
            )}
          </Mask>
        </Defs>
        {/* Dark overlay with mask applied */}
        <Rect 
          x="0" 
          y="0" 
          width={SCREEN_WIDTH} 
          height={SCREEN_HEIGHT} 
          fill="rgba(0, 0, 0, 0.85)" 
          mask="url(#spotlight-mask)" 
        />
      </Svg>

      {/* Mock element if needed */}
      {showMock && mockElement && (
        <OnboardingMockElement 
          type={mockElement}
          measurements={measurements}
        />
      )}

      {/* Highlight ring on top (no background white square) */}
      <Animated.View
        style={[
          styles.highlightBorder,
          {
            position: 'absolute',
            left: shape === 'circle' ? cx - (r + 2) : cutoutX - 2,
            top: shape === 'circle' ? cy - (r + 2) : cutoutY - 2,
            width: shape === 'circle' ? (r + 2) * 2 : cutoutWidth + 4,
            height: shape === 'circle' ? (r + 2) * 2 : cutoutHeight + 4,
            borderRadius: shape === 'circle' ? (r + 2) : 12,
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
    // subtle glow
    shadowColor: '#B6DB78',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default OnboardingSpotlight;
