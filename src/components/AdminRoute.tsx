import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAccessControl } from '../contexts/AccessControlContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isPrimaryCrew, isSecondaryCrew, crewSession, isTenant } = useAccessControl();
  
  console.log('AdminRoute - crewSession:', crewSession);
  console.log('AdminRoute - isPrimaryCrew:', isPrimaryCrew);
  console.log('AdminRoute - isSecondaryCrew:', isSecondaryCrew);
  console.log('AdminRoute - isTenant:', isTenant);
  
  // Block tenants from accessing crew features
  if (isTenant) {
    console.log('AdminRoute - Tenant detected, redirecting to /');
    return <Navigate to="/" replace />;
  }
  
  // Check if user has a crew session
  if (!crewSession) {
    console.log('AdminRoute - No crew session, redirecting to /crew-signin');
    return <Navigate to="/crew-signin" replace />;
  }
  
  // Only allow access to Primary or Secondary Crew members
  if (!isPrimaryCrew && !isSecondaryCrew) {
    console.log('AdminRoute - Not crew member, redirecting to /');
    return <Navigate to="/" replace />;
  }
  
  console.log('AdminRoute - Access granted, rendering children');
  return <>{children}</>;
};

export default AdminRoute;
