import React, { useState } from 'react';
import { signInUser } from '../firebase/auth';
import GoogleSignInButton from './GoogleSignInButton';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToSignup, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInUser(email, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Sign In to TrelloX</h2>

        {error && <div className="error-message">{error}</div>}

        <GoogleSignInButton
          onSuccess={onLogin}
          isLoading={isLoading}
        />

        <div className="separator">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="forgot-password">
              <button
                type="button"
                className="forgot-password-link"
                onClick={onSwitchToForgotPassword}
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In with Email'}
          </button>
        </form>

        <div className="switch-form">
          Don't have an account?{' '}
          <button
            className="switch-button"
            onClick={onSwitchToSignup}
            disabled={isLoading}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
