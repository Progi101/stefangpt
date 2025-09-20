import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Icon, { UserIcon, LogoutIcon, SunIcon, MoonIcon, XIcon, SettingsIcon } from '../common/Icon';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="flex items-center text-lg font-medium text-gray-900 dark:text-white">
                    <Icon icon={SettingsIcon} className="w-6 h-6 mr-2" />
                    Profile & Settings
                </h3>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Icon icon={XIcon} className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center w-full p-3 text-sm text-left text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-900 rounded-md">
                    <Icon icon={UserIcon} className="w-6 h-6 mr-3 bg-gray-400 dark:bg-gray-600 p-1 rounded-full" />
                    <span className="truncate font-semibold">{user?.username}</span>
                </div>

                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 px-1">Theme</p>
                    <div className="flex space-x-2">
                        <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm transition-colors ${theme === 'light' ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                            <Icon icon={SunIcon} className="w-5 h-5 mr-2"/> Light
                        </button>
                        <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center p-2 rounded-md text-sm transition-colors ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                            <Icon icon={MoonIcon} className="w-5 h-5 mr-2"/> Dark
                        </button>
                    </div>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 !mt-6 !mb-2"></div>
                
                <button
                    onClick={() => {
                        logout();
                        onClose(); // Close modal after logout
                    }}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                    <Icon icon={LogoutIcon} className="w-5 h-5 mr-3" />
                    Log Out
                </button>
            </div>
        </div>
    </div>
  );
};

export default ProfileModal;
