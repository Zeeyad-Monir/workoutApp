import React, { createContext, useEffect, useState } from 'react';
import { auth } from '../firebase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [isNewSignup, setIsNewSignup] = useState(false);

  useEffect(() => {
    console.log('Setting up Firebase auth listener...');
    
    try {
      // Use v8 compat style auth listener
      const unsubscribe = auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        
        // Check if this is a new signup
        if (user && isNewSignup) {
          console.log('New signup detected in auth state change - flag will persist until onboarding starts');
          // DON'T reset the flag here - let onboarding controller handle it
        }
        
        setUser(user);
        if (initializing) {
          setInitializing(false);
        }
      }, (error) => {
        console.error('Auth state change error:', error);
        setInitializing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up Firebase auth:', error);
      setInitializing(false);
    }
  }, [initializing]);

  // Method to clear the new signup flag (called when onboarding starts)
  const clearNewSignupFlag = () => {
    console.log('Clearing new signup flag');
    setIsNewSignup(false);
  };

  if (initializing) {
    console.log('Auth still initializing...');
    return null; // You can return a loading screen here
  }

  return (
    <AuthContext.Provider value={{ user, isNewSignup, setIsNewSignup, clearNewSignupFlag }}>
      {children}
    </AuthContext.Provider>
  );
}