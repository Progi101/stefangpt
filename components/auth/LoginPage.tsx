import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';

const CAPTCHA_LENGTH = 6;

const generateCaptcha = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let captcha = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captcha;
};

const LoginPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState('');
  const { login, signup } = useAuth();

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
  }, []);

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captcha.toLowerCase() !== captchaInput.toLowerCase()) {
      setError('CAPTCHA does not match.');
      refreshCaptcha();
      setCaptchaInput('');
      return;
    }

    if (isLoginView) {
      const success = await login(username, password);
      if (!success) {
        setError('Invalid username or password.');
        refreshCaptcha();
      }
    } else {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if(password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      const errorMessage = await signup(username, password);
      if (errorMessage) {
        setError(errorMessage);
        refreshCaptcha();
      }
    }
  };
  
  const handleSwitchView = (view: 'login' | 'signup') => {
      setIsLoginView(view === 'login');
      setError('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setCaptchaInput('');
      refreshCaptcha();
  }

  return (
    <div className="flex items-center justify-center h-full bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-2xl">
        <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
                <Logo className="[&>span]:text-gray-200" />
            </div>
          <p className="text-slate-400">Your Personal AI Assistant</p>
        </div>

        <div className="flex border-b border-slate-700">
          <button
            onClick={() => handleSwitchView('login')}
            className={`w-1/2 pb-3 text-sm font-medium text-center transition-colors relative ${isLoginView ? 'text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Log In
            {isLoginView && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-400"></div>}
          </button>
          <button
            onClick={() => handleSwitchView('signup')}
            className={`w-1/2 pb-3 text-sm font-medium text-center transition-colors relative ${!isLoginView ? 'text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Sign Up
            {!isLoginView && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-400"></div>}
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            maxLength={25}
            className="w-full px-4 py-2.5 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 placeholder-slate-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            maxLength={30}
            className="w-full px-4 py-2.5 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 placeholder-slate-400"
          />
          {!isLoginView && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              maxLength={30}
              className="w-full px-4 py-2.5 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 placeholder-slate-400"
            />
          )}
          
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 w-32 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-md select-none text-xl tracking-widest font-mono italic text-slate-300 text-center">
              {captcha}
            </div>
             <input
              type="text"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Enter CAPTCHA"
              required
              className="w-full px-4 py-2.5 text-white bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 placeholder-slate-400"
            />
          </div>

          {error && <p className="text-sm text-red-400 text-center pt-1">{error}</p>}

          <div className="pt-2">
            <p className="text-xs text-slate-500 text-center px-4">
              Note: For your privacy, accounts are stored locally on this device and browser only. They will not sync across devices.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 font-semibold text-white bg-slate-700 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition-colors"
          >
            {isLoginView ? 'Log In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;