import { Issue, IssueFormData, IssueNote, StatusHistoryEntry } from '../types/Issue';
import { googleSheetsService } from './googleSheetsService';
import { emailService } from './emailService';
import { handleError, retryWithBackoff, waitForOnline } from '../utils/errorHandling';
import { uploadIssuePhoto } from './imageService';
import { auth } from '../config/firebase';

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
export const submitIssue = async (formData: IssueFormData): Promise<Issue> => {
  let imageUrl: string | undefined;
  try {
    // Validate input data
    if (!formData.name?.trim()) {
      throw handleError(new Error('Name is required'), 'submitIssue');
    }
    if (!formData.address?.trim()) {
      throw handleError(new Error('Address is required'), 'submitIssue');
    }
    if (!formData.unit?.trim()) {
      throw handleError(new Error('Unit is required'), 'submitIssue');
    }
    if (!formData.userEmail?.trim()) {
      throw handleError(new Error('User email is required'), 'submitIssue');
    }

    // Generate issue ID first (needed for image upload path)
    const issueId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Upload image if provided
    if (formData.imageFile) {
      try {
        const currentUser = auth.currentUser;
        const uploadResult = await uploadIssuePhoto(formData.imageFile, issueId, currentUser || undefined);
        imageUrl = uploadResult?.url;
        console.log('Image uploaded successfully:', imageUrl);
      } catch (imageError) {
        console.error('Image upload failed:', imageError);
        // Continue without image - don't block issue submission
        throw handleError(new Error(`Image upload failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`), 'submitIssue');
      }
    }

    // Prepare issue data (excluding imageFile)
    const { imageFile, ...issueData } = formData;
    const issueDataWithImage: Omit<Issue, 'id' | 'timestamp' | 'status'> = {
      ...issueData,
      imageUrl,
    };

    // Use Google Sheets service as primary with retry logic
    const newIssue = await retryWithBackoff(
      () => googleSheetsService.submitIssue(issueDataWithImage),
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
    const { imageFile, ...issueDataWithoutFile } = formData;
    const newIssue: Issue = {
      ...issueDataWithoutFile,
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      status: 'New',
      imageUrl: imageUrl // Include imageUrl if upload succeeded before error
    };
    
    // Store in localStorage as backup
    const existingIssues = safeLocalStorage.get('maintenance_issues') || [];
    existingIssues.push(newIssue);
    safeLocalStorage.set('maintenance_issues', existingIssues);
    
    // Queue for later if offline
    if (!isOnline) {
      offlineQueue.push({ action: 'submitIssue', data: formData });
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

export const updateIssueStatus = async (issueId: string, status: 'New' | 'In Process' | 'Complete', userId: string = 'crew'): Promise<void> => {
  try {
    // Add status history entry
    const statusHistory = safeLocalStorage.get(`issue_${issueId}_history`) || [];
    statusHistory.push({
      status,
      changedAt: new Date().toISOString(),
      changedBy: userId
    });
    safeLocalStorage.set(`issue_${issueId}_history`, statusHistory);

    // Update issue with status history
    const existingIssues = safeLocalStorage.get('maintenance_issues') || [];
    const updatedIssues = existingIssues.map((issue: Issue) => 
      issue.id === issueId 
        ? { ...issue, status, statusHistory: statusHistory.slice(-10) } // Keep last 10 entries
        : issue
    );
    safeLocalStorage.set('maintenance_issues', updatedIssues);

    // Use Google Sheets service as primary
    await googleSheetsService.updateIssueStatus(issueId, status);
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('issueUpdated', { 
      detail: { action: 'updated', issueId, status } 
    }));
  } catch (error) {
    console.error('Google Sheets update failed, falling back to localStorage:', error);
    
    // Fallback to localStorage (already updated above)
    // Queue for later if offline
    if (!isOnline) {
      offlineQueue.push({ action: 'updateStatus', data: { issueId, status } });
    }
  }
};

// Notes management
export const addIssueNote = async (issueId: string, text: string, createdBy: string): Promise<void> => {
  const note: IssueNote = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    text,
    createdAt: new Date().toISOString(),
    createdBy,
    createdByName: createdBy
  };

  const notes = safeLocalStorage.get(`issue_${issueId}_notes`) || [];
  notes.push(note);
  safeLocalStorage.set(`issue_${issueId}_notes`, notes);

  // Also update the issue in the main list
  const existingIssues = safeLocalStorage.get('maintenance_issues') || [];
  const updatedIssues = existingIssues.map((issue: Issue) => 
    issue.id === issueId 
      ? { ...issue, notes: [...(issue.notes || []), note] }
      : issue
  );
  safeLocalStorage.set('maintenance_issues', updatedIssues);
};

export const getIssueNotes = async (issueId: string): Promise<IssueNote[]> => {
  const notes = safeLocalStorage.get(`issue_${issueId}_notes`) || [];
  return notes.sort((a: IssueNote, b: IssueNote) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getIssueStatusHistory = async (issueId: string): Promise<StatusHistoryEntry[]> => {
  const history = safeLocalStorage.get(`issue_${issueId}_history`) || [];
  return history.sort((a: StatusHistoryEntry, b: StatusHistoryEntry) => 
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );
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
