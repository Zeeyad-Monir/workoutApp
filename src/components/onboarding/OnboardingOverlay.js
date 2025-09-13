import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Animated,
  StyleSheet,
} from 'react-native';
import { useOnboarding } from './OnboardingController';
import OnboardingSpotlight from './OnboardingSpotlight';
import OnboardingContent from './OnboardingContent';
import OnboardingProgress from './OnboardingProgress';

const OnboardingOverlay = () => {
  const {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    nextStep,
    skipOnboarding,
    getTargetMeasurements,
    hasActiveCompetitions,
  } = useOnboarding();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);

  if (!isActive || !currentStepData) {
    return null;
  }

  const targetMeasurements = getTargetMeasurements(currentStepData.targetId);
  
  // Determine if we should show mock element
  const shouldShowMock = () => {
    if (!currentStepData.requiresActiveCompetition) return false;
    
    // Show mock if no active competitions or if target measurements not found
    return !hasActiveCompetitions || !targetMeasurements;
  };
  
  // Debug logging
  if (currentStepData) {
    console.log(`OnboardingOverlay: Looking for target ${currentStepData.targetId}, found:`, targetMeasurements);
  }

  return (
    <Modal
      visible={isActive}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.container,
          { opacity: fadeAnim }
        ]}
        pointerEvents="box-none"
      >
        {/* Spotlight with cutout */}
        <OnboardingSpotlight
          measurements={targetMeasurements}
          shape={currentStepData.spotlightShape}
          padding={currentStepData.spotlightPadding}
          radius={currentStepData.spotlightRadius}
          mockElement={currentStepData.mockElement}
          showMock={shouldShowMock()}
        />

        {/* Content card with smart positioning */}
        <OnboardingContent
          title={currentStepData.title}
          description={currentStepData.description}
          onNext={nextStep}
          onSkip={skipOnboarding}
          isLastStep={currentStep === totalSteps - 1}
          targetMeasurements={targetMeasurements}
          preferredPosition={currentStepData.preferredPosition}
          spotlightPadding={currentStepData.spotlightPadding}
        />

        {/* Progress indicator */}
        <OnboardingProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
        />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default OnboardingOverlay;
