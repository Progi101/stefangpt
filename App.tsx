import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './components/auth/LoginPage';
import MainLayout from './components/layout/MainLayout';

const VerticalAd: React.FC = () => {
  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className="w-full h-full flex items-center">
        <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-3127221679293637"
            data-ad-slot="9236968714"
            data-ad-format="auto"
            data-full-width-responsive="true"
        ></ins>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex justify-center w-full h-full">
      {/* Left Ad */}
      <aside className="hidden xl:flex w-48 shrink-0 p-4">
        <VerticalAd />
      </aside>
      
      {/* Main App */}
      <div className="w-full h-full flex-1 min-w-0">
        <MainLayout />
      </div>

      {/* Right Ad */}
      <aside className="hidden xl:flex w-48 shrink-0 p-4">
        <VerticalAd />
      </aside>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="h-screen w-screen bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-300 overflow-hidden">
          <AppContent />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
