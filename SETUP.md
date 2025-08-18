# Heron Square Maintenance App Setup

## Prerequisites

Before running this application, you'll need to set up the following services:

### 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication with Email/Password
4. Get your Firebase config from Project Settings > General > Your apps
5. Create a `.env` file in the root directory with:

```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 2. Google Sheets API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API
4. Create a Service Account
5. Download the JSON key file
6. Share your Google Sheet with the service account email
7. Add to `.env`:

```env
REACT_APP_GOOGLE_SHEETS_ID=your_google_sheet_id_here
REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
REACT_APP_GOOGLE_PRIVATE_KEY=your_private_key
```

### 3. Resend API Setup (for Email Notifications)
1. Sign up at [Resend](https://resend.com/)
2. Get your API key
3. Add to `.env`:

```env
REACT_APP_RESEND_API_KEY=your_resend_api_key_here
REACT_APP_FROM_EMAIL=enquiries@heronsquare.co.za
REACT_APP_ADMIN_EMAILS=kea.khoele@gmail.com,enquiries@heronsquare.co.za
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your configuration (see above)

3. Start the development server:
```bash
npm start
```

## Google Sheets Structure

Your Google Sheet should have the following columns:
- Name and Surname
- Unit & Address
- Issue Description
- Urgency Level
- Status
- Timestamp
- User Email

Plus a separate sheet for admin emails:
- Admin Emails (one email per row)

## Features

### Tenant Features
- ✅ Welcome screen with email authentication
- ✅ Dashboard to view submitted issues
- ✅ Form to submit new maintenance requests
- ✅ Real-time status updates

### Admin Features
- ✅ View all maintenance issues
- ✅ Filter issues by status
- ✅ Update issue status (In Process, Complete)
- ✅ Statistics dashboard

### Technical Features
- ✅ Firebase authentication
- ✅ Google Sheets integration (ready for implementation)
- ✅ Email notifications via Resend (ready for implementation)
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript for type safety

## Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables in Vercel
Make sure to add all the environment variables from your `.env` file to your Vercel project settings.

## Next Steps

1. **Implement Google Sheets API**: Replace the mock service in `src/services/issueService.ts`
2. **Implement Email Notifications**: Add Resend API integration
3. **Add Admin Authentication**: Implement proper admin login system
4. **Add QR Code Generation**: Generate QR codes for each property
5. **Add Image Upload**: Allow tenants to upload photos of issues
6. **Add Notifications**: Push notifications for status updates

## Support

For technical support or questions about the implementation, please refer to the code comments and documentation.
