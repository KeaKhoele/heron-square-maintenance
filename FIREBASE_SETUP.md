# 🔥 Firebase Setup Guide

## Quick Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `heron-square-maintenance`
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication
1. In your Firebase project, click "Authentication" in the left sidebar
2. Click "Get started"
3. Click on "Sign-in method" tab
4. Click "Email/Password"
5. Enable it and click "Save"

### 3. Get Your Config
1. Click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register app with name: `heron-square-maintenance-web`
6. Copy the config object

### 4. Create Environment File
Create a `.env` file in your project root with:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 5. Test the App
1. Restart your development server: `npm start`
2. Open `http://localhost:3000`
3. Try signing in with any email address
4. The app should now authenticate properly!

## Example Firebase Config
Your config will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "heron-square-maintenance.firebaseapp.com",
  projectId: "heron-square-maintenance",
  storageBucket: "heron-square-maintenance.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Troubleshooting
- **"Firebase not initialized"**: Check your .env file and restart the server
- **"Permission denied"**: Make sure Authentication is enabled in Firebase
- **"App not found"**: Verify your Firebase project ID is correct

## Next Steps After Firebase Setup
1. ✅ Test authentication works
2. 🔄 Set up Google Sheets integration
3. 🔄 Configure email notifications
4. 🚀 Deploy to production

