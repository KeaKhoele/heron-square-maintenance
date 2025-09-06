import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';

// Access levels
export enum AccessLevel {
  TENANT = 'tenant',
  SECONDARY_CREW = 'secondary_crew',
  PRIMARY_CREW = 'primary_crew',
  SUPER_ADMIN = 'super_admin' // You and Cursor only
}

// Crew member interface
export interface CrewMember {
  email: string;
  accessLevel: AccessLevel;
  name?: string;
  addedBy?: string;
  addedDate?: string;
}

// Access control context
interface AccessControlContextType {
  currentUserLevel: AccessLevel;
  isPrimaryCrew: boolean;
  isSecondaryCrew: boolean;
  isSuperAdmin: boolean;
  isCrewMember: boolean;
  isTenant: boolean;
  canManageUsers: boolean;
  canToggleStatus: boolean;
  canManagePrimaryCrew: boolean;
  getCrewMembers: () => CrewMember[];
  addCrewMember: (email: string, accessLevel: AccessLevel, name?: string) => Promise<void>;
  removeCrewMember: (email: string) => Promise<void>;
  clearCrewSession: () => void;
  crewSession: CrewMember | null;
}

const AccessControlContext = createContext<AccessControlContextType | undefined>(undefined);

export function useAccessControl() {
  const context = useContext(AccessControlContext);
  if (context === undefined) {
    throw new Error('useAccessControl must be used within an AccessControlProvider');
  }
  return context;
}

// Crew members configuration
const CREW_MEMBERS: CrewMember[] = [
  {
    email: 'kea.khoele@gmail.com',
    accessLevel: AccessLevel.PRIMARY_CREW,
    name: 'Kea Khoele',
    addedBy: 'system',
    addedDate: '2024-08-17T18:00:00.000Z' // Fixed date instead of new Date()
  }
  // Add your UCT email here when you provide it
  // More crew members will be added dynamically
];

interface AccessControlProviderProps {
  children: ReactNode;
}

export function AccessControlProvider({ children }: AccessControlProviderProps) {
  const { currentUser } = useAuth();
  const [crewSession, setCrewSession] = useState<CrewMember | null>(null);

  // Check for existing crew session on mount
  useEffect(() => {
    const checkCrewSession = () => {
      // Try localStorage first
      const storedCrewMember = localStorage.getItem('crewMember');
      console.log('Checking for stored crew member:', storedCrewMember);
      
      if (storedCrewMember) {
        try {
          const crewMember = JSON.parse(storedCrewMember);
          console.log('Setting crew session from localStorage:', crewMember);
          setCrewSession(crewMember);
          // Also sync to sessionStorage for mobile compatibility
          sessionStorage.setItem('crewMember', storedCrewMember);
          return; // Exit early if we found a valid crew member
        } catch (error) {
          console.error('Error parsing localStorage crew member:', error);
          localStorage.removeItem('crewMember');
        }
      }
      
      // Then check sessionStorage for mobile compatibility
      const sessionCrewMember = sessionStorage.getItem('crewMember');
      if (sessionCrewMember) {
        try {
          const crewMember = JSON.parse(sessionCrewMember);
          console.log('Setting crew session from sessionStorage:', crewMember);
          setCrewSession(crewMember);
          // Sync to localStorage for persistence
          localStorage.setItem('crewMember', sessionCrewMember);
        } catch (error) {
          console.error('Error parsing sessionStorage crew member:', error);
          sessionStorage.removeItem('crewMember');
        }
      }
    };

    // Check on mount
    checkCrewSession();

    // Listen for storage changes (when crew session is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'crewMember') {
        console.log('Crew member storage changed, rechecking...');
        checkCrewSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleCrewSessionUpdate = () => {
      console.log('Crew session update event received, rechecking...');
      checkCrewSession();
    };

    window.addEventListener('crewSessionUpdated', handleCrewSessionUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('crewSessionUpdated', handleCrewSessionUpdate);
    };
  }, []);

  // Get current user's access level - moved inside useMemo to fix dependency warning
  const currentUserLevel = useMemo(() => {
    // First check if user has crew session (crew access takes priority)
    if (crewSession) {
      console.log('User has crew session:', crewSession);
      return crewSession.accessLevel;
    }
    
    // Then check if user is authenticated via Firebase (tenant)
    if (currentUser?.email) {
      console.log('User authenticated via Firebase:', currentUser.email);
      return AccessLevel.TENANT;
    }
    
    console.log('No authentication found, defaulting to TENANT');
    return AccessLevel.TENANT;
  }, [currentUser, crewSession]);

  // Role separation: prevent mixed access
  const isCrewMember = useMemo(() => {
    return crewSession !== null;
  }, [crewSession]);

  const isTenant = useMemo(() => {
    return currentUser !== null && crewSession === null;
  }, [currentUser, crewSession]);

  // Computed properties - make them reactive
  const isPrimaryCrew = useMemo(() => currentUserLevel === AccessLevel.PRIMARY_CREW, [currentUserLevel]);
  const isSecondaryCrew = useMemo(() => currentUserLevel === AccessLevel.SECONDARY_CREW, [currentUserLevel]);
  const isSuperAdmin = useMemo(() => currentUserLevel === AccessLevel.SUPER_ADMIN, [currentUserLevel]);
  
  // Permissions
  const canManageUsers = isPrimaryCrew || isSuperAdmin;
  const canToggleStatus = isPrimaryCrew || isSuperAdmin;
  const canManagePrimaryCrew = isSuperAdmin;

  // Crew management functions
  const getCrewMembers = (): CrewMember[] => {
    return [...CREW_MEMBERS];
  };

  const addCrewMember = async (email: string, accessLevel: AccessLevel, name?: string): Promise<void> => {
    if (!canManageUsers) {
      throw new Error('You do not have permission to manage crew members');
    }

    if (accessLevel === AccessLevel.PRIMARY_CREW && !canManagePrimaryCrew) {
      throw new Error('Only super admins can add Primary Crew members');
    }

    // Check if member already exists
    if (CREW_MEMBERS.find(member => member.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Crew member already exists');
    }

    const newMember: CrewMember = {
      email: email.toLowerCase(),
      accessLevel,
      name,
      addedBy: crewSession?.email || currentUser?.email || 'unknown',
      addedDate: new Date().toISOString()
    };

    CREW_MEMBERS.push(newMember);
    
    // In production, this would save to Firebase/Google Sheets
    console.log('Crew member added:', newMember);
  };

  const removeCrewMember = async (email: string): Promise<void> => {
    if (!canManageUsers) {
      throw new Error('You do not have permission to manage crew members');
    }

    const memberIndex = CREW_MEMBERS.findIndex(member => 
      member.email.toLowerCase() === email.toLowerCase()
    );

    if (memberIndex === -1) {
      throw new Error('Crew member not found');
    }

    const member = CREW_MEMBERS[memberIndex];
    
    // Primary Crew cannot remove other Primary Crew members
    if (member.accessLevel === AccessLevel.PRIMARY_CREW && !canManagePrimaryCrew) {
      throw new Error('Primary Crew members cannot remove other Primary Crew members. Only Super Admins can remove Primary Crew.');
    }

    CREW_MEMBERS.splice(memberIndex, 1);
    
    // In production, this would save to Firebase/Google Sheets
    console.log('Crew member removed:', member);
  };

  // Clear crew session (for logout)
  const clearCrewSession = () => {
    localStorage.removeItem('crewMember');
    sessionStorage.removeItem('crewMember');
    setCrewSession(null);
  };

  const value = {
    currentUserLevel,
    isPrimaryCrew,
    isSecondaryCrew,
    isSuperAdmin,
    isCrewMember,
    isTenant,
    canManageUsers,
    canToggleStatus,
    canManagePrimaryCrew,
    getCrewMembers,
    addCrewMember,
    removeCrewMember,
    clearCrewSession,
    crewSession
  };

  return (
    <AccessControlContext.Provider value={value}>
      {children}
    </AccessControlContext.Provider>
  );
}