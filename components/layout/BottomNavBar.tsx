import React from 'react';
import Icon, { PlusIcon, LibraryIcon, MenuIcon } from '../common/Icon';

interface BottomNavBarProps {
  onNewChat: () => void;
  onShowLibrary: () => void;
  onToggleHistory: () => void;
  activeView: 'chat' | 'library' | 'about';
}

const NavButton: React.FC<{
    icon: React.FC<any>;
    label: string;
    onClick: () => void;
    isActive?: boolean;
}> = ({ icon, label, onClick, isActive }) => {
    const activeClasses = isActive ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400';
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors hover:text-gray-800 dark:hover:text-white ${activeClasses}`}
        >
            <Icon icon={icon} className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ onNewChat, onShowLibrary, onToggleHistory, activeView }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden z-40">
            <div className="flex items-center justify-around h-full max-w-md mx-auto">
                <NavButton
                    icon={PlusIcon}
                    label="New Chat"
                    onClick={onNewChat}
                    isActive={activeView === 'chat'}
                />
                <NavButton
                    icon={LibraryIcon}
                    label="Library"
                    onClick={onShowLibrary}
                    isActive={activeView === 'library'}
                />
                <NavButton
                    icon={MenuIcon}
                    label="Menu"
                    onClick={onToggleHistory}
                />
            </div>
        </nav>
    );
};

export default BottomNavBar;
