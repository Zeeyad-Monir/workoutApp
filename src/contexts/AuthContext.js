import React, { createContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged } from '../firebase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return unsub;
  }, []);

  if (initializing) return null;   // splash screen could go here

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}