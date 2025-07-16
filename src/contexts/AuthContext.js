import React, { createContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import notificationService from '../services/notificationService';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    console.log('Setting up Firebase auth listener...');
    
    try {
      // Use v8 compat style auth listener
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        setUser(user);
        
        // Initialize notification service when user logs in
        if (user) {
          try {
            await notificationService.initialize();
            await notificationService.updateUserToken(user.uid);
          } catch (error) {
            console.error('Error initializing notifications:', error);
          }
        } else {
          // Clean up when user logs out
          notificationService.cleanup();
        }
        
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

  if (initializing) {
    console.log('Auth still initializing...');
    return null; // You can return a loading screen here
  }

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}