import { Issue } from '../types/Issue';
import { handleError, retryWithBackoff } from '../utils/errorHandling';

// Google Sheets API configuration - Updated with new service account credentials
const SPREADSHEET_ID = process.env.REACT_APP_GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Sheet1';

// Service Account credentials
const SERVICE_ACCOUNT_EMAIL = process.env.REACT_APP_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.REACT_APP_SERVICE_ACCOUNT_PRIVATE_KEY;

// Google Sheets API endpoints
const GOOGLE_SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// Google Sheets API service
export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private cache: Issue[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  // Generate JWT token for service account authentication
  private async generateJWT(): Promise<string> {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // 1 hour
      iat: now
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    // Import the private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      this.pemToArrayBuffer(SERVICE_ACCOUNT_PRIVATE_KEY!),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(Array.from(new Uint8Array(signature)).map(byte => String.fromCharCode(byte)).join(''))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${signatureInput}.${encodedSignature}`;
  }

  // Convert PEM private key to ArrayBuffer
  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const base64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\n/g, '');
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Get access token using service account
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error('Service account credentials not configured');
    }

    try {
      const jwt = await this.generateJWT();
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      if (!this.accessToken) {
        throw new Error('No access token received from Google');
      }
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // Fetch issues for a specific user from Google Sheets
  async getUserIssues(userEmail: string): Promise<Issue[]> {
    try {
      const allIssues = await this.fetchAllIssues();
      return allIssues.filter(issue => issue.userEmail === userEmail);
    } catch (error) {
      console.error('Error fetching user issues from Google Sheets:', error);
      // Fallback to localStorage
      const storedIssues = this.getFromLocalStorage();
      return storedIssues.filter(issue => issue.userEmail === userEmail);
    }
  }

  // Fetch all issues from Google Sheets
  async fetchAllIssues(): Promise<Issue[]> {
    try {
      // Check cache first
      if (this.cache.length > 0 && Date.now() - this.lastFetch < this.CACHE_DURATION) {
        return this.cache;
      }

      if (!SPREADSHEET_ID) {
        throw handleError(new Error('Google Sheets Spreadsheet ID not configured'), 'fetchAllIssues');
      }

      // Use retry logic for network requests
      const accessToken = await retryWithBackoff(() => this.getAccessToken(), 3, 1000);
      
      const response = await retryWithBackoff(
        () => fetch(
          `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        ),
        3,
        1000
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw handleError(
          new Error(`Google Sheets API error: ${response.status} - ${errorText}`),
          'fetchAllIssues'
        );
      }

      const data = await response.json();
      const rows = data.values || [];

      // Convert rows to issues (skip header row and filter out empty/invalid rows)
      const issues: Issue[] = rows.slice(1)
        .filter((row: any[]) => {
          // Filter out rows that look like headers or are empty
          const hasValidData = row && row.length > 0 && 
            row[5] && // Tenant Name
            row[3] && // Property Address
            row[4] && // Unit Number
            row[5] !== 'Tenant Name' && // Not a header row
            row[3] !== 'Property Address' && // Not a header row
            row[4] !== 'Unit Number'; // Not a header row
          return hasValidData;
        })
        .map((row: any[]) => ({
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
      const localIssues = this.getFromLocalStorage();
      if (localIssues.length > 0) {
        console.log(`Using ${localIssues.length} issues from localStorage as fallback`);
      }
      return localIssues;
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

      // Store in localStorage first
      this.storeInLocalStorage(newIssue);

      // Try to add to Google Sheets using service account
      if (SPREADSHEET_ID && SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY) {
        try {
          const accessToken = await this.getAccessToken();
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
            `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                values: [rowData]
              })
            }
          );

          if (response.ok) {
            console.log('Successfully added issue to Google Sheets');
            // Update cache
            this.cache.push(newIssue);
            this.lastFetch = Date.now();
          } else {
            const errorText = await response.text();
            console.error('Google Sheets append error:', response.status, errorText);
          }
        } catch (error) {
          console.error('Google Sheets service account error:', error);
        }
      }

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
  async updateIssueStatus(issueId: string, status: 'New' | 'In Process' | 'Complete'): Promise<void> {
    try {
      if (SPREADSHEET_ID && SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY) {
        // Find the row number for this issue
        const issues = await this.fetchAllIssues();
        const issueIndex = issues.findIndex(issue => issue.id === issueId);
        
        if (issueIndex === -1) {
          throw new Error('Issue not found');
        }

        // Update in Google Sheets (row + 2 because of 0-indexing and header row)
        const rowNumber = issueIndex + 2;
        const accessToken = await this.getAccessToken();
        
        const response = await fetch(
          `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!H${rowNumber}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
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

      // Also update localStorage
      const storedIssues = this.getFromLocalStorage();
      const issueIndex = storedIssues.findIndex(issue => issue.id === issueId);
      if (issueIndex !== -1) {
        storedIssues[issueIndex].status = status;
        localStorage.setItem('maintenanceIssues', JSON.stringify(storedIssues));
      }
    } catch (error) {
      console.error('Error updating issue status:', error);
      throw error;
    }
  }

  // Clear cache to force refresh
  clearCache(): void {
    this.cache = [];
    this.lastFetch = 0;
  }

  // Local storage methods (fallback)
  private storeInLocalStorage(issue: Issue): void {
    const storedIssues = this.getFromLocalStorage();
    storedIssues.push(issue);
    localStorage.setItem('maintenanceIssues', JSON.stringify(storedIssues));
  }

  private getFromLocalStorage(): Issue[] {
    try {
      const stored = localStorage.getItem('maintenanceIssues');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }
}

// Export singleton instance
export const googleSheetsService = GoogleSheetsService.getInstance();
