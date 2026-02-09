import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuthStore } from '../store/hotelStore';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { user, setUser, clearUser } = useAuthStore();
  const [isAuthenticated, setIsAuthenticated] = useState(
    location.state?.user ? true : null
  );

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const userData = await authService.getMe();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        clearUser();
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [location.state, setUser, clearUser]);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="protected-route-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;