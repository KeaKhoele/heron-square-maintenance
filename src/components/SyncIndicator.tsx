import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export interface SyncStatus {
  isSyncing: boolean;
  lastSync?: Date;
  hasError: boolean;
  pendingChanges: number;
}

interface SyncIndicatorProps {
  syncStatus: SyncStatus;
  className?: string;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({ syncStatus, className = '' }) => {
  const [timeSinceSync, setTimeSinceSync] = useState<string>('');

  useEffect(() => {
    if (!syncStatus.lastSync) return;

    const updateTimeSinceSync = () => {
      const now = new Date();
      const diff = now.getTime() - syncStatus.lastSync!.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setTimeSinceSync(`${days}d ago`);
      } else if (hours > 0) {
        setTimeSinceSync(`${hours}h ago`);
      } else if (minutes > 0) {
        setTimeSinceSync(`${minutes}m ago`);
      } else {
        setTimeSinceSync('Just now');
      }
    };

    updateTimeSinceSync();
    const interval = setInterval(updateTimeSinceSync, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [syncStatus.lastSync]);

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) {
      return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
    
    if (syncStatus.hasError) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    
    if (syncStatus.pendingChanges > 0) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) {
      return 'Syncing...';
    }
    
    if (syncStatus.hasError) {
      return 'Sync failed';
    }
    
    if (syncStatus.pendingChanges > 0) {
      return `${syncStatus.pendingChanges} pending`;
    }
    
    return 'Synced';
  };

  const getStatusColor = () => {
    if (syncStatus.isSyncing) {
      return 'text-blue-600';
    }
    
    if (syncStatus.hasError) {
      return 'text-red-600';
    }
    
    if (syncStatus.pendingChanges > 0) {
      return 'text-yellow-600';
    }
    
    return 'text-green-600';
  };

  return (
    <div className={`flex items-center space-x-2 px-2 py-1 bg-gray-50 rounded-md ${className}`}>
      {getStatusIcon()}
      <span className={`text-xs font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {syncStatus.lastSync && !syncStatus.isSyncing && (
        <span className="text-xs text-gray-500">
          {timeSinceSync}
        </span>
      )}
    </div>
  );
};

export default SyncIndicator;
