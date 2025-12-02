import React, { useState, useEffect } from 'react';
import { X, Clock, MessageSquare, Image as ImageIcon, User, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { Issue, IssueNote } from '../types/Issue';
import { useAccessControl } from '../contexts/AccessControlContext';
import { useAuth } from '../contexts/AuthContext';
import { addIssueNote, getIssueNotes } from '../services/issueService';

interface IssueDetailsViewProps {
  issue: Issue;
  onClose: () => void;
  onStatusChange?: (issueId: string, currentStatus: 'New' | 'In Process' | 'Complete') => void;
  canEditStatus?: boolean;
}

const IssueDetailsView: React.FC<IssueDetailsViewProps> = ({
  issue,
  onClose,
  onStatusChange,
  canEditStatus = false
}) => {
  const { isCrewMember, crewSession } = useAccessControl();
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<IssueNote[]>(issue.notes || []);
  const [newNote, setNewNote] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [issue.id]);

  const loadNotes = async () => {
    try {
      const issueNotes = await getIssueNotes(issue.id);
      setNotes(issueNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const creatorName = isCrewMember 
      ? (crewSession?.name || crewSession?.email || 'Crew Member')
      : (currentUser?.email || 'Tenant');

    try {
      setLoading(true);
      await addIssueNote(issue.id, newNote.trim(), creatorName);
      setNewNote('');
      await loadNotes();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Process':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High':
        return 'text-red-600 bg-red-50';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'Low':
        return 'text-green-600 bg-green-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-ZA', {
        timeZone: 'Africa/Johannesburg',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Issue Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 -m-2"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {/* Issue Info */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(issue.status)}`}>
                {issue.status}
              </span>
              <span className={`px-3 py-1 rounded-md text-sm font-medium ${getUrgencyColor(issue.urgency)}`}>
                {issue.urgency} Priority
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start space-x-2">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Tenant</p>
                  <p className="font-medium text-gray-900">{issue.name}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{issue.unit}, {issue.address}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="font-medium text-gray-900">{formatTimestamp(issue.timestamp)}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{issue.category}: {issue.issueType}</p>
                </div>
              </div>
            </div>

            {issue.description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap">{issue.description}</p>
              </div>
            )}

            {issue.imageUrl && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Photo</p>
                <button
                  onClick={() => setShowImageModal(true)}
                  className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-300 hover:border-blue-500 transition-colors group"
                >
                  <img
                    src={issue.imageUrl}
                    alt="Issue"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Status History */}
          {issue.statusHistory && issue.statusHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Status History
              </h3>
              <div className="space-y-2">
                {issue.statusHistory.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{entry.status}</p>
                      <p className="text-sm text-gray-500">{formatTimestamp(entry.changedAt)}</p>
                      <p className="text-xs text-gray-400 mt-1">by {entry.changedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes/Comments */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Notes & Comments
            </h3>

            {/* Notes List */}
            <div className="space-y-3 mb-4">
              {notes.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No notes yet</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm text-gray-900">{note.createdByName || note.createdBy}</p>
                      <p className="text-xs text-gray-400">{formatTimestamp(note.createdAt)}</p>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note (Crew Only) */}
            {canEditStatus && (
              <div className="border-t pt-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note or comment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            )}
          </div>

          {/* Status Change Buttons */}
          {canEditStatus && onStatusChange && (
            <div className="flex space-x-2 pt-4 border-t">
              {issue.status === 'New' && (
                <button
                  onClick={() => {
                    onStatusChange(issue.id, issue.status);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100"
                >
                  Start Work
                </button>
              )}
              {issue.status === 'In Process' && (
                <button
                  onClick={() => {
                    onStatusChange(issue.id, issue.status);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                >
                  Mark Complete
                </button>
              )}
              {issue.status === 'Complete' && (
                <button
                  onClick={() => {
                    onStatusChange(issue.id, issue.status);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  Reopen Issue
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && issue.imageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-colors z-10"
              aria-label="Close image"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={issue.imageUrl}
              alt="Issue"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueDetailsView;

