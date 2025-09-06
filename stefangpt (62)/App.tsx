import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './components/auth/LoginPage';
import MainLayout from './components/layout/MainLayout';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return user ? <MainLayout /> : <LoginPage />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="h-screen w-screen bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-300">
          <AppContent />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;