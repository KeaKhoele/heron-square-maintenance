import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AccessControlProvider } from './contexts/AccessControlContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import CrewSignIn from './components/CrewSignIn';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import OfflineIndicator from './components/OfflineIndicator';

function App() {
  return (
    <AuthProvider>
      <AccessControlProvider>
        <NotificationProvider>
          <Router>
            <div className="App min-h-screen bg-gray-50">
              <OfflineIndicator />
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/crew-signin" element={<CrewSignIn />} />
              <Route path="/mobile-test" element={<div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Mobile Test Page</h1>
                <p className="mb-4">If you can see this, mobile routing is working!</p>
                <div className="bg-blue-100 p-4 rounded">
                  <p><strong>Device Info:</strong></p>
                  <p>User Agent: {navigator.userAgent}</p>
                  <p>Screen Size: {window.screen.width} x {window.screen.height}</p>
                  <p>Viewport: {window.innerWidth} x {window.innerHeight}</p>
                </div>
              </div>} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
        </NotificationProvider>
      </AccessControlProvider>
    </AuthProvider>
  );
}

export default App;
