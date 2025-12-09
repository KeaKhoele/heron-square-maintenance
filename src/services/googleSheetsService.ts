import { Issue } from '../types/Issue';
import { Tenant } from '../types/Property';
import { handleError, retryWithBackoff } from '../utils/errorHandling';

// Google Sheets API configuration - Updated with new service account credentials
const SPREADSHEET_ID = process.env.REACT_APP_GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = 'Sheet1';
const TENANTS_SHEET_NAME = 'Tenants';

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
  private readonly CACHE_DURATION = 120000; // 2 minutes (increased from 30 seconds)
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private isRateLimited: boolean = false;
  private rateLimitUntil: number = 0;

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

  // Check if we're currently rate limited
  private isCurrentlyRateLimited(): boolean {
    if (this.isRateLimited && Date.now() < this.rateLimitUntil) {
      return true;
    }
    // Reset rate limit flag if time has passed
    if (this.isRateLimited && Date.now() >= this.rateLimitUntil) {
      this.isRateLimited = false;
      this.rateLimitUntil = 0;
    }
    return false;
  }

  // Set rate limit flag with backoff time
  private setRateLimit(backoffSeconds: number = 60): void {
    this.isRateLimited = true;
    this.rateLimitUntil = Date.now() + (backoffSeconds * 1000);
    console.log(`Rate limited until: ${new Date(this.rateLimitUntil).toLocaleTimeString()}`);
  }

  // Fetch all issues from Google Sheets
  async fetchAllIssues(): Promise<Issue[]> {
    try {
      // Check if we're rate limited
      if (this.isCurrentlyRateLimited()) {
        console.log('Currently rate limited, using cached data');
        const localIssues = this.getFromLocalStorage();
        if (localIssues.length > 0) {
          console.log(`Using ${localIssues.length} issues from localStorage due to rate limit`);
          // Only update cache if it's empty or significantly different
          if (this.cache.length === 0 || Math.abs(this.cache.length - localIssues.length) > 1) {
            this.cache = localIssues;
            this.lastFetch = Date.now();
          }
        }
        return localIssues;
      }

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
        // Handle rate limiting specifically
        if (response.status === 429) {
          this.setRateLimit(60); // 1 minute backoff
          const localIssues = this.getFromLocalStorage();
          console.log(`Rate limited (429), using ${localIssues.length} issues from localStorage`);
          return localIssues;
        }
        
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
            row[6] && // Tenant Name
            row[4] && // Property Address
            row[5] && // Unit Number
            row[6] !== 'Tenant Name' && // Not a header row
            row[4] !== 'Property Address' && // Not a header row
            row[5] !== 'Unit Number'; // Not a header row
          return hasValidData;
        })
        .map((row: any[]) => {
          // Check if this is the new format (with Issue ID in column A) or old format
          const hasIssueIdColumn = row[0] && !row[1]?.includes('Category') && row.length > 10;
          
          if (hasIssueIdColumn) {
            // New format: Issue ID in column A, Image URL in column L (index 11)
            return {
              id: row[0] || this.generateUniqueId(), // Issue ID column
              timestamp: this.convertCustomFormatToISO(row[9] || this.getCapeTownTimestampForSheets()), // Date and Time column
              name: row[6] || '', // Tenant Name column
              address: row[4] || '', // Property Address column
              unit: row[5] || '', // Unit Number column
              category: (row[1] as 'Plumbing' | 'Electrical' | 'Appliances' | 'Structural' | 'General') || 'General', // Issue Category column
              issueType: row[2] || '', // Issue Type column
              description: row[3] || '', // Issue Description column
              urgency: (row[7] as 'High' | 'Medium' | 'Low') || 'Medium', // Urgency column
              status: (row[8] as 'New' | 'In Process' | 'Complete') || 'New', // Status column
              userEmail: row[10] || '', // User Email column
              imageUrl: row[11] || undefined // Image URL column (optional)
            };
          } else {
            // Old format: No Issue ID column, generate one
            return {
              id: this.generateUniqueId(), // Generate unique ID
              timestamp: this.convertCustomFormatToISO(row[8] || this.getCapeTownTimestampForSheets()), // Date and Time column
              name: row[5] || '', // Tenant Name column
              address: row[3] || '', // Property Address column
              unit: row[4] || '', // Unit Number column
              category: (row[0] as 'Plumbing' | 'Electrical' | 'Appliances' | 'Structural' | 'General') || 'General', // Issue Category column
              issueType: row[1] || '', // Issue Type column
              description: row[2] || '', // Issue Description column
              urgency: (row[6] as 'High' | 'Medium' | 'Low') || 'Medium', // Urgency column
              status: (row[7] as 'New' | 'In Process' | 'Complete') || 'New', // Status column
              userEmail: row[9] || '', // User Email column
              imageUrl: row[10] || undefined // Image URL column (optional, for old format)
            };
          }
        });

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

  // Helper function to generate unique IDs
  private generateUniqueId(): string {
    return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Helper function to get Cape Town timezone timestamp for Google Sheets
  private getCapeTownTimestampForSheets(): string {
    // Create a date object for Cape Town timezone (UTC+2)
    const now = new Date();
    const capeTownTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Johannesburg"}));
    
    // Format: "2025 - 09 - 08: 20:40"
    const year = capeTownTime.getFullYear();
    const month = String(capeTownTime.getMonth() + 1).padStart(2, '0');
    const date = String(capeTownTime.getDate()).padStart(2, '0');
    const hours = String(capeTownTime.getHours()).padStart(2, '0');
    const minutes = String(capeTownTime.getMinutes()).padStart(2, '0');
    
    return `${year} - ${month} - ${date}: ${hours}:${minutes}`;
  }

  // Helper function to get Cape Town timezone timestamp for app (ISO format)
  private getCapeTownTimestamp(): string {
    const now = new Date();
    // Cape Town is UTC+2, so add 2 hours to UTC time
    const capeTownTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    return capeTownTime.toISOString().replace('Z', '+02:00');
  }

  // Helper function to convert custom format back to ISO for parsing
  private convertCustomFormatToISO(customTimestamp: string): string {
    try {
      // Parse format: "2025 - 09 - 08: 20:40"
      const match = customTimestamp.match(/(\d{4}) - (\d{2}) - (\d{2}): (\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, date, hours, minutes] = match;
        // Create ISO string with Cape Town timezone
        const isoString = `${year}-${month}-${date}T${hours}:${minutes}:00+02:00`;
        return isoString;
      }
    } catch (error) {
      console.error('Error converting custom timestamp:', error);
    }
    // Fallback to current time if parsing fails
    return this.getCapeTownTimestamp();
  }
  async submitIssue(issueData: Omit<Issue, 'id' | 'timestamp' | 'status'>): Promise<Issue> {
    try {
      const newIssue: Issue = {
        ...issueData,
        id: this.generateUniqueId(),
        timestamp: this.getCapeTownTimestamp(),
        status: 'New'
      };

      // Store in localStorage first
      this.storeInLocalStorage(newIssue);

      // Try to add to Google Sheets using service account
      if (SPREADSHEET_ID && SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY) {
        try {
          console.log('Attempting to submit to Google Sheets...');
          
          // Check if we're rate limited
          if (this.isCurrentlyRateLimited()) {
            console.log('Rate limited, will retry submission later');
            // Store in localStorage and return - the issue is still saved
            return newIssue;
          }
          
          const accessToken = await this.getAccessToken();
          console.log('Access token obtained:', accessToken ? 'Yes' : 'No');
          
          const timestampForSheets = this.getCapeTownTimestampForSheets();
          console.log('Timestamp for sheets:', timestampForSheets);
          
          const rowData = [
            newIssue.id, // Issue ID (first column)
            newIssue.category, // Issue Category
            newIssue.issueType, // Issue Type
            newIssue.description, // Issue Description
            newIssue.address, // Property Address
            newIssue.unit, // Unit Number
            newIssue.name, // Tenant Name
            newIssue.urgency, // Urgency
            newIssue.status, // Status
            timestampForSheets, // Date and Time (custom format for Google Sheets)
            newIssue.userEmail, // User Email
            newIssue.imageUrl || '' // Image URL (column L, index 11)
          ];

          console.log('Row data to submit:', rowData);

          // First, get the current data to find the last row with issues
          const getResponse = await fetch(
            `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:A?valueRenderOption=UNFORMATTED_VALUE`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          let insertRow = 3; // Default to row 3 (after "Heron Square Maintenance Report" and headers)
          
          if (getResponse.ok) {
            const getData = await getResponse.json();
            const values = getData.values || [];
            
            // Find the last row with actual data (not empty, not pivot table)
            for (let i = values.length - 1; i >= 0; i--) {
              if (values[i] && values[i][0] && values[i][0].toString().trim() !== '') {
                // Check if this looks like an issue ID (starts with numbers)
                const cellValue = values[i][0].toString();
                if (/^\d+/.test(cellValue)) {
                  insertRow = i + 2; // Insert after this row
                  break;
                }
              }
            }
          }

          console.log('Inserting new issue at row:', insertRow);

          // Insert the new row at the correct position (now includes image URL column L)
          const response = await fetch(
            `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A${insertRow}:L${insertRow}?valueInputOption=RAW`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                values: [rowData]
              })
            }
          );

          console.log('Google Sheets response status:', response.status);

          if (response.ok) {
            const responseData = await response.json();
            console.log('Successfully added issue to Google Sheets:', responseData);
            // Update cache
            this.cache.push(newIssue);
            this.lastFetch = Date.now();
          } else {
            // Handle rate limiting
            if (response.status === 429) {
              this.setRateLimit(60);
              console.log('Rate limited during submission, issue saved locally');
            } else {
              const errorText = await response.text();
              console.error('Google Sheets append error:', response.status, errorText);
              // Try to parse error details
              try {
                const errorData = JSON.parse(errorText);
                console.error('Parsed error details:', errorData);
              } catch (parseError) {
                console.error('Could not parse error response');
              }
            }
          }
        } catch (error: any) {
          console.error('Google Sheets service account error:', error);
          console.error('Error details:', {
            message: error?.message || 'Unknown error',
            stack: error?.stack || 'No stack trace',
            name: error?.name || 'Unknown error type'
          });
        }
      } else {
        console.warn('Google Sheets credentials not configured:', {
          SPREADSHEET_ID: !!SPREADSHEET_ID,
          SERVICE_ACCOUNT_EMAIL: !!SERVICE_ACCOUNT_EMAIL,
          SERVICE_ACCOUNT_PRIVATE_KEY: !!SERVICE_ACCOUNT_PRIVATE_KEY
        });
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
        // Get raw data from Google Sheets to find the correct row
        const accessToken = await this.getAccessToken();
        
        const response = await fetch(
          `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:J`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Google Sheets API error: ${response.status}`);
        }

        const data = await response.json();
        const rows = data.values || [];

        // Find the row that contains this issue ID
        let rowNumber = -1;
        let statusColumn = 'H'; // Default to old format (column H)
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[0] === issueId) {
            rowNumber = i + 1; // +1 because Google Sheets is 1-indexed
            statusColumn = 'I'; // New format uses column I
            break;
          }
        }

        // If not found by ID, try to find by other means (for old format issues)
        if (rowNumber === -1) {
          // This is a fallback for issues that don't have IDs yet
          // We'll need to find them by other unique identifiers
          console.log('Issue not found by ID, this might be an old format issue');
          throw new Error('Issue not found in spreadsheet - may need to add Issue ID column');
        }
        
        // Update the status in the correct column
        const updateResponse = await fetch(
          `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!${statusColumn}${rowNumber}?valueInputOption=RAW`,
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

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Google Sheets update error:', updateResponse.status, errorText);
          throw new Error(`Failed to update Google Sheets: ${updateResponse.status}`);
        }

        console.log(`Successfully updated issue ${issueId} status to ${status} in row ${rowNumber}`);
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

  // Clear localStorage cache (for when spreadsheet is manually cleared)
  clearLocalStorageCache(): void {
    localStorage.removeItem('maintenanceIssues');
    console.log('Cleared localStorage cache');
  }

  // Clear all caches (both memory and localStorage)
  clearAllCaches(): void {
    this.clearCache();
    this.clearLocalStorageCache();
    // Also clear rate limit to allow fresh API calls
    this.isRateLimited = false;
    this.rateLimitUntil = 0;
    console.log('Cleared all caches and rate limit');
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

  // ========== TENANT MANAGEMENT METHODS ==========

  /**
   * Fetch all tenants from Google Sheets
   * Returns empty array if sheet doesn't exist or on error
   */
  async fetchTenants(): Promise<Tenant[]> {
    if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.warn('Google Sheets not configured, returning empty tenants array');
      return [];
    }

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.warn('Could not get access token for fetching tenants');
        return [];
      }

      // Fetch tenant data from Tenants sheet
      // Columns: ID, Email, Name, Property ID, Unit, Move In Date, Move Out Date, Status, Created At, Created By
      const response = await fetch(
        `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(TENANTS_SHEET_NAME)}?valueRenderOption=UNFORMATTED_VALUE`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // If sheet doesn't exist (404), return empty array
        if (response.status === 404) {
          console.log('Tenants sheet does not exist yet, returning empty array');
          return [];
        }
        throw new Error(`Failed to fetch tenants: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values || [];

      // Skip header row (row 1) if it exists
      const tenantRows = rows.length > 1 ? rows.slice(1) : rows;

      const tenants: Tenant[] = tenantRows
        .filter((row: any[]) => row && row.length > 0 && row[0]) // Filter out empty rows
        .map((row: any[]) => {
          return {
            id: row[0] || `tenant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            email: (row[1] || '').toLowerCase(),
            name: row[2] || '',
            propertyId: row[3] || '',
            unit: row[4] || '',
            moveInDate: row[5] || new Date().toISOString(),
            moveOutDate: row[6] || undefined,
            status: (row[7] === 'active' || row[7] === 'inactive') ? row[7] : 'active',
            createdAt: row[8] || new Date().toISOString(),
            createdBy: row[9] || 'system',
          };
        });

      return tenants;
    } catch (error: any) {
      console.error('Error fetching tenants from Google Sheets:', error);
      // Return empty array on error (fallback to localStorage)
      return [];
    }
  }

  /**
   * Add a tenant to Google Sheets
   */
  async addTenantToSheets(tenant: Tenant): Promise<void> {
    if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.warn('Google Sheets not configured, skipping tenant sync');
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Could not get access token');
      }

      // Check if Tenants sheet exists, create it if not
      await this.ensureTenantsSheetExists(accessToken);

      // Prepare row data: ID, Email, Name, Property ID, Unit, Move In Date, Move Out Date, Status, Created At, Created By
      const rowData = [
        tenant.id,
        tenant.email.toLowerCase(),
        tenant.name,
        tenant.propertyId || '',
        tenant.unit || '',
        tenant.moveInDate,
        tenant.moveOutDate || '',
        tenant.status,
        tenant.createdAt,
        tenant.createdBy,
      ];

      // Append to Tenants sheet
      const appendUrl = `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(TENANTS_SHEET_NAME)}!A:J?valueInputOption=RAW`;
      
      const response = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to add tenant to Google Sheets: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      console.log('Tenant added to Google Sheets successfully');
    } catch (error: any) {
      console.error('Error adding tenant to Google Sheets:', error);
      // Don't throw - allow tenant to be added locally even if Google Sheets fails
    }
  }

  /**
   * Update tenant status in Google Sheets (for remove/activate operations)
   */
  async updateTenantStatusInSheets(tenantId: string, status: 'active' | 'inactive'): Promise<void> {
    if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.warn('Google Sheets not configured, skipping tenant status update');
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Could not get access token');
      }

      // Fetch all tenants to find the row number
      const tenants = await this.fetchTenants();
      const tenantIndex = tenants.findIndex(t => t.id === tenantId);
      
      if (tenantIndex === -1) {
        console.warn(`Tenant ${tenantId} not found in Google Sheets`);
        return;
      }

      // Row number is index + 2 (1 for header, 1 for 0-based index)
      const rowNumber = tenantIndex + 2;
      const statusColumn = 'H'; // Status is column H (8th column)

      const updateUrl = `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(TENANTS_SHEET_NAME)}!${statusColumn}${rowNumber}?valueInputOption=RAW`;
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[status]],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update tenant status in Google Sheets: ${response.status} ${response.statusText}`);
      }

      console.log(`Tenant ${tenantId} status updated to ${status} in Google Sheets`);
    } catch (error: any) {
      console.error('Error updating tenant status in Google Sheets:', error);
      // Don't throw - allow status update locally even if Google Sheets fails
    }
  }

  /**
   * Ensure the Tenants sheet exists, create it if it doesn't
   */
  private async ensureTenantsSheetExists(accessToken: string): Promise<void> {
    try {
      // Try to fetch the sheet to see if it exists
      const checkUrl = `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(TENANTS_SHEET_NAME)}?valueRenderOption=UNFORMATTED_VALUE`;
      const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // If sheet exists, return
      if (checkResponse.ok) {
        // Check if header row exists
        const data = await checkResponse.json();
        const rows = data.values || [];
        
        // If no rows or header doesn't match, add header
        if (rows.length === 0 || rows[0]?.[0] !== 'ID') {
          await this.addTenantsSheetHeader(accessToken);
        }
        return;
      }

      // If sheet doesn't exist (404), create it
      if (checkResponse.status === 404) {
        await this.createTenantsSheet(accessToken);
      }
    } catch (error: any) {
      // If error is not 404, try to create the sheet anyway
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        await this.createTenantsSheet(accessToken);
      } else {
        console.error('Error checking Tenants sheet:', error);
      }
    }
  }

  /**
   * Create the Tenants sheet with header row
   */
  private async createTenantsSheet(accessToken: string): Promise<void> {
    try {
      // Add new sheet
      const addSheetUrl = `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}:batchUpdate`;
      
      const addSheetResponse = await fetch(addSheetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: TENANTS_SHEET_NAME,
                },
              },
            },
          ],
        }),
      });

      if (!addSheetResponse.ok) {
        throw new Error(`Failed to create Tenants sheet: ${addSheetResponse.status}`);
      }

      // Add header row
      await this.addTenantsSheetHeader(accessToken);
    } catch (error: any) {
      console.error('Error creating Tenants sheet:', error);
      throw error;
    }
  }

  /**
   * Add header row to Tenants sheet
   */
  private async addTenantsSheetHeader(accessToken: string): Promise<void> {
    const headerUrl = `${GOOGLE_SHEETS_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(TENANTS_SHEET_NAME)}!A1:J1?valueInputOption=RAW`;
    
    const headerRow = [
      'ID',
      'Email',
      'Name',
      'Property ID',
      'Unit',
      'Move In Date',
      'Move Out Date',
      'Status',
      'Created At',
      'Created By',
    ];

    const response = await fetch(headerUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headerRow],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add header to Tenants sheet: ${response.status}`);
    }
  }
}

// Export singleton instance
export const googleSheetsService = GoogleSheetsService.getInstance();

// Export utility functions for cache management
export const clearAllCaches = () => {
  googleSheetsService.clearAllCaches();
};

export const clearLocalStorageCache = () => {
  googleSheetsService.clearLocalStorageCache();
};
