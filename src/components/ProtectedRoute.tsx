import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAccessControl } from '../contexts/AccessControlContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="rounded-full h-12 w-12 border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  // Require Firebase authentication (email/password)
  // Allow access even if user also has crew session (for testing both roles)
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
