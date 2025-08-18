import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccessControl, AccessLevel } from '../contexts/AccessControlContext';
import { 
  Building2, 
  Wrench, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Plus,
  Users,
  LogOut,
  Eye,
  X
} from 'lucide-react';
import CrewIssueForm from './CrewIssueForm';
import { getAllIssues, updateIssueStatus, submitIssue } from '../services/issueService';
import { Issue } from '../types/Issue';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'New' | 'In Process' | 'Complete'>('all');
  const [showCrewManagement, setShowCrewManagement] = useState(false);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [newCrewAccessLevel, setNewCrewAccessLevel] = useState<AccessLevel>(AccessLevel.SECONDARY_CREW);
  const [showCrewIssueForm, setShowCrewIssueForm] = useState(false);
  const [newCrewEmail, setNewCrewEmail] = useState('');
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewMember, setNewCrewMember] = useState({
    email: '',
    accessLevel: AccessLevel.SECONDARY_CREW as AccessLevel,
    name: ''
  });

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      const allIssues = await getAllIssues();
      setIssues(allIssues);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (issueId: string, newStatus: 'In Process' | 'Complete') => {
    try {
      await updateIssueStatus(issueId, newStatus);
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: newStatus } : issue
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Primary Crew can toggle between any status
  const handleStatusToggle = (issueId: string, currentStatus: string) => {
    let newStatus: 'In Process' | 'Complete';
    
    if (currentUserLevel === AccessLevel.PRIMARY_CREW) {
      // Primary Crew can toggle between any status
      if (currentStatus === 'New') newStatus = 'In Process';
      else if (currentStatus === 'In Process') newStatus = 'Complete';
      else newStatus = 'In Process'; // From Complete, go back to In Process
    } else {
      // Secondary Crew can only progress sequentially
      if (currentStatus === 'New') newStatus = 'In Process';
      else if (currentStatus === 'In Process') newStatus = 'Complete';
      else return; // Stay at Completed for Secondary Crew
    }
    
    updateIssueStatus(issueId, newStatus);
    loadIssues();
  };

  const handleCrewIssueSubmit = async (data: any) => {
    try {
      // Convert crew issue data to regular issue format
      const crewIssue: Omit<Issue, 'id' | 'timestamp' | 'status'> = {
        name: data.crewName,
        address: data.address,
        unit: data.unit,
        description: data.description,
        urgency: data.urgency,
        userEmail: data.crewEmail
      };
      
      // Use the existing issue service to submit
      await submitIssue(crewIssue);
      console.log('Crew issue submitted:', crewIssue);
      
      // Close the form and refresh issues
      setShowCrewIssueForm(false);
      loadIssues();
    } catch (error) {
      console.error('Error submitting crew issue:', error);
    }
  };

  const handleAddCrewMember = async () => {
    try {
      await addCrewMember(newCrewEmail, newCrewAccessLevel, newCrewName);
      setNewCrewEmail('');
      setNewCrewName('');
      setNewCrewAccessLevel(AccessLevel.SECONDARY_CREW);
      setShowAddCrew(false);
      // Refresh crew list
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRemoveCrewMember = async (email: string) => {
    if (window.confirm(`Are you sure you want to remove ${email}?`)) {
      try {
        await removeCrewMember(email);
        // Refresh crew list
      } catch (error: any) {
        alert(`Cannot remove crew member: ${error.message}`);
      }
    }
  };

  const handleLogout = () => {
    clearCrewSession();
    navigate('/');
  };

  const filteredIssues = issues.filter(issue => 
    filter === 'all' ? true : issue.status === filter
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'In Process':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800';
      case 'In Process':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Maintenance Crew Dashboard
                </h1>
                <p className="text-gray-600">
                  {crewSession?.name || crewSession?.email} • {currentUserLevel === AccessLevel.PRIMARY_CREW ? 'Primary Crew' : 'Secondary Crew'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Submit Issue Button for Crew */}
              <button
                onClick={() => setShowCrewIssueForm(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Issue
              </button>
              
              {/* Manage Crew Button (Primary Crew Only) */}
              {canManageUsers && (
                <button
                  onClick={() => setShowCrewManagement(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Crew
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New Issues</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {issues.filter(i => i.status === 'New').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Process</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {issues.filter(i => i.status === 'In Process').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {issues.filter(i => i.status === 'Complete').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Eye className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Issues</p>
                <p className="text-2xl font-semibold text-gray-900">{issues.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Crew Management Panel */}
        {showCrewManagement && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Crew Management</h2>
                <button
                  onClick={() => setShowAddCrew(true)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Crew Member
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-4">
                {getCrewMembers().map((member) => (
                  <div key={member.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{member.name || member.email}</p>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.accessLevel === AccessLevel.PRIMARY_CREW 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.accessLevel === AccessLevel.PRIMARY_CREW ? 'Primary Crew' : 'Secondary Crew'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveCrewMember(member.email)}
                      className="text-red-600 hover:text-red-800"
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
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="crew@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                  <input
                    type="text"
                    value={newCrewName}
                    onChange={(e) => setNewCrewName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
                  <select
                    value={newCrewAccessLevel}
                    onChange={(e) => setNewCrewAccessLevel(e.target.value as AccessLevel)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filter === 'all' ? 'All Maintenance Issues' : `${filter} Issues`}
            </h2>
          </div>
          
          {filteredIssues.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <AlertCircle className="h-12 w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No issues found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' ? 'No maintenance issues have been reported yet.' : `No issues with status "${filter}".`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredIssues.map((issue) => (
                <div key={issue.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {issue.name} - {issue.unit} {issue.address}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                          {getStatusIcon(issue.status)}
                          <span className="ml-1">{issue.status}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Urgency: {issue.urgency}</span>
                        <span>Submitted: {new Date(issue.timestamp).toLocaleDateString()}</span>
                        <span>Tenant: {issue.userEmail}</span>
                      </div>
                    </div>
                    
                    {/* Status Update Controls */}
                    <div className="ml-4 flex flex-col space-y-2">
                      {canToggleStatus ? (
                        // Primary Crew: Toggle between any status
                        <button
                          onClick={() => handleStatusToggle(issue.id, issue.status)}
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200"
                        >
                          Toggle Status
                        </button>
                      ) : (
                        // Secondary Crew: Sequential progression only
                        <>
                          {issue.status === 'New' && (
                            <button
                              onClick={() => handleStatusUpdate(issue.id, 'In Process')}
                              className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200"
                            >
                              Start Work
                            </button>
                          )}
                          {issue.status === 'In Process' && (
                            <button
                              onClick={() => handleStatusUpdate(issue.id, 'Complete')}
                              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200"
                            >
                              Mark Complete
                            </button>
                          )}
                          {issue.status === 'Complete' && (
                            <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md">
                              Completed
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Crew Issue Form Modal */}
      {showCrewIssueForm && (
        <CrewIssueForm
          onSubmit={handleCrewIssueSubmit}
          onClose={() => setShowCrewIssueForm(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
