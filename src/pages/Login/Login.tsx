import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/Auth';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    login(); // Simulate login
    const redirectTo = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
    navigate(redirectTo, { replace: true });
  };

  return (
    <div>
      <h1>Login Page</h1>
      <button onClick={handleLogin}>Log in</button>
    </div>
  );
};
