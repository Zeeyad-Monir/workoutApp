import AsyncStorage from '@react-native-async-storage/async-storage';

// Using v1 suffix ensures existing users will see it once
// Now user-specific to handle multiple accounts on same device
const ONBOARDING_COMPLETED_KEY_PREFIX = 'onboarding_completed_v1';

class OnboardingService {
  // Helper to get user-specific key
  getUserOnboardingKey(userId) {
    if (!userId) {
      console.warn('No userId provided for onboarding key');
      return null;
    }
    return `${ONBOARDING_COMPLETED_KEY_PREFIX}_${userId}`;
  }

  async hasCompletedOnboarding(userId) {
    try {
      if (!userId) {
        console.log('No userId provided, treating as not completed');
        return false;
      }
      
      const key = this.getUserOnboardingKey(userId);
      const completed = await AsyncStorage.getItem(key);
      console.log(`Checking onboarding for user ${userId}: ${completed === 'true' ? 'completed' : 'not completed'}`);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  async completeOnboarding(userId) {
    try {
      if (!userId) {
        console.error('Cannot complete onboarding without userId');
        return;
      }
      
      const key = this.getUserOnboardingKey(userId);
      await AsyncStorage.setItem(key, 'true');
      console.log(`Onboarding marked as completed for user ${userId}`);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  async resetOnboarding(userId) {
    try {
      if (!userId) {
        console.error('Cannot reset onboarding without userId');
        return;
      }
      
      const key = this.getUserOnboardingKey(userId);
      await AsyncStorage.removeItem(key);
      console.log(`Onboarding reset for user ${userId} - will show on next app launch`);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }
}

export default new OnboardingService();