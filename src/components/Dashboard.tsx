import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, AlertCircle } from 'lucide-react';
const IssueForm = lazy(() => import('./IssueForm'));
import OfflineIndicator from './OfflineIndicator';
import AnimatedButton from './AnimatedButton';
import Card, { IssueCard } from './Card';
import EmptyState from './EmptyState';
import { Issue, IssueFormData } from '../types/Issue';
import { submitIssue, getUserIssues } from '../services/issueService';
import { useErrorHandler } from '../utils/errorHandling';
import { useNotifications } from '../contexts/NotificationContext';

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { handleAsyncError } = useErrorHandler();
  const { showSuccess, showError } = useNotifications();
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  const loadUserIssues = useCallback(async () => {
    if (!currentUser?.email) return;
    
    const userIssues = await handleAsyncError(
      () => getUserIssues(currentUser.email!),
      'loadUserIssues'
    );
    
    if (userIssues) {
      setIssues(userIssues);
    }
  }, [currentUser?.email, handleAsyncError]);

  useEffect(() => {
    loadUserIssues();
  }, [loadUserIssues]);

  const handleSubmitIssue = async (formData: IssueFormData) => {
    try {
      const newIssue = await submitIssue({
        ...formData,
        userEmail: currentUser?.email || formData.userEmail,
        creatorUid: currentUser?.uid || formData.creatorUid,
      });
      setIssues(prev => [newIssue, ...prev]);
      setShowIssueForm(false);
      showSuccess(
        'Issue Submitted',
        'Your maintenance request has been submitted successfully. The crew will be notified.',
        5000
      );
    } catch (error) {
      showError(
        'Submission Failed',
        'Failed to submit your maintenance request. Please try again.',
        8000
      );
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
            <div className="flex items-center space-x-2">
              <OfflineIndicator />
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
      </div>

      <div className="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Action Bar */}
        <div className="mb-6 sm:mb-8">
          <AnimatedButton
            onClick={() => setShowIssueForm(true)}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log New Issue
          </AnimatedButton>
        </div>

        {/* Issues List */}
        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Maintenance Issues</h2>
            <p className="text-sm text-gray-600 mt-1">Track the progress of your submitted issues</p>
          </div>
          
          {issues.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-16 w-16 text-gray-400" />}
              title="No issues reported"
              description="You haven't submitted any maintenance requests yet. Get started by logging a new issue."
              action={{
                label: "Log New Issue",
                onClick: () => setShowIssueForm(true)
              }}
            />
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  canEditStatus={false}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Issue Form Modal - Lazy loaded for performance */}
      {showIssueForm && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        }>
          <IssueForm
            onSubmit={handleSubmitIssue}
            onClose={() => setShowIssueForm(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Dashboard;
