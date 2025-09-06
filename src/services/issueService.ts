import { Issue } from '../types/Issue';
import { googleSheetsService } from './googleSheetsService';
import { emailService } from './emailService';
import { handleError, retryWithBackoff, waitForOnline } from '../utils/errorHandling';

// Network status tracking
let isOnline = navigator.onLine;
let offlineQueue: Array<{ action: string; data: any }> = [];

// Listen for network status changes
window.addEventListener('online', () => {
  isOnline = true;
  console.log('Network connection restored');
  processOfflineQueue();
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('Network connection lost - switching to offline mode');
});

// Process queued actions when back online
const processOfflineQueue = async () => {
  if (offlineQueue.length === 0) return;
  
  console.log(`Processing ${offlineQueue.length} queued actions...`);
  
  // Wait for stable connection
  await waitForOnline();
  
  const failedActions: Array<{ action: string; data: any }> = [];
  
  for (const queuedAction of offlineQueue) {
    try {
      if (queuedAction.action === 'submitIssue') {
        await retryWithBackoff(() => submitIssue(queuedAction.data), 3, 1000);
      } else if (queuedAction.action === 'updateStatus') {
        await retryWithBackoff(() => updateIssueStatus(queuedAction.data.issueId, queuedAction.data.status), 3, 1000);
      }
    } catch (error) {
      console.error('Error processing queued action:', error);
      failedActions.push(queuedAction);
    }
  }
  
  // Keep failed actions for next retry
  offlineQueue = failedActions;
  console.log(`Offline queue processed. ${failedActions.length} actions failed and will be retried.`);
};



// Enhanced localStorage with better error handling
const safeLocalStorage = {
  get: (key: string): any => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  
  set: (key: string, value: any): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }
};

// Main issue service functions - now using Google Sheets as primary source
export const submitIssue = async (issueData: Omit<Issue, 'id' | 'timestamp' | 'status'>): Promise<Issue> => {
  try {
    // Validate input data
    if (!issueData.name?.trim()) {
      throw handleError(new Error('Name is required'), 'submitIssue');
    }
    if (!issueData.address?.trim()) {
      throw handleError(new Error('Address is required'), 'submitIssue');
    }
    if (!issueData.unit?.trim()) {
      throw handleError(new Error('Unit is required'), 'submitIssue');
    }
    if (!issueData.userEmail?.trim()) {
      throw handleError(new Error('User email is required'), 'submitIssue');
    }

    // Use Google Sheets service as primary with retry logic
    const newIssue = await retryWithBackoff(
      () => googleSheetsService.submitIssue(issueData),
      3,
      1000
    );
    
    // Send email notifications (non-blocking)
    Promise.all([
      emailService.sendMaintenanceNotification(newIssue).catch(error => {
        console.warn('Maintenance notification failed:', error);
        return null;
      }),
      emailService.sendAdminNotification(newIssue).catch(error => {
        console.warn('Admin notification failed:', error);
        return null;
      })
    ]);
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('issueUpdated', { 
      detail: { action: 'created', issue: newIssue } 
    }));
    
    return newIssue;
  } catch (error) {
    const appError = handleError(error, 'submitIssue');
    
    // Fallback to localStorage
    const newIssue: Issue = {
      ...issueData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: 'New'
    };
    
    // Store in localStorage as backup
    const existingIssues = safeLocalStorage.get('maintenance_issues') || [];
    existingIssues.push(newIssue);
    safeLocalStorage.set('maintenance_issues', existingIssues);
    
    // Queue for later if offline
    if (!isOnline) {
      offlineQueue.push({ action: 'submitIssue', data: issueData });
    }
    
    // Re-throw the error for the UI to handle
    throw appError;
  }
};

export const getUserIssues = async (userEmail: string): Promise<Issue[]> => {
  try {
    // Use Google Sheets service as primary
    return await googleSheetsService.getUserIssues(userEmail);
  } catch (error) {
    console.error('Google Sheets fetch failed, falling back to localStorage:', error);
    
    // Fallback to localStorage
    const existingIssues = safeLocalStorage.get('maintenance_issues') || [];
    const userIssues = existingIssues.filter((issue: Issue) => issue.userEmail === userEmail);
    return userIssues.sort((a: Issue, b: Issue) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
};

export const getAllIssues = async (): Promise<Issue[]> => {
  try {
    // Use Google Sheets service as primary
    return await googleSheetsService.fetchAllIssues();
  } catch (error) {
    console.error('Google Sheets fetch failed, falling back to localStorage:', error);
    
    // Fallback to localStorage
    const existingIssues = safeLocalStorage.get('maintenance_issues') || [];
    return existingIssues.sort((a: Issue, b: Issue) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
};

export const updateIssueStatus = async (issueId: string, status: 'In Process' | 'Complete', userId: string = 'crew'): Promise<void> => {
  try {
    // Use Google Sheets service as primary
    await googleSheetsService.updateIssueStatus(issueId, status);
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('issueUpdated', { 
      detail: { action: 'updated', issueId, status } 
    }));
  } catch (error) {
    console.error('Google Sheets update failed, falling back to localStorage:', error);
    
    // Fallback to localStorage
    const existingIssues = safeLocalStorage.get('maintenance_issues') || [];
    const updatedIssues = existingIssues.map((issue: Issue) => 
      issue.id === issueId ? { ...issue, status } : issue
    );
    safeLocalStorage.set('maintenance_issues', updatedIssues);
    
    // Queue for later if offline
    if (!isOnline) {
      offlineQueue.push({ action: 'updateStatus', data: { issueId, status } });
    }
  }
};

// Add function to refresh issues for crew members
export const refreshIssuesForCrew = async (): Promise<Issue[]> => {
  try {
    // Force refresh from Google Sheets
    googleSheetsService.clearCache();
    return await googleSheetsService.fetchAllIssues();
  } catch (error) {
    console.error('Google Sheets refresh failed, using localStorage:', error);
    return getAllIssues();
  }
};

// Network status utility
export const getNetworkStatus = () => isOnline;
export const getOfflineQueueLength = () => offlineQueue.length;
