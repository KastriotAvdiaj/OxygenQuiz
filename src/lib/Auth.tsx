import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface User {
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = () => {
    // Simulate a login by setting a dummy user object
    setUser({ name: 'Test User' });
  };

  const logout = () => {
    // Simulate a logout by clearing the user state
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


interface ProtectedRouteProps {
    children: ReactNode;
  }
  
  export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
  
    if (!user) {
      return (
        <Navigate
          to={`/auth/login?redirectTo=${encodeURIComponent(location.pathname)}`}
          replace
        />
      );
    }
  
    return <>{children}</>;
  };