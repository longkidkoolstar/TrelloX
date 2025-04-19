import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';

interface AuthContainerProps {
  onAuthenticated: () => void;
}

const AuthContainer: React.FC<AuthContainerProps> = ({ onAuthenticated }) => {
  const [showLogin, setShowLogin] = useState(true);

  const handleSwitchToSignup = () => {
    setShowLogin(false);
  };

  const handleSwitchToLogin = () => {
    setShowLogin(true);
  };

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
