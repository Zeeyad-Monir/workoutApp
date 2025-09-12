import React, { createContext, useState, useContext, useEffect } from 'react';
import { Dimensions } from 'react-native';
import onboardingService from '../../services/onboardingService';
import { ONBOARDING_STEPS } from './onboardingSteps';
import { AuthContext } from '../../contexts/AuthContext';

export const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetMeasurements, setTargetMeasurements] = useState({});
  const { user } = useContext(AuthContext);

  const startOnboarding = async (forceStart = false) => {
    // Don't start if already active
    if (isActive) {
      console.log('Onboarding already active, skipping start');
      return;
    }
    
    // If forceStart is true, start regardless of completion status
    if (forceStart) {
      console.log('Manually starting onboarding tutorial');
      setIsActive(true);
      setCurrentStep(0);
      return;
    }
    
    // Otherwise check completion status as normal
    const userId = user?.uid;
    if (!userId) {
      console.log('No user ID available for onboarding check');
      return;
    }
    
    const hasCompleted = await onboardingService.hasCompletedOnboarding(userId);
    if (!hasCompleted) {
      console.log(`Starting onboarding tutorial for user ${userId}`);
      setIsActive(true);
      setCurrentStep(0);
    } else {
      console.log(`User ${userId} has already completed onboarding`);
    }
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = async () => {
    const userId = user?.uid;
    if (!userId) {
      console.error('Cannot skip onboarding without user ID');
      return;
    }
    console.log(`User ${userId} skipped onboarding`);
    await onboardingService.completeOnboarding(userId); // Mark as complete even when skipped
    setIsActive(false);
    setCurrentStep(0);
  };

  const completeOnboarding = async () => {
    const userId = user?.uid;
    if (!userId) {
      console.error('Cannot complete onboarding without user ID');
      return;
    }
    console.log(`User ${userId} completed onboarding`);
    await onboardingService.completeOnboarding(userId);
    setIsActive(false);
    setCurrentStep(0);
  };

  const registerTarget = (id, event) => {
    // Handle both direct measurements and event objects
    let measurements;
    if (event && event.nativeEvent && event.nativeEvent.layout) {
      measurements = event.nativeEvent.layout;
    } else if (event && typeof event === 'object' && 'x' in event) {
      measurements = event;
    } else {
      console.warn(`Invalid measurements for target ${id}:`, event);
      return;
    }
    
    console.log(`Registering target ${id} with measurements:`, measurements);
    setTargetMeasurements(prev => ({
      ...prev,
      [id]: measurements
    }));
  };

  const getTargetMeasurements = (id) => {
    console.log(`Getting measurements for ${id}, available targets:`, Object.keys(targetMeasurements));
    return targetMeasurements[id] || null;
  };

  const value = {
    isActive,
    currentStep,
    totalSteps: ONBOARDING_STEPS.length,
    currentStepData: ONBOARDING_STEPS[currentStep],
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    registerTarget,
    getTargetMeasurements,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};