import { Issue } from '../types/Issue';

// Google Sheets API configuration
const GOOGLE_SHEETS_API_KEY = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = process.env.REACT_APP_GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Sheet1';

// Google Sheets API endpoints
const GOOGLE_SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';





// Google Sheets API service
export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private cache: Issue[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }


  // Fetch all issues from Google Sheets
  async fetchAllIssues(): Promise<Issue[]> {
    try {
      // Check cache first
      if (this.cache.length > 0 && Date.now() - this.lastFetch < this.CACHE_DURATION) {
        return this.cache;
      }

      if (!SPREADSHEET_ID || !GOOGLE_SHEETS_API_KEY) {
        console.error('Google Sheets configuration missing. Please check environment variables.');
        console.error('SPREADSHEET_ID:', SPREADSHEET_ID);
        console.error('GOOGLE_SHEETS_API_KEY:', GOOGLE_SHEETS_API_KEY ? 'Present' : 'Missing');
        throw new Error('Google Sheets configuration missing');
      }

      const response = await fetch(
        `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${GOOGLE_SHEETS_API_KEY}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Sheets API error:', response.status, errorText);
        throw new Error(`Google Sheets API error: ${response.status}`);
      }

      const data = await response.json();
      const rows = data.values || [];

      // Convert rows to issues (skip header row)
      const issues: Issue[] = rows.slice(1).map((row: any[]) => ({
        id: row[0] || Date.now().toString(),
        timestamp: row[8] || new Date().toISOString(), // Date and Time column
        name: row[5] || '', // Tenant Name column
        address: row[3] || '', // Property Address column
        unit: row[4] || '', // Unit Number column
        category: (row[0] as 'Plumbing' | 'Electrical' | 'Appliances' | 'Structural' | 'General') || 'General', // Issue Category column
        issueType: row[1] || '', // Issue Type column
        description: row[2] || '', // Issue Description column
        urgency: (row[6] as 'High' | 'Medium' | 'Low') || 'Medium', // Urgency column
        status: (row[7] as 'New' | 'In Process' | 'Complete') || 'New', // Status column
        userEmail: row[9] || '' // User Email column
      }));

      // Update cache
      this.cache = issues;
      this.lastFetch = Date.now();

      return issues;
    } catch (error) {
      console.error('Error fetching from Google Sheets:', error);
      // Fallback to localStorage if Google Sheets fails
      return this.getFromLocalStorage();
    }
  }

  // Submit new issue to Google Sheets
  async submitIssue(issueData: Omit<Issue, 'id' | 'timestamp' | 'status'>): Promise<Issue> {
    try {
      const newIssue: Issue = {
        ...issueData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: 'New'
      };

      if (SPREADSHEET_ID && GOOGLE_SHEETS_API_KEY) {
        // Try to add to Google Sheets
        const rowData = [
          newIssue.category, // Issue Category
          newIssue.issueType, // Issue Type
          newIssue.description, // Issue Description
          newIssue.address, // Property Address
          newIssue.unit, // Unit Number
          newIssue.name, // Tenant Name
          newIssue.urgency, // Urgency
          newIssue.status, // Status
          newIssue.timestamp, // Date and Time
          newIssue.userEmail // User Email
        ];

        const response = await fetch(
          `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&key=${GOOGLE_SHEETS_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [rowData]
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Google Sheets append error:', response.status, errorText);
          throw new Error(`Failed to add to Google Sheets: ${response.status}`);
        }

        console.log('Successfully added issue to Google Sheets');
        // Update cache
        this.cache.push(newIssue);
        this.lastFetch = Date.now();
      }

      // Also store in localStorage as backup
      this.storeInLocalStorage(newIssue);

      // Trigger update event
      window.dispatchEvent(new CustomEvent('issueUpdated', { 
        detail: { action: 'created', issue: newIssue } 
      }));

      return newIssue;
    } catch (error) {
      console.error('Error submitting issue:', error);
      // Fallback to localStorage only
      const newIssue: Issue = {
        ...issueData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: 'New'
      };
      
      this.storeInLocalStorage(newIssue);
      return newIssue;
    }
  }

  // Update issue status in Google Sheets
  async updateIssueStatus(issueId: string, status: 'In Process' | 'Complete'): Promise<void> {
    try {
      if (SPREADSHEET_ID && GOOGLE_SHEETS_API_KEY) {
        // Find the row number for this issue
        const issues = await this.fetchAllIssues();
        const issueIndex = issues.findIndex(issue => issue.id === issueId);
        
        if (issueIndex === -1) {
          throw new Error('Issue not found');
        }

        // Update in Google Sheets (row + 2 because of 0-indexing and header row)
        const rowNumber = issueIndex + 2;
        
        const response = await fetch(
          `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!H${rowNumber}?valueInputOption=RAW&key=${GOOGLE_SHEETS_API_KEY}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [[status]]
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Google Sheets update error:', response.status, errorText);
          throw new Error(`Failed to update Google Sheets: ${response.status}`);
        }

        console.log('Successfully updated issue status in Google Sheets');
        // Update cache
        const issue = this.cache.find(i => i.id === issueId);
        if (issue) {
          issue.status = status;
        }
      }

      // Also update localStorage as backup
      this.updateInLocalStorage(issueId, status);

      // Trigger update event
      window.dispatchEvent(new CustomEvent('issueUpdated', { 
        detail: { action: 'updated', issueId, status } 
      }));
    } catch (error) {
      console.error('Error updating issue status:', error);
      // Fallback to localStorage only
      this.updateInLocalStorage(issueId, status);
    }
  }

  // Get user-specific issues
  async getUserIssues(userEmail: string): Promise<Issue[]> {
    const allIssues = await this.fetchAllIssues();
    return allIssues.filter(issue => issue.userEmail === userEmail);
  }

  // Local storage fallback methods
  private getFromLocalStorage(): Issue[] {
    try {
      const stored = localStorage.getItem('maintenance_issues');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  private storeInLocalStorage(issue: Issue): void {
    try {
      const existing = this.getFromLocalStorage();
      existing.push(issue);
      localStorage.setItem('maintenance_issues', JSON.stringify(existing));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  private updateInLocalStorage(issueId: string, status: string): void {
    try {
      const existing = this.getFromLocalStorage();
      const updated = existing.map(issue => 
        issue.id === issueId ? { ...issue, status } : issue
      );
      localStorage.setItem('maintenance_issues', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cache = [];
    this.lastFetch = 0;
  }
}

// Export singleton instance
export const googleSheetsService = GoogleSheetsService.getInstance();
