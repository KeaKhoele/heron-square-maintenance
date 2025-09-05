# 🏠 Heron Square Maintenance App

A modern, responsive web application for tenants to log and track maintenance issues at Heron Square properties. Built with React, TypeScript, and Tailwind CSS.

## ✨ Features

### 🏢 Tenant Portal
- **Simple Authentication**: Email-only login system
- **Issue Submission**: Comprehensive form with address/unit selection
- **Real-time Tracking**: View status updates on submitted issues
- **Responsive Design**: Works perfectly on all devices

### 🛠️ Maintenance Crew Dashboard
- **Overview Dashboard**: Statistics and issue counts
- **Issue Management**: View all issues with filtering options
- **Status Updates**: Toggle between "In Process" and "Complete"
- **Real-time Sync**: Instant updates across all users

### 🔧 Technical Features
- **Firebase Authentication**: Secure user management
- **Google Sheets Integration**: Data storage and management
- **Email Notifications**: Automatic alerts via Resend API
- **Modern UI/UX**: Beautiful, intuitive interface
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Responsive, modern styling

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project
- Google Sheets API access
- Resend API account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd maintenant-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📋 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Firebase
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Google Sheets
REACT_APP_GOOGLE_SHEETS_ID=your_sheet_id
REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account
REACT_APP_GOOGLE_PRIVATE_KEY=your_private_key

# Resend (Email)
REACT_APP_RESEND_API_KEY=your_resend_key
REACT_APP_FROM_EMAIL=enquiries@heronsquare.co.za
REACT_APP_ADMIN_EMAILS=kea.khoele@gmail.com,enquiries@heronsquare.co.za
```

### Google Sheets Setup
Your Google Sheet should have these columns:
- Name and Surname
- Unit & Address
- Issue Description
- Urgency Level
- Status
- Timestamp
- User Email

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── Home.tsx        # Welcome screen
│   ├── Dashboard.tsx   # Tenant dashboard
│   ├── AdminDashboard.tsx # Maintenance crew dashboard
│   ├── IssueForm.tsx   # Issue submission form
│   ├── ProtectedRoute.tsx # Route protection
│   └── AdminRoute.tsx  # Admin route protection
├── contexts/            # React contexts
│   └── AuthContext.tsx # Authentication context
├── services/            # API services
│   └── issueService.ts # Issue management service
├── types/               # TypeScript types
│   └── Issue.ts        # Issue interface
├── config/              # Configuration files
│   └── firebase.ts     # Firebase configuration
├── App.tsx              # Main app component
└── index.tsx            # App entry point
```

## 🎯 Usage

### For Tenants
1. **Access the app** via QR code or direct URL
2. **Sign in** with your email address
3. **Submit issues** using the "+" button
4. **Track progress** in your dashboard

### For Maintenance Crew
1. **Access admin dashboard** at `/admin`
2. **View all issues** with filtering options
3. **Update status** using toggle buttons
4. **Monitor statistics** on the overview dashboard

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy automatically

### Other Platforms
The app can be deployed to any static hosting service:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

## 🔧 Development

### Available Scripts
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Code Style
- TypeScript for type safety
- Tailwind CSS for styling
- Functional components with hooks
- Proper error handling
- Responsive design principles

## 📱 Mobile Support

The app is fully responsive and optimized for:
- 📱 Mobile phones
- 📱 Tablets
- 💻 Desktop computers
- 🖥️ Large displays

## 🔒 Security Features

- Firebase authentication
- Protected routes
- Input validation
- Secure API calls
- Environment variable protection

## 🚧 Roadmap

### Phase 1 (Current)
- ✅ Basic authentication
- ✅ Issue submission
- ✅ Status tracking
- ✅ Admin dashboard

### Phase 2 (Next)
- 🔄 Google Sheets integration
- 🔄 Email notifications
- 🔄 QR code generation
- 🔄 Image uploads

### Phase 3 (Future)
- 📅 Push notifications
- 📅 Advanced reporting
- 📅 Multi-language support
- 📅 Mobile app

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software for Heron Square Property Management.

## 📞 Support

For support or questions:
- **Technical Issues**: Check the code comments and documentation
- **Business Questions**: Contact Heron Square management
- **Feature Requests**: Submit through the project repository

---

**Built with ❤️ for Heron Square Property Management**

