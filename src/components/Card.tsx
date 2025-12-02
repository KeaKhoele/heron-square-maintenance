import React, { useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import IssueDetailsView from './IssueDetailsView';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
  shadow = 'md',
  onClick
}) => {
  const baseClasses = 'bg-white rounded-xl border border-gray-200';
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };
  
  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };
  
  const hoverClasses = hover ? 'cursor-pointer' : '';

  return (
    <div 
      className={`${baseClasses} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface IssueCardProps {
  issue: {
    id: string;
    name: string;
    address: string;
    unit: string;
    category: string;
    issueType: string;
    description?: string;
    urgency: 'High' | 'Medium' | 'Low';
    status: 'New' | 'In Process' | 'Complete';
    timestamp: string;
    imageUrl?: string;
  };
  onStatusChange?: (issueId: string, currentStatus: 'New' | 'In Process' | 'Complete') => void;
  canEditStatus?: boolean;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  issue,
  onStatusChange,
  canEditStatus = false
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complete':
        return '✅';
      case 'In Process':
        return '🔄';
      default:
        return '📋';
    }
  };

  return (
    <>
    <Card hover className="group cursor-pointer" onClick={() => setShowDetails(true)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {issue.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {issue.unit} {issue.address}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(issue.status)}`}>
            {getStatusIcon(issue.status)} {issue.status}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium text-gray-700">{issue.category}:</span>
          <span className="text-sm text-gray-600">{issue.issueType}</span>
        </div>
        
        {issue.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {issue.description}
          </p>
        )}
        
        {issue.imageUrl && (
          <div className="mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowImageModal(true);
              }}
              className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-300 hover:border-blue-500 transition-colors group"
              aria-label="View image"
            >
              <img
                src={issue.imageUrl}
                alt="Issue"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getUrgencyColor(issue.urgency)}`}>
            {issue.urgency} Priority
          </span>
          <span className="text-xs text-gray-500">
            {new Date(issue.timestamp).toLocaleDateString()}
          </span>
        </div>
      </div>

      {canEditStatus && onStatusChange && (
        <div className="flex space-x-2 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
          {issue.status === 'New' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(issue.id, issue.status);
              }}
              className="flex-1 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              Start Work
            </button>
          )}
          {issue.status === 'In Process' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(issue.id, issue.status);
              }}
              className="flex-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg"
            >
              Mark Complete
            </button>
          )}
          {issue.status === 'Complete' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(issue.id, issue.status);
              }}
              className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg"
            >
              Reopen Issue
            </button>
          )}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {showImageModal && issue.imageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
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
    </Card>

    {/* Issue Details Modal */}
    {showDetails && (
      <IssueDetailsView
        issue={issue as any}
        onClose={() => setShowDetails(false)}
        onStatusChange={onStatusChange}
        canEditStatus={canEditStatus}
      />
    )}
    </>
  );
};

export default Card;
