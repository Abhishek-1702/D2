// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { isFirebaseConfigured, signInWithEmailPassword, registerWithEmailPassword, signOutUser, onAuthChange } from '../firebase';

const AuthContext = createContext({ user: null, signIn: async () => {}, register: async () => {}, signOut: async () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthChange((u) => setUser(u));
    return () => unsub && unsub();
  }, []);

  const signIn = async (email, password) => {
    if (!isFirebaseConfigured) return null;
    try {
      const u = await signInWithEmailPassword(email, password);
      setUser(u);
      setAuthError(null);
      return u;
    } catch (e) {
      console.error('signIn failed', e);
      setAuthError(e?.message || String(e));
      return null;
    }
  };

  const register = async (email, password) => {
    if (!isFirebaseConfigured) return null;
    try {
      const u = await registerWithEmailPassword(email, password);
      setUser(u);
      setAuthError(null);
      return u;
    } catch (e) {
      console.error('register failed', e);
      setAuthError(e?.message || String(e));
      return null;
    }
  };

  const signOut = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signOutUser();
      setUser(null);
      setAuthError(null);
    } catch (e) {
      console.error('signOut failed', e);
      setAuthError(e?.message || String(e));
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, register, signOut, authError, clearAuthError: () => setAuthError(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
