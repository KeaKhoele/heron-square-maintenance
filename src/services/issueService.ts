import { Issue } from '../types/Issue';

// Mock service for now - will be replaced with actual Google Sheets API integration
export const submitIssue = async (issueData: Omit<Issue, 'id' | 'timestamp' | 'status'>): Promise<Issue> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const newIssue: Issue = {
    ...issueData,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    status: 'New'
  };

  // TODO: Integrate with Google Sheets API
  // TODO: Send email notifications via Resend API
  
  // Store in localStorage for demo purposes
  const existingIssues = JSON.parse(localStorage.getItem('maintenance_issues') || '[]');
  existingIssues.push(newIssue);
  localStorage.setItem('maintenance_issues', JSON.stringify(existingIssues));

  return newIssue;
};

export const getUserIssues = async (userEmail: string): Promise<Issue[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // TODO: Fetch from Google Sheets API
  const existingIssues = JSON.parse(localStorage.getItem('maintenance_issues') || '[]');
  return existingIssues.filter((issue: Issue) => issue.userEmail === userEmail);
};

export const getAllIssues = async (): Promise<Issue[]> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // TODO: Fetch from Google Sheets API
  const existingIssues = JSON.parse(localStorage.getItem('maintenance_issues') || '[]');
  return existingIssues;
};

export const updateIssueStatus = async (issueId: string, status: 'In Process' | 'Complete'): Promise<void> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // TODO: Update Google Sheets via API
  const existingIssues = JSON.parse(localStorage.getItem('maintenance_issues') || '[]');
  const updatedIssues = existingIssues.map((issue: Issue) => 
    issue.id === issueId ? { ...issue, status } : issue
  );
  localStorage.setItem('maintenance_issues', JSON.stringify(updatedIssues));
};
