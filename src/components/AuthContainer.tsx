import React, { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../firebase/config';
import { saveUserProfile, convertFirebaseUser } from '../firebase/auth';
import './AuthContainer.css';

interface AuthContainerProps {
  onAuthenticated: () => void;
}

const AuthContainer: React.FC<AuthContainerProps> = ({ onAuthenticated }) => {
  const [showLogin, setShowLogin] = useState(true);
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
    setShowLogin(false);
  };

  const handleSwitchToLogin = () => {
    setShowLogin(true);
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
      {showLogin ? (
        <Login
          onLogin={onAuthenticated}
          onSwitchToSignup={handleSwitchToSignup}
        />
      ) : (
        <Signup
          onSignup={onAuthenticated}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
    </>
  );
};

export default AuthContainer;
