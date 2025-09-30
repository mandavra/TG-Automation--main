import React from 'react';
import { Navigate } from 'react-router-dom';

const UserProtectedRoute = ({ children }) => {
  // Check if user is authenticated (has phone number in localStorage)
  const userPhone = localStorage.getItem('userPhone');
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  // If not authenticated, redirect to home page
  if (!userPhone || !isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  // If authenticated, render the protected component
  return children;
};

export default UserProtectedRoute;
