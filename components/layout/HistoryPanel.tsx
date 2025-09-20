import React, { useState, Fragment } from 'react';
import { ChatSession } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon, { PlusIcon, SearchIcon, LibraryIcon, UserIcon, LogoutIcon, SettingsIcon, SunIcon, MoonIcon, XIcon, InformationCircleIcon, ChatBubbleLeftRightIcon } from '../common/Icon';
import Logo from '../common/Logo';

interface HistoryPanelProps {
  sessions: Pick<ChatSession, 'id' | 'title' | 'createdAt'>[];
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
  
  const NavButton = ({ icon, label, onClick }: { icon: React.FC<any>, label: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
    >
      <Icon icon={icon} className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400 shrink-0" />
      <span className="truncate transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">{label}</span>
    </button>
  );

  return (
    <Fragment>
      <aside className="w-full bg-gray-100 dark:bg-gray-900 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 p-4">
          <Logo className="[&>span]:text-xl [&>span]:text-gray-800 [&>span]:dark:text-white [&>svg]:w-8 [&>svg]:h-8 [&>svg]:text-gray-800 [&>svg]:dark:text-white [&>span]:md:hidden [&>span]:md:group-hover:inline" />
          <button onClick={onClose} className="md:hidden p-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
              <Icon icon={XIcon} className="w-6 h-6"/>
          </button>
        </div>

        {/* Top actions */}
        <div className="px-4 pb-2 space-y-4">
            <button
            onClick={onNewChat}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-600 focus:outline-none"
            >
              <Icon icon={PlusIcon} className="w-5 h-5 md:mr-0 md:group-hover:mr-2 shrink-0" />
              <span className="truncate transition-opacity duration-200 md:hidden md:group-hover:inline">New Chat</span>
            </button>
            <div className="relative md:hidden md:group-hover:block">
              <Icon icon={SearchIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                  type="text"
                  placeholder="Search History"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div className="md:hidden md:group-hover:block">
              <NavButton icon={LibraryIcon} label="Library" onClick={onShowLibrary} />
            </div>
        </div>
        
        {/* Scrollable chat history */}
        <div className="flex-1 overflow-y-auto px-4 my-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
          <div className="space-y-1">
            {filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left px-4 py-2 text-sm rounded-md truncate ${
                  session.id === activeSessionId ? 'bg-gray-800 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {session.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2 shrink-0">
          <div className="md:hidden md:group-hover:block">
            <NavButton icon={InformationCircleIcon} label="What is StefanGPT?" onClick={onShowAbout}/>
            <NavButton icon={ChatBubbleLeftRightIcon} label="Support" onClick={() => setIsSupportModalOpen(true)}/>
          </div>
           
          <div className="relative">
              {isSettingsOpen && (
                  <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="p-2">
                          <p className="text-xs px-2 pb-1 text-gray-400">Theme</p>
                          <div className="flex space-x-2">
                              <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm ${theme === 'light' ? 'bg-gray-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                  <Icon icon={SunIcon} className="w-5 h-5 mr-2"/> Light
                              </button>
                              <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm ${theme === 'dark' ? 'bg-gray-700 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                  <Icon icon={MoonIcon} className="w-5 h-5 mr-2"/> Dark
                              </button>
                          </div>
                      </div>
                  </div>
              )}
              <NavButton icon={SettingsIcon} label="Settings" onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsProfileOpen(false); }} />
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
          
          <div className="relative">
              {isProfileOpen && (
                  <div className="absolute bottom-full mb-2 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                      <button
                          onClick={logout}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-md"
                      >
                          <Icon icon={LogoutIcon} className="w-5 h-5 mr-3" />
                          Log Out
                      </button>
                  </div>
              )}
              <button
                onClick={() => { setIsProfileOpen(!isProfileOpen); setIsSettingsOpen(false); }}
                className="flex items-center w-full p-3 text-sm text-left text-gray-800 dark:text-white bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
              >
                <Icon icon={UserIcon} className="w-6 h-6 mr-3 bg-gray-400 dark:bg-gray-600 p-1 rounded-full shrink-0" />
                <span className="truncate transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">{user?.username}</span>
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