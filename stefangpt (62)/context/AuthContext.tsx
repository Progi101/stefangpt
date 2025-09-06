import React, { createContext, useState, useContext, useCallback } from 'react';
import { User } from '../types';
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state directly from localStorage to prevent logout on hot reload.
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const loggedInUser = await loginUser(username, password);
    if (loggedInUser) {
      setUser(loggedInUser);
      return true;
    }
    return false;
  }, []);

  const signup = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const newUser = await registerUser(username, password);
      if (newUser) {
        setUser(newUser);
        return null; // Success
      }
      return "An unknown error occurred during signup."; // Fallback error
    } catch (error) {
      if (error instanceof Error) {
        return error.message; // Return specific error message
      }
      return "An unexpected error occurred.";
    }
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
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