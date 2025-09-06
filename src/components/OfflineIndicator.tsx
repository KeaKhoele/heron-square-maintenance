import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { getOfflineQueueLength } from '../services/issueService';

interface OfflineIndicatorProps {
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueLength, setOfflineQueueLength] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineQueueLength(0);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const updateQueueLength = () => {
      setOfflineQueueLength(getOfflineQueueLength());
    };

    // Listen for network status changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for queue updates
    window.addEventListener('issueUpdated', updateQueueLength);
    
    // Update queue length periodically
    const interval = setInterval(updateQueueLength, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('issueUpdated', updateQueueLength);
      clearInterval(interval);
    };
  }, []);

  if (isOnline) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg ${className}`}>
        <Wifi className="h-4 w-4" />
        <span className="text-sm font-medium">Online</span>
        <CheckCircle className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg ${className}`}>
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">Offline</span>
      {offlineQueueLength > 0 && (
        <div className="flex items-center space-x-1">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{offlineQueueLength} pending</span>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
