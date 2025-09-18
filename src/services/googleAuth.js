// src/services/googleAuth.js
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { 
  auth, 
  db,
  GoogleAuthProvider, 
  signInWithCredential, 
  linkWithCredential,
  fetchSignInMethodsForEmail 
} from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Alert } from 'react-native';

// Configure WebBrowser for auth sessions
WebBrowser.maybeCompleteAuthSession();

// iOS OAuth Client ID
const IOS_CLIENT_ID = '38275586051-e0adgsng3oamnqacn1455usfu9atn60k.apps.googleusercontent.com';

// Google iOS client scheme (automatically recognized by Google)
const GOOGLE_IOS_SCHEME = 'com.googleusercontent.apps.38275586051-e0adgsng3oamnqacn1455usfu9atn60k';

// Use iOS native client configuration (no proxy) - locked for production
const USE_EXPO_PROXY = false;

// Discovery document for Google OAuth
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Initialize Google Sign-In with Expo AuthSession
 */
export const initiateGoogleSignIn = async () => {
  try {
    // Use Google's iOS client-specific redirect URI
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: GOOGLE_IOS_SCHEME,
      useProxy: USE_EXPO_PROXY,
    });
    
    // Log for verification (production-friendly)
    console.log('[Google Auth] Redirect URI:', redirectUri);
    
    // Create auth request with iOS client configuration
    const request = new AuthSession.AuthRequest({
      clientId: IOS_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri: redirectUri,
      prompt: AuthSession.Prompt.SelectAccount,  // Force account selection
    });

    // Initiate authentication
    const result = await request.promptAsync(discovery);
    
    return handleAuthResponse(result);
  } catch (error) {
    console.error('[Google Auth] Error:', error);
    logAuthEvent('auth_google_error', { error: error.message });
    throw error;
  }
};

/**
 * Handle the authentication response from Google
 */
const handleAuthResponse = async (response) => {
  logAuthEvent('auth_google_response', { type: response.type });
  
  if (response.type === 'success') {
    const { id_token } = response.params;
    
    if (id_token) {
      logAuthEvent('auth_google_success');
      // Sign in with Firebase using the ID token
      return await signInWithGoogleCredential(id_token);
    } else {
      throw new Error('No ID token received from Google');
    }
  } else if (response.type === 'cancel') {
    logAuthEvent('auth_google_cancel');
    return { 
      success: false, 
      cancelled: true,
      message: 'Sign-in was cancelled' 
    };
  } else {
    logAuthEvent('auth_google_error', { type: response.type });
    return { 
      success: false, 
      error: true,
      message: 'Authentication failed' 
    };
  }
};

/**
 * Sign in to Firebase with Google credential
 */
const signInWithGoogleCredential = async (idToken) => {
  try {
    // Create Google credential
    const credential = GoogleAuthProvider.credential(idToken);
    
    // Sign in with credential
    const result = await signInWithCredential(credential);
    const user = result.user;
    
    // Check if this is a new user
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Create new user profile
      await createUserProfile(user);
    }
    
    return { 
      success: true, 
      user,
      isNewUser: !userDoc.exists() 
    };
  } catch (error) {
    console.error('Firebase sign-in error:', error);
    
    // Handle account exists with different credential
    if (error.code === 'auth/account-exists-with-different-credential') {
      return await handleAccountLinking(error.customData.email, idToken);
    } else if (error.code === 'auth/email-already-in-use') {
      // Check existing sign-in methods for this email
      const email = error.customData?.email;
      if (email) {
        return await handleExistingEmailAccount(email, idToken);
      }
    }
    
    throw error;
  }
};

/**
 * Handle existing email account scenario
 */
const handleExistingEmailAccount = async (email, googleIdToken) => {
  try {
    const methods = await fetchSignInMethodsForEmail(email);
    
    if (methods.includes('password')) {
      // Email/password account exists
      return {
        success: false,
        requiresLinking: true,
        email,
        existingProvider: 'password',
        googleIdToken,
        message: 'This email is already registered with a password. Would you like to link Google to your existing account?'
      };
    }
    
    // Other provider exists
    return {
      success: false,
      error: true,
      message: 'This email is already registered with another sign-in method.'
    };
  } catch (error) {
    console.error('Error checking existing account:', error);
    throw error;
  }
};

/**
 * Handle account linking when email exists with different provider
 */
export const handleAccountLinking = async (email, googleIdToken) => {
  return new Promise((resolve) => {
    Alert.alert(
      'Account Already Exists',
      `An account with ${email} already exists. Would you like to link Google sign-in to your existing account?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve({ 
            success: false, 
            cancelled: true,
            message: 'Account linking cancelled'
          })
        },
        {
          text: 'Link Account',
          onPress: async () => {
            try {
              // User needs to be signed in with their existing account first
              resolve({
                success: false,
                requiresLinking: true,
                email,
                googleIdToken,
                message: 'Please sign in with your password first to link your Google account.'
              });
            } catch (error) {
              console.error('Error in account linking:', error);
              resolve({ 
                success: false, 
                error: true,
                message: 'Failed to link account' 
              });
            }
          }
        }
      ]
    );
  });
};

/**
 * Link Google account to existing user
 * Call this after user signs in with their password
 */
export const linkGoogleAccount = async (googleIdToken) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user signed in');
    }
    
    const credential = GoogleAuthProvider.credential(googleIdToken);
    await linkWithCredential(user, credential);
    
    logAuthEvent('auth_google_linked');
    return { success: true, message: 'Google account linked successfully' };
  } catch (error) {
    console.error('Error linking Google account:', error);
    logAuthEvent('auth_google_link_error', { error: error.message });
    
    if (error.code === 'auth/credential-already-in-use') {
      return { 
        success: false, 
        error: true,
        message: 'This Google account is already linked to another user' 
      };
    }
    
    throw error;
  }
};

/**
 * Create user profile in Firestore
 */
const createUserProfile = async (user) => {
  const displayName = user.displayName || 'Google User';
  const username = displayName.replace(/\s+/g, '').toLowerCase();
  
  // Check username availability
  let finalUsername = username;
  let counter = 1;
  
  while (true) {
    const usernameDoc = await getDoc(doc(db, 'usernames', finalUsername.toLowerCase()));
    if (!usernameDoc.exists()) break;
    finalUsername = `${username}${counter}`;
    counter++;
  }
  
  // Create user profile
  await setDoc(doc(db, 'users', user.uid), {
    username: finalUsername,
    handle: finalUsername.toLowerCase(),
    email: user.email,
    photoURL: user.photoURL || '',
    favouriteWorkout: '',
    wins: 0,
    totals: 0,
    friends: [],
    hasCompletedOnboarding: false,
    provider: 'google',
    createdAt: new Date().toISOString()
  });
  
  // Reserve username
  await setDoc(doc(db, 'usernames', finalUsername.toLowerCase()), {
    uid: user.uid
  });
  
  logAuthEvent('auth_google_profile_created', { username: finalUsername });
};

/**
 * Log authentication events for analytics
 */
const logAuthEvent = (eventName, params = {}) => {
  // This is where you'd integrate with your analytics service
  // For now, just console log
  console.log(`[Auth Event] ${eventName}`, params);
  
  // In production, you might use:
  // Analytics.logEvent(eventName, params);
};

/**
 * Check if user has Google provider linked
 */
export const hasGoogleProvider = () => {
  const user = auth.currentUser;
  if (!user) return false;
  
  return user.providerData.some(provider => 
    provider.providerId === GoogleAuthProvider.PROVIDER_ID
  );
};