# Google Sheets API Setup Guide

## Overview
This guide will help you set up Google Sheets API integration to replace localStorage and enable cross-device data sharing for your maintenance app.

## Prerequisites
- Google account
- Access to Google Cloud Console
- Basic understanding of APIs

## Step 1: Create Google Cloud Project

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Click "Select a project" → "New Project"**
3. **Name your project**: `heron-square-maintenance`
4. **Click "Create"**

## Step 2: Enable Google Sheets API

1. **In your project, go to "APIs & Services" → "Library"**
2. **Search for "Google Sheets API"**
3. **Click on it and click "Enable"**

## Step 3: Create Service Account

1. **Go to "APIs & Services" → "Credentials"**
2. **Click "Create Credentials" → "Service Account"**
3. **Fill in details**:
   - **Name**: `maintenance-app-service`
   - **Description**: `Service account for maintenance app`
4. **Click "Create and Continue"**
5. **Skip role assignment** (click "Continue")
6. **Click "Done"**

## Step 4: Generate API Key

1. **In Credentials, click "Create Credentials" → "API Key"**
2. **Copy the API key** (you'll need this)
3. **Click "Restrict Key"**
4. **Restrict to Google Sheets API only**
5. **Click "Save"**

## Step 5: Create Google Spreadsheet

1. **Go to [Google Sheets](https://sheets.google.com/)**
2. **Create a new spreadsheet**
3. **Name it**: `Heron Square Maintenance Issues`
4. **Add this header row** (Row 1):
   ```
   ID | Timestamp | Name | Address | Unit | Description | Urgency | Status | User Email
   ```
5. **Copy the Spreadsheet ID** from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the part between `/d/` and `/edit`

## Step 6: Share Spreadsheet

1. **Click "Share" button**
2. **Add your service account email** (found in Step 3)
3. **Give "Editor" access**
4. **Click "Send"**

## Step 7: Add Environment Variables

Add these to your Netlify environment variables:

```
REACT_APP_GOOGLE_SHEETS_API_KEY=YOUR_API_KEY_HERE
REACT_APP_GOOGLE_SPREADSHEET_ID=YOUR_SPREADSHEET_ID_HERE
```

## Step 8: Test Integration

1. **Deploy your app with the new environment variables**
2. **Submit a test issue as a tenant**
3. **Check if it appears in your Google Sheet**
4. **Verify crew dashboard can see the issue**

## Troubleshooting

### Common Issues:

1. **"API not enabled" error**
   - Make sure Google Sheets API is enabled in your project

2. **"Access denied" error**
   - Check if service account has access to the spreadsheet
   - Verify API key restrictions

3. **"Spreadsheet not found" error**
   - Verify the Spreadsheet ID is correct
   - Check if spreadsheet is shared with service account

4. **"Quota exceeded" error**
   - Google Sheets API has free tier limits
   - Consider upgrading to paid plan for high usage

## Security Notes

- **API keys are public** (safe to expose in frontend)
- **Service account access** is restricted to your spreadsheet only
- **No sensitive data** is stored in the API key
- **Consider rate limiting** for production use

## Benefits After Setup

✅ **Cross-device data sharing** - Crew sees tenant issues from any device
✅ **Real-time updates** - No more manual data copying
✅ **Data persistence** - Issues never lost, even if app crashes
✅ **Backup and recovery** - All data stored in Google Sheets
✅ **Multi-user support** - Multiple crew members can access simultaneously
✅ **Offline fallback** - localStorage backup if API fails

## Next Steps

After setup, your app will:
1. **Store all issues** in Google Sheets
2. **Share data across devices** automatically
3. **Enable real-time updates** for crew members
4. **Provide reliable data persistence** for all users

## Support

If you encounter issues:
1. **Check Google Cloud Console** for API quotas and errors
2. **Verify environment variables** are set correctly
3. **Test with a simple spreadsheet** first
4. **Check browser console** for detailed error messages
