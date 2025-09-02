import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import IssueForm from './IssueForm';
import { Issue } from '../types/Issue';
import { submitIssue, getUserIssues } from '../services/issueService';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserIssues = useCallback(async () => {
    try {
      if (currentUser?.email) {
        const userIssues = await getUserIssues(currentUser.email);
        setIssues(userIssues);
      }
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    loadUserIssues();
  }, [loadUserIssues]);

  const handleSubmitIssue = async (issueData: Omit<Issue, 'id' | 'timestamp' | 'status'>) => {
    try {
      const newIssue = await submitIssue({
        ...issueData,
        userEmail: currentUser?.email || '',
      });
      setIssues(prev => [newIssue, ...prev]);
      setShowIssueForm(false);
    } catch (error) {
      console.error('Error submitting issue:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

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
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 space-y-2 sm:space-y-0">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Maintenance Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600">Welcome back, {currentUser?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Action Bar */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <button
            onClick={() => setShowIssueForm(true)}
            className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Log New Issue
          </button>
        </div>

        {/* Issues List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">Your Maintenance Issues</h2>
          </div>
          
          {issues.length === 0 ? (
            <div className="px-3 sm:px-4 lg:px-6 py-8 sm:py-12 text-center">
              <div className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400">
                <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12" />
              </div>
              <h3 className="mt-2 text-xs sm:text-sm font-medium text-gray-900">No issues reported</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Get started by logging a new maintenance issue.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {issues.map((issue) => (
                <div key={issue.id} className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2 space-y-1 sm:space-y-0">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900">
                          {issue.name} - {issue.unit} {issue.address}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                          {getStatusIcon(issue.status)}
                          <span className="ml-1">{issue.status}</span>
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">
                        <span className="font-medium">{issue.category}:</span> {issue.issueType}
                      </p>
                      {issue.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mb-2">{issue.description}</p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs text-gray-500 space-y-1 sm:space-y-0">
                        <span>Urgency: {issue.urgency}</span>
                        <span>Submitted: {new Date(issue.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Issue Form Modal */}
      {showIssueForm && (
        <IssueForm
          onSubmit={handleSubmitIssue}
          onClose={() => setShowIssueForm(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
