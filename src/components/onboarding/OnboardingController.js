import React, { createContext, useState, useContext, useEffect } from 'react';
import { UIManager, findNodeHandle } from 'react-native';
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
  const [hasActiveCompetitions, setHasActiveCompetitions] = useState(false);
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

  const registerTarget = (id, refOrEventOrRect) => {
    // Supports: ref.current, onLayout event, or direct {x,y,width,height}
    // Prefer absolute window coordinates via measureInWindow when possible.
    try {
      // Direct rect
      if (
        refOrEventOrRect &&
        typeof refOrEventOrRect === 'object' &&
        'x' in refOrEventOrRect &&
        'y' in refOrEventOrRect &&
        'width' in refOrEventOrRect &&
        'height' in refOrEventOrRect
      ) {
        const rect = refOrEventOrRect;
        console.log(`Registering target ${id} with explicit rect:`, rect);
        setTargetMeasurements(prev => ({ ...prev, [id]: rect }));
        return;
      }

      // onLayout event → try to measure absolute via native handle
      const isLayoutEvent = !!(refOrEventOrRect && refOrEventOrRect.nativeEvent && refOrEventOrRect.nativeEvent.layout);
      if (isLayoutEvent) {
        const evt = refOrEventOrRect;
        const targetTag = evt.nativeEvent?.target;

        if (targetTag != null) {
          // Defer measure slightly to ensure layout settled
          requestAnimationFrame(() => {
            try {
              UIManager.measureInWindow(targetTag, (x, y, width, height) => {
                const rect = { x, y, width, height };
                console.log(`Registering target ${id} (measured in window from event):`, rect);
                setTargetMeasurements(prev => ({ ...prev, [id]: rect }));
              });
            } catch (err) {
              console.warn(`measureInWindow failed for ${id} from event; falling back to layout`, err);
              const { x, y, width, height } = evt.nativeEvent.layout;
              setTargetMeasurements(prev => ({ ...prev, [id]: { x, y, width, height } }));
            }
          });
          return;
        }

        // Fallback if no target tag is available
        const { x, y, width, height } = evt.nativeEvent.layout;
        console.warn(`No native target tag for ${id}; storing relative layout (may be inaccurate)`, evt.nativeEvent.layout);
        setTargetMeasurements(prev => ({ ...prev, [id]: { x, y, width, height } }));
        return;
      }

      // ref.current → measure absolute via handle
      if (refOrEventOrRect && refOrEventOrRect.current) {
        const handle = findNodeHandle(refOrEventOrRect.current);
        if (handle) {
          requestAnimationFrame(() => {
            try {
              UIManager.measureInWindow(handle, (x, y, width, height) => {
                const rect = { x, y, width, height };
                console.log(`Registering target ${id} (measured in window from ref):`, rect);
                setTargetMeasurements(prev => ({ ...prev, [id]: rect }));
              });
            } catch (err) {
              console.warn(`measureInWindow failed for ${id} from ref`, err);
            }
          });
          return;
        }
      }

      console.warn(`Invalid target source for ${id}:`, refOrEventOrRect);
    } catch (error) {
      console.error(`Error registering target ${id}:`, error);
    }
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
    hasActiveCompetitions,
    setHasActiveCompetitions,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
