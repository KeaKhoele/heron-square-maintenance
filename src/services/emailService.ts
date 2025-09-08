import { Issue } from '../types/Issue';

// Email notification service using Resend API
export class EmailService {
  private static instance: EmailService;
  private readonly RESEND_API_KEY = process.env.REACT_APP_RESEND_API_KEY;
  private readonly FROM_EMAIL = 'enquiries@heronsquare.co.za';

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Send notification to maintenance crew when new issue is submitted
  async sendMaintenanceNotification(issue: Issue): Promise<void> {
    try {
      // Check if email service is configured
      if (!this.RESEND_API_KEY) {
        console.warn('Email service not configured (RESEND_API_KEY missing), skipping notification');
        return;
      }

      // Get admin emails from Google Sheets (you'll need to implement this)
      const adminEmails = await this.getAdminEmails();
      
      if (adminEmails.length === 0) {
        console.warn('No admin emails found, skipping notification');
        return;
      }

      const emailData = {
        to: adminEmails,
        subject: 'New Maintenance Request Submitted',
        html: this.generateMaintenanceEmailHTML(issue)
      };

      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emailData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Email service error: ${response.status} ${errorData.error || response.statusText}`);
      }

      console.log('Maintenance notification sent successfully');
    } catch (error) {
      console.error('Error sending maintenance notification:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  // Send notification to admins (kea.khoele@gmail.com and enquiries@heronsquare.co.za)
  async sendAdminNotification(issue: Issue): Promise<void> {
    try {
      // Check if email service is configured
      if (!this.RESEND_API_KEY) {
        console.warn('Email service not configured (RESEND_API_KEY missing), skipping admin notification');
        return;
      }

      const adminEmails = ['kea.khoele@gmail.com', 'enquiries@heronsquare.co.za'];

      const emailData = {
        to: adminEmails,
        subject: 'New Maintenance Request - Admin Notification',
        html: this.generateAdminEmailHTML(issue)
      };

      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emailData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Email service error: ${response.status} ${errorData.error || response.statusText}`);
      }

      console.log('Admin notification sent successfully');
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }

  // Generate HTML for maintenance crew email
  private generateMaintenanceEmailHTML(issue: Issue): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Maintenance Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .issue-details { background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin-bottom: 20px; }
          .detail-row { margin-bottom: 10px; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
          .urgency-high { color: #dc3545; font-weight: bold; }
          .urgency-medium { color: #ffc107; font-weight: bold; }
          .urgency-low { color: #28a745; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Maintenance Request Submitted</h2>
            <p>Good day,</p>
            <p>Below is the issue description of a new maintenance request.</p>
          </div>
          
          <div class="issue-details">
            <div class="detail-row">
              <span class="label">Tenant Name:</span>
              <span class="value">${issue.name}</span>
            </div>
            <div class="detail-row">
              <span class="label">Contact Email:</span>
              <span class="value">${issue.userEmail}</span>
            </div>
            <div class="detail-row">
              <span class="label">Unit & Address:</span>
              <span class="value">${issue.unit} ${issue.address}</span>
            </div>
            <div class="detail-row">
              <span class="label">Issue Category:</span>
              <span class="value">${issue.category}</span>
            </div>
            <div class="detail-row">
              <span class="label">Issue Type:</span>
              <span class="value">${issue.issueType}</span>
            </div>
            <div class="detail-row">
              <span class="label">Issue Description:</span>
              <span class="value">${issue.description || 'No additional description provided'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Priority/Urgency:</span>
              <span class="value urgency-${issue.urgency.toLowerCase()}">${issue.urgency}</span>
            </div>
            <div class="detail-row">
              <span class="label">Submitted:</span>
              <span class="value">${new Date(issue.timestamp).toLocaleString()}</span>
            </div>
          </div>
          
          <p>Please find the Heron Square maintenance issues spreadsheet attached below.</p>
          
          <div class="footer">
            <p>Kind Regards,<br>Heron Square</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate HTML for admin email
  private generateAdminEmailHTML(issue: Issue): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Maintenance Request - Admin Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .issue-details { background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin-bottom: 20px; }
          .detail-row { margin-bottom: 10px; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
          .urgency-high { color: #dc3545; font-weight: bold; }
          .urgency-medium { color: #ffc107; font-weight: bold; }
          .urgency-low { color: #28a745; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Maintenance Request - Admin Notification</h2>
            <p>A new maintenance request has been submitted and the maintenance crew has been notified.</p>
          </div>
          
          <div class="issue-details">
            <div class="detail-row">
              <span class="label">Tenant Name:</span>
              <span class="value">${issue.name}</span>
            </div>
            <div class="detail-row">
              <span class="label">Contact Email:</span>
              <span class="value">${issue.userEmail}</span>
            </div>
            <div class="detail-row">
              <span class="label">Unit & Address:</span>
              <span class="value">${issue.unit} ${issue.address}</span>
            </div>
            <div class="detail-row">
              <span class="label">Issue Category:</span>
              <span class="value">${issue.category}</span>
            </div>
            <div class="detail-row">
              <span class="label">Issue Type:</span>
              <span class="value">${issue.issueType}</span>
            </div>
            <div class="detail-row">
              <span class="label">Issue Description:</span>
              <span class="value">${issue.description || 'No additional description provided'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Priority/Urgency:</span>
              <span class="value urgency-${issue.urgency.toLowerCase()}">${issue.urgency}</span>
            </div>
            <div class="detail-row">
              <span class="label">Submitted:</span>
              <span class="value">${new Date(issue.timestamp).toLocaleString()}</span>
            </div>
          </div>
          
          <p>Please find the Heron Square maintenance issues spreadsheet attached below.</p>
          
          <div class="footer">
            <p>Kind Regards,<br>Heron Square</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Get admin emails from Google Sheets (placeholder - you'll need to implement this)
  private async getAdminEmails(): Promise<string[]> {
    // This should fetch admin emails from a separate Google Sheet column
    // For now, return a default list including crew members
    return [
      'maintenance@heronsquare.co.za',
      'kea.khoele@gmail.com', // Primary crew member
      'enquiries@heronsquare.co.za' // Admin email
    ]; // Replace with actual implementation
  }

  // Get spreadsheet as attachment (placeholder - you'll need to implement this)
  private async getSpreadsheetAttachment(): Promise<string> {
    // This should generate or fetch the spreadsheet as a file
    // For now, return a placeholder
    return 'base64_encoded_spreadsheet_content'; // Replace with actual implementation
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
