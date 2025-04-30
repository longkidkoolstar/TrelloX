import React, { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../firebase/config';
import { saveUserProfile, convertFirebaseUser } from '../firebase/auth';
import './AuthContainer.css';

interface AuthContainerProps {
  onAuthenticated: () => void;
}

const AuthContainer: React.FC<AuthContainerProps> = ({ onAuthenticated }) => {
  // Define view states: 'login', 'signup', 'forgotPassword'
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'forgotPassword'>('login');
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  // Check for redirect result from Google sign-in
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        setIsCheckingRedirect(true);
        const result = await getRedirectResult(auth);

        if (result) {
          // User successfully signed in with redirect
          const userProfile = convertFirebaseUser(result.user);
          await saveUserProfile(userProfile);
          onAuthenticated();
        }
      } catch (error) {
        console.error('Error checking redirect result:', error);
      } finally {
        setIsCheckingRedirect(false);
      }
    };

    checkRedirectResult();
  }, [onAuthenticated]);

  const handleSwitchToSignup = () => {
    setCurrentView('signup');
  };

  const handleSwitchToLogin = () => {
    setCurrentView('login');
  };

  const handleSwitchToForgotPassword = () => {
    setCurrentView('forgotPassword');
  };

  if (isCheckingRedirect) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <>
      {currentView === 'login' && (
        <Login
          onLogin={onAuthenticated}
          onSwitchToSignup={handleSwitchToSignup}
          onSwitchToForgotPassword={handleSwitchToForgotPassword}
        />
      )}

      {currentView === 'signup' && (
        <Signup
          onSignup={onAuthenticated}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}

      {currentView === 'forgotPassword' && (
        <ForgotPassword
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
    </>
  );
};

export default AuthContainer;
