import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessControl, AccessLevel } from '../contexts/AccessControlContext';
import {
  Building2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Plus,
  LogOut,
  Eye,
  X
} from 'lucide-react';
import CrewIssueForm from './CrewIssueForm';
import TenantManagement from './TenantManagement';
import PropertyManagement from './PropertyManagement';
import HamburgerMenu from './HamburgerMenu';
import OfflineIndicator from './OfflineIndicator';
import AnimatedButton from './AnimatedButton';
import Card, { IssueCard } from './Card';
import EmptyState, { StatsCard } from './EmptyState';
import { getAllIssues, updateIssueStatus, submitIssue } from '../services/issueService';
import { Issue } from '../types/Issue';
import { useErrorHandler } from '../utils/errorHandling';
import { useNotifications } from '../contexts/NotificationContext';
import { clearAllCaches } from '../services/googleSheetsService';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { handleAsyncError } = useErrorHandler();
  const { showSuccess, showError } = useNotifications();
  const { 
    currentUserLevel, 
    canManageUsers,
    canToggleStatus,
    getCrewMembers,
    addCrewMember,
    removeCrewMember,
    clearCrewSession,
    crewSession
  } = useAccessControl();
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<'all' | 'New' | 'In Process' | 'Complete'>('all');
  const [showCrewManagement, setShowCrewManagement] = useState(false);
  const [showTenantManagement, setShowTenantManagement] = useState(false);
  const [showPropertyManagement, setShowPropertyManagement] = useState(false);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [newCrewAccessLevel, setNewCrewAccessLevel] = useState<AccessLevel>(AccessLevel.SECONDARY_CREW);
  const [showCrewIssueForm, setShowCrewIssueForm] = useState(false);
  const [newCrewEmail, setNewCrewEmail] = useState('');
  const [newCrewName, setNewCrewName] = useState('');
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  const loadIssues = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      console.log('Already loading issues, skipping...');
      return;
    }
    
    // Debounce: Don't load more than once every 2 seconds
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 2000) {
      console.log('Debouncing loadIssues call');
      return;
    }
    
    isLoadingRef.current = true;
    lastLoadTimeRef.current = now;
    
    try {
      const fetchedIssues = await handleAsyncError(
        () => getAllIssues(),
        'loadIssues'
      );
      
      if (fetchedIssues) {
        setIssues(fetchedIssues);
      }
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [handleAsyncError]);

  useEffect(() => {
    loadIssues();
    
    // Listen for issue updates from other components
    const handleIssueUpdate = (event: CustomEvent) => {
      console.log('Issue update detected, refreshing issues...');
      const { action, issue } = event.detail || {};
      
      if (action === 'created' && issue) {
        // For new issues, add to local state immediately
        setIssues(prev => {
          // Check if issue already exists to prevent duplicates
          const exists = prev.some(existingIssue => existingIssue.id === issue.id);
          if (exists) {
            console.log('Issue already exists in state, skipping add');
            return prev;
          }
          console.log('Adding new issue to local state');
          return [...prev, issue];
        });
        
        // Don't refresh from server for new issues to prevent overriding
        return;
      } else {
        // For other updates, refresh from server
        loadIssues();
      }
    };
    
    window.addEventListener('issueUpdated', handleIssueUpdate as EventListener);
    
    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('issueUpdated', handleIssueUpdate as EventListener);
    };
  }, [loadIssues]);

  const handleStatusUpdate = async (issueId: string, currentStatus: 'New' | 'In Process' | 'Complete') => {
    try {
      // For Secondary Crew, only allow sequential progression
      let newStatus: 'In Process' | 'Complete';
      
      if (currentStatus === 'New') {
        newStatus = 'In Process';
      } else if (currentStatus === 'In Process') {
        newStatus = 'Complete';
      } else {
        // If already Complete, don't allow going back
        return;
      }

      await updateIssueStatus(issueId, newStatus);
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      ));
      showSuccess(
        'Status Updated',
        `Issue status has been updated to ${newStatus}`,
        3000
      );
    } catch (error) {
      showError(
        'Update Failed',
        'Failed to update issue status. Please try again.',
        5000
      );
    }
  };

  const handleStatusToggle = async (issueId: string, currentStatus: string) => {
    try {
      let newStatus: 'New' | 'In Process' | 'Complete';
      
      if (currentUserLevel === AccessLevel.PRIMARY_CREW) {
        // Primary Crew can toggle between any status
        newStatus = currentStatus === 'New' ? 'In Process' : 
                   currentStatus === 'In Process' ? 'Complete' : 'In Process';
      } else {
        // Secondary Crew can only progress sequentially
        if (currentStatus === 'New') {
          newStatus = 'In Process';
        } else if (currentStatus === 'In Process') {
          newStatus = 'Complete';
        } else {
          // If already Complete, don't allow going back
          return;
        }
      }

      await updateIssueStatus(issueId, newStatus);
      
      // Update the local state immediately for instant feedback
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      ));
      
      showSuccess(
        'Status Updated',
        `Issue status has been updated to ${newStatus}`,
        3000
      );
      
    } catch (error) {
      showError(
        'Update Failed',
        'Failed to update issue status. Please try again.',
        5000
      );
    }
  };


  const handleCrewIssueSubmit = async (data: any) => {
    try {
      // Convert crew issue data to regular issue format
      const crewIssue: Omit<Issue, 'id' | 'timestamp' | 'status'> = {
        name: data.crewName,
        address: data.address,
        unit: data.unit,
        category: data.category,
        issueType: data.issueType,
        description: data.description,
        urgency: data.urgency,
        userEmail: 'crew@heronsquare.co.za' // Default crew email
      };
      
      // Use the existing issue service to submit
      await submitIssue(crewIssue);
      console.log('Crew issue submitted:', crewIssue);
      
      // Close the form - the issue will be added via the event listener
      setShowCrewIssueForm(false);
    } catch (error) {
      console.error('Error submitting crew issue:', error);
    }
  };

  const handleAddCrewMember = async () => {
    if (!newCrewEmail.trim()) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    try {
      await addCrewMember(newCrewEmail, newCrewAccessLevel, newCrewName);
      setNewCrewEmail('');
      setNewCrewName('');
      setNewCrewAccessLevel(AccessLevel.SECONDARY_CREW);
      setShowAddCrew(false);
      showSuccess('Success', 'Crew member added successfully!');
      // Force re-render by updating a dummy state
      setIssues([...issues]);
    } catch (error: any) {
      showError('Add Crew Member Failed', error.message);
    }
  };

  const handleRemoveCrewMember = async (email: string) => {
    if (window.confirm(`Are you sure you want to remove ${email}?`)) {
      try {
        await removeCrewMember(email);
        showSuccess('Success', 'Crew member removed successfully!');
        // Force re-render by updating a dummy state
        setIssues([...issues]);
      } catch (error: any) {
        showError('Remove Crew Member Failed', `Cannot remove crew member: ${error.message}`);
      }
    }
  };

  const handleLogout = () => {
    clearCrewSession();
    navigate('/');
  };

  const handleClearCache = () => {
    clearAllCaches();
    setIssues([]); // Clear the local state
    showSuccess(
      'Cache Cleared',
      'All cached data has been cleared. The app will now sync with Google Sheets.',
      3000
    );
    // Force a fresh load after clearing cache
    setTimeout(() => {
      loadIssues();
    }, 1000);
  };

  const filteredIssues = issues.filter(issue => 
    filter === 'all' ? true : issue.status === filter
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Hamburger Menu for Primary Crew */}
              {canManageUsers && (
                <HamburgerMenu
                  onManageCrew={() => setShowCrewManagement(true)}
                  onManageProperties={() => setShowPropertyManagement(true)}
                  onManageTenants={() => setShowTenantManagement(true)}
                />
              )}
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  Maintenance Crew Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  {crewSession?.name || crewSession?.email} • {currentUserLevel === AccessLevel.PRIMARY_CREW ? 'Primary Crew' : 'Secondary Crew'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center space-x-2 sm:space-x-3">
              <OfflineIndicator />
              
              {/* Refresh Button */}
              <AnimatedButton
                onClick={loadIssues}
                variant="secondary"
                size="sm"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </AnimatedButton>
              
              {/* Clear Cache Button */}
              <AnimatedButton
                onClick={handleClearCache}
                variant="secondary"
                size="sm"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Cache
              </AnimatedButton>
              
              {/* Submit Issue Button for Crew */}
              <AnimatedButton
                onClick={() => setShowCrewIssueForm(true)}
                variant="success"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Issue
              </AnimatedButton>
              
              <AnimatedButton
                onClick={handleLogout}
                variant="secondary"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </AnimatedButton>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <StatsCard
            title="New Issues"
            value={issues.filter(i => i.status === 'New').length}
            icon={<AlertCircle className="h-6 w-6" />}
            color="blue"
          />
          <StatsCard
            title="In Process"
            value={issues.filter(i => i.status === 'In Process').length}
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <StatsCard
            title="Completed"
            value={issues.filter(i => i.status === 'Complete').length}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <StatsCard
            title="Total Issues"
            value={issues.length}
            icon={<Eye className="h-6 w-6" />}
            color="purple"
          />
        </div>

        {/* Crew Management Panel */}
        {showCrewManagement && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                <h2 className="text-lg font-medium text-gray-900">Crew Management</h2>
                <button
                  onClick={() => setShowAddCrew(true)}
                  className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Crew Member
                </button>
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-4">
              <div className="space-y-3">
                {getCrewMembers().map((member) => (
                  <div key={member.email} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{member.name || member.email}</p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        member.accessLevel === AccessLevel.PRIMARY_CREW 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.accessLevel === AccessLevel.PRIMARY_CREW ? 'Primary Crew' : 'Secondary Crew'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveCrewMember(member.email)}
                      className="text-red-600 hover:text-red-800 p-2 -m-2 self-end sm:self-auto"
                      aria-label={`Remove ${member.email}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Crew Member Modal */}
        {showAddCrew && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 sm:top-20 mx-auto p-5 border w-11/12 sm:w-96 max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Crew Member</h3>
                <button onClick={() => setShowAddCrew(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCrewEmail}
                    onChange={(e) => setNewCrewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="crew@example.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                  <input
                    type="text"
                    value={newCrewName}
                    onChange={(e) => setNewCrewName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
                  <select
                    value={newCrewAccessLevel}
                    onChange={(e) => setNewCrewAccessLevel(e.target.value as AccessLevel)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={AccessLevel.SECONDARY_CREW}>Secondary Crew</option>
                    {canManageUsers && (
                      <option value={AccessLevel.PRIMARY_CREW}>Primary Crew</option>
                    )}
                  </select>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddCrew(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCrewMember}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {(['all', 'New', 'In Process', 'Complete'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {status === 'all' ? 'All Issues' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Issues List */}
        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {filter === 'all' ? 'All Maintenance Issues' : `${filter} Issues`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          {filteredIssues.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-16 w-16 text-gray-400" />}
              title="No issues found"
              description={
                filter === 'all' 
                  ? 'No maintenance issues have been reported yet.' 
                  : `No issues with status "${filter}".`
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  canEditStatus={canToggleStatus}
                  onStatusChange={canToggleStatus ? handleStatusToggle : handleStatusUpdate}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
      
      {/* Crew Issue Form Modal */}
      {showCrewIssueForm && (
        <CrewIssueForm
          onSubmit={handleCrewIssueSubmit}
          onClose={() => setShowCrewIssueForm(false)}
        />
      )}

      {/* Tenant Management Modal */}
      {showTenantManagement && (
        <TenantManagement
          onClose={() => setShowTenantManagement(false)}
        />
      )}

      {/* Property Management Modal */}
      {showPropertyManagement && (
        <PropertyManagement
          onClose={() => setShowPropertyManagement(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
