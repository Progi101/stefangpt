import React, { useState, Fragment, useEffect, useRef } from 'react';
import { ChatSession } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon, { PlusCircleIcon, SearchIcon, LibraryIcon, UserIcon, LogoutIcon, SettingsIcon, SunIcon, MoonIcon, XIcon, InformationCircleIcon, ChatBubbleLeftRightIcon } from '../common/Icon';
import Logo from '../common/Logo';
import { marked } from 'marked';

const HorizontalAd: React.FC = () => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const adElement = adRef.current;
    if (!adElement) return;

    const observer = new IntersectionObserver((entries) => {
      // isIntersecting is true when the element is visible in the viewport
      if (entries[0].isIntersecting && !pushed.current) {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          pushed.current = true; // Mark as pushed to avoid duplicates
        } catch (e) {
          console.error("AdSense error:", e);
        } finally {
          // We've done our job, so disconnect the observer
          observer.disconnect();
        }
      }
    }, { threshold: 0.01 }); // Trigger when at least 1% of the ad is visible

    observer.observe(adElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="my-4 px-1">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-3127221679293637"
          data-ad-slot="6981011474"
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
    </div>
  );
};

interface HistoryPanelProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onShowLibrary: () => void;
  onShowAbout: () => void;
  onClose: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ sessions, activeSessionId, onNewChat, onSelectSession, onShowLibrary, onShowAbout, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Fragment>
      <aside className="w-full bg-slate-100 dark:bg-slate-900 flex flex-col p-2 md:p-3 border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden">
        <div className="flex items-center justify-between shrink-0 mb-4 px-1 md:px-0">
          <Logo className="[&>svg]:w-10 [&>svg]:h-10 text-slate-800 dark:text-white" />
          <button onClick={onClose} className="md:hidden p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
              <Icon icon={XIcon} className="w-6 h-6"/>
          </button>
        </div>
        
        <div className="shrink-0 space-y-2">
            <button
              onClick={onNewChat}
              className="flex items-center justify-center md:group-hover:justify-start w-full p-3 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 focus:outline-none"
            >
              <Icon icon={PlusCircleIcon} className="w-6 h-6 md:group-hover:mr-3 shrink-0" />
              <span className="md:hidden md:group-hover:block truncate">New Chat</span>
            </button>
            <div className="relative md:hidden md:group-hover:block">
              <Icon icon={SearchIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                  type="text"
                  placeholder="Search History"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <button
              onClick={onShowLibrary}
              className="flex items-center justify-center md:group-hover:justify-start w-full p-3 text-sm text-left text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <Icon icon={LibraryIcon} className="w-6 h-6 md:group-hover:mr-3 shrink-0" />
              <span className="md:hidden md:group-hover:block truncate">Library</span>
            </button>
        </div>

        {/* Main scrollable area */}
        <div className="flex-1 overflow-y-auto my-4 -mr-3 pr-2">
          <div className="space-y-1 md:hidden md:group-hover:block">
            {filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors ${
                  session.id === activeSessionId ? 'bg-slate-700 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                dangerouslySetInnerHTML={{ __html: marked.parseInline(session.title) }}
              >
              </button>
            ))}
          </div>
          <div className="md:hidden md:group-hover:block">
            <HorizontalAd />
          </div>
        </div>


        {/* Footer buttons, now sticky at the bottom */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1">
          <button
              onClick={onShowAbout}
              className="flex items-center justify-center md:group-hover:justify-start w-full p-3 text-sm text-left text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
          >
              <Icon icon={InformationCircleIcon} className="w-6 h-6 md:group-hover:mr-3 shrink-0" />
              <span className="md:hidden md:group-hover:block truncate">What is StefanGPT?</span>
          </button>
          <button
              onClick={() => setIsSupportModalOpen(true)}
              className="flex items-center justify-center md:group-hover:justify-start w-full p-3 text-sm text-left text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
          >
              <Icon icon={ChatBubbleLeftRightIcon} className="w-6 h-6 md:group-hover:mr-3 shrink-0" />
              <span className="md:hidden md:group-hover:block truncate">Support</span>
          </button>
          <div className="relative">
              {isSettingsOpen && (
                  <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700">
                      <div className="p-2">
                          <p className="text-xs px-2 pb-1 text-slate-400">Theme</p>
                          <div className="flex space-x-2">
                              <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm ${theme === 'light' ? 'bg-slate-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                  <Icon icon={SunIcon} className="w-5 h-5 mr-2"/> Light
                              </button>
                              <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm ${theme === 'dark' ? 'bg-slate-700 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                  <Icon icon={MoonIcon} className="w-5 h-5 mr-2"/> Dark
                              </button>
                          </div>
                      </div>
                  </div>
              )}
              <button
                  onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsProfileOpen(false); }}
                  className="flex items-center justify-center md:group-hover:justify-start w-full p-3 text-sm text-left text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                  <Icon icon={SettingsIcon} className="w-6 h-6 md:group-hover:mr-3 shrink-0" />
                  <span className="md:hidden md:group-hover:block truncate">Settings</span>
              </button>
          </div>
           <div className="relative">
              {isProfileOpen && (
                  <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1">
                      <button
                          onClick={logout}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-md"
                      >
                          <Icon icon={LogoutIcon} className="w-5 h-5 mr-3" />
                          Log Out
                      </button>
                  </div>
              )}
              <button
                onClick={() => { setIsProfileOpen(!isProfileOpen); setIsSettingsOpen(false); }}
                className="flex items-center justify-center md:group-hover:justify-start w-full p-3 text-sm text-left text-slate-800 dark:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <Icon icon={UserIcon} className="w-6 h-6 md:group-hover:mr-3 shrink-0" />
                <span className="md:hidden md:group-hover:block truncate">{user?.username}</span>
              </button>
          </div>
        </div>
      </aside>
      
      {isSupportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Contact Support</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    For any questions or support requests, please email our team. We're happy to help!
                </p>
                <div className="mt-4 bg-gray-100 dark:bg-gray-700 rounded-md p-3 text-center">
                    <a href="mailto:iaconidani6@gmail.com" className="text-gray-800 dark:text-gray-200 font-mono">
                        iaconidani6@gmail.com
                    </a>
                </div>
                <div className="mt-5 sm:mt-6">
                    <button
                        type="button"
                        className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-800 text-base font-medium text-white hover:bg-black focus:outline-none dark:bg-gray-600 dark:hover:bg-gray-500"
                        onClick={() => setIsSupportModalOpen(false)}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </Fragment>
  );
};

export default HistoryPanel;