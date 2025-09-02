import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailLink, 
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  sendMagicLink: (email: string) => Promise<void>;
  completeSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  magicLinkSent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check if user is returning from magic link
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // User clicked magic link, complete sign in
      completeSignIn();
    }
  }, []);

  async function sendMagicLink(email: string) {
    try {
      console.log('Attempting to send magic link to:', email);
      console.log('Firebase auth instance:', auth);
      
      const actionCodeSettings = {
        url: window.location.origin + '/dashboard',
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.heronsquare.maintenance'
        },
        android: {
          packageName: 'com.heronsquare.maintenance',
          installApp: true
        },
        dynamicLinkDomain: undefined
      };
      
      console.log('Action code settings:', actionCodeSettings);

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save email to localStorage for later use
      window.localStorage.setItem('emailForSignIn', email);
      
      setMagicLinkSent(true);
      console.log('Magic link sent successfully');
    } catch (error: any) {
      console.error('Detailed error sending magic link:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send magic link. Please try again.';
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please wait a moment and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'Daily quota exceeded. Please upgrade your Firebase plan to Blaze (Pay as you go) to continue.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Passwordless sign-in is not enabled. Please contact support.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'Invalid action code. Please try again.';
      }
      
      // Add specific message for academic/enterprise emails
      if (email.includes('@myuct.ac.za') || email.includes('.edu') || email.includes('.ac.')) {
        errorMessage += ' Note: Some academic/enterprise email providers may block magic links. Please check your spam folder or contact your IT department.';
      }
      
      throw new Error(errorMessage);
    }
  }

  async function completeSignIn() {
    try {
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // Try sessionStorage as fallback for mobile
        const sessionEmail = sessionStorage.getItem('emailForSignIn');
        if (!sessionEmail) {
          throw new Error('No email found. Please try signing in again.');
        }
        // Use session email and sync to localStorage
        window.localStorage.setItem('emailForSignIn', sessionEmail);
      }

      const currentEmail = window.localStorage.getItem('emailForSignIn') || email;
      
      if (!currentEmail) {
        throw new Error('No email found. Please try signing in again.');
      }
      
      console.log('Completing sign in for email:', currentEmail);
      
      await signInWithEmailLink(auth, currentEmail, window.location.href);
      
      // Clear email from both storages
      window.localStorage.removeItem('emailForSignIn');
      sessionStorage.removeItem('emailForSignIn');
      
      // User is now signed in
      console.log('Sign in completed successfully');
      
      // Force a small delay to ensure Firebase state is updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to dashboard if not already there
      if (window.location.pathname !== '/dashboard') {
        // Use window.location.href for more reliable navigation
        window.location.href = '/dashboard';
      }
      
    } catch (error: any) {
      console.error('Error completing sign in:', error);
      throw new Error('Failed to complete sign in. Please try again.');
    }
  }

  async function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    sendMagicLink,
    completeSignIn,
    logout,
    loading,
    magicLinkSent
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
