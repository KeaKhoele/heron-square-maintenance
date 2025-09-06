import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessControl } from '../contexts/AccessControlContext';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Wrench, AlertCircle, CheckCircle } from 'lucide-react';

const CrewSignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { getCrewMembers } = useAccessControl();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      console.log('Starting crew authentication for:', email);
      
      // Check if email is in crew list
      const crewMembers = getCrewMembers();
      console.log('Available crew members:', crewMembers);
      
      const crewMember = crewMembers.find(member => 
        member.email.toLowerCase() === email.toLowerCase()
      );
      
      console.log('Found crew member:', crewMember);

      if (!crewMember) {
        setError('This email is not registered as a crew member. Please contact the administrator.');
        return;
      }

      // Clear any existing Firebase tenant session to maintain role separation
      try {
        await logout();
        console.log('Cleared Firebase tenant session for role separation');
      } catch (logoutError) {
        console.log('No Firebase session to clear');
      }
      
      // Store crew member info in both localStorage and sessionStorage for mobile compatibility
      localStorage.setItem('crewMember', JSON.stringify(crewMember));
      sessionStorage.setItem('crewMember', JSON.stringify(crewMember));
      
      console.log('Crew member authenticated:', crewMember);
      console.log('Stored in localStorage and sessionStorage, navigating to /admin...');
      
      // Dispatch custom event to notify context of crew session update
      window.dispatchEvent(new CustomEvent('crewSessionUpdated'));
      
      // Success - crew member verified
      setSuccess(true);
      
      // Navigate immediately - context will update via event listener
      navigate('/admin', { replace: true });
      
    } catch (error: any) {
      console.error('Error during crew authentication:', error);
      setError(error.message || 'Failed to verify crew membership');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Access Granted!
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Redirecting you to the Maintenance Crew Dashboard...
            </p>
            <div className="">
              <div className="h-2 bg-blue-200 rounded-full mb-2"></div>
              <div className="h-2 bg-blue-200 rounded-full mb-2"></div>
              <div className="h-2 bg-blue-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center mb-6">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Crew Member Access
          </h1>
          <h2 className="text-xl text-gray-600 mb-8">
            Heron Square Maintenance Crew
          </h2>
          <p className="text-gray-500 mb-8">
            Enter your crew email to access the maintenance dashboard
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Crew Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your crew email"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Access Dashboard
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to Tenant Portal
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>© 2024 Heron Square. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default CrewSignIn;
