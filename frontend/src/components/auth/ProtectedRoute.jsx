import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

/**
 * Wraps a route and redirects to /login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
