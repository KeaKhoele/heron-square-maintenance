import { Issue } from '../types/Issue';

// Google Sheets API configuration
const GOOGLE_SHEETS_API_KEY = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = process.env.REACT_APP_GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Maintenance Issues';

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

  // Initialize the service and create headers if needed
  private async initializeHeaders(): Promise<Headers> {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    
    if (GOOGLE_SHEETS_API_KEY) {
      headers.append('Authorization', `Bearer ${GOOGLE_SHEETS_API_KEY}`);
    }
    
    return headers;
  }

  // Fetch all issues from Google Sheets
  async fetchAllIssues(): Promise<Issue[]> {
    try {
      // Check cache first
      if (this.cache.length > 0 && Date.now() - this.lastFetch < this.CACHE_DURATION) {
        return this.cache;
      }

      if (!SPREADSHEET_ID) {
        throw new Error('Google Sheets Spreadsheet ID not configured');
      }

      const headers = await this.initializeHeaders();
      const response = await fetch(
        `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_SHEETS_API_KEY}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status}`);
      }

      const data = await response.json();
      const rows = data.values || [];

      // Convert rows to issues (skip header row)
      const issues: Issue[] = rows.slice(1).map((row: any[]) => ({
        id: row[0] || '',
        timestamp: row[1] || new Date().toISOString(),
        name: row[2] || '',
        address: row[3] || '',
        unit: row[4] || '',
        category: (row[5] as 'Plumbing' | 'Electrical' | 'Appliances' | 'Structural' | 'General') || 'General',
        issueType: row[6] || '',
        description: row[7] || '',
        urgency: (row[8] as 'High' | 'Medium' | 'Low') || 'Medium',
        status: (row[9] as 'New' | 'In Process' | 'Complete') || 'New',
        userEmail: row[10] || ''
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

      if (SPREADSHEET_ID) {
        // Try to add to Google Sheets
        const headers = await this.initializeHeaders();
        const rowData = [
          newIssue.id,
          newIssue.timestamp,
          newIssue.name,
          newIssue.address,
          newIssue.unit,
          newIssue.category,
          newIssue.issueType,
          newIssue.description,
          newIssue.urgency,
          newIssue.status,
          newIssue.userEmail
        ];

        const response = await fetch(
          `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&key=${GOOGLE_SHEETS_API_KEY}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              values: [rowData]
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to add to Google Sheets: ${response.status}`);
        }

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
      if (SPREADSHEET_ID) {
        // Find the row number for this issue
        const issues = await this.fetchAllIssues();
        const issueIndex = issues.findIndex(issue => issue.id === issueId);
        
        if (issueIndex === -1) {
          throw new Error('Issue not found');
        }

        // Update in Google Sheets (row + 2 because of 0-indexing and header row)
        const rowNumber = issueIndex + 2;
        const headers = await this.initializeHeaders();
        
        const response = await fetch(
          `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${SHEET_NAME}!K${rowNumber}?valueInputOption=RAW&key=${GOOGLE_SHEETS_API_KEY}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              values: [[status]]
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to update Google Sheets: ${response.status}`);
        }

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
