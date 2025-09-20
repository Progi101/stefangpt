import React, { useMemo, useEffect, useState } from 'react';
import { ChatSession, Message, ImageContent, SearchResultContent } from '../../types';
import Icon, { DownloadIcon, MenuIcon } from '../common/Icon';

type LibraryContent = ImageContent | SearchResultContent;

interface LibraryItem {
  content: LibraryContent;
  sessionTitle: string;
  sessionId: string;
  timestamp: number;
}

interface LibraryViewProps {
    sessions: ChatSession[] | null; // Can be null while loading
    onToggleHistory: () => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ sessions, onToggleHistory }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessions !== null) {
      setIsLoading(false);
    }
  }, [sessions]);

  const libraryItems: LibraryItem[] = useMemo(() => {
    if (!sessions) return [];
    const items: LibraryItem[] = [];
    sessions.forEach(session => {
      session.messages.forEach((message: Message) => {
        if (message.content.type === 'image' || message.content.type === 'search') {
          items.push({
            content: message.content,
            sessionTitle: session.title,
            sessionId: session.id,
            timestamp: parseInt(message.id, 10),
          });
        }
      });
    });
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [sessions]);

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
        link.download = `stefan-gpt-${filename || 'image'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download failed:', error);
        window.open(imageUrl, '_blank');
    }
  };

  const renderItem = (item: LibraryItem) => {
      const { content } = item;
      if (content.type === 'image') {
          return (
              <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg group relative">
                  <img src={content.imageUrl} alt={content.prompt} className="w-full h-48 object-cover" />
                  <button onClick={() => handleDownload(content.imageUrl, content.prompt)} className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon icon={DownloadIcon} className="w-5 h-5" />
                  </button>
                  <div className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate group-hover:whitespace-normal">
                          <span className="font-semibold text-gray-800 dark:text-gray-100">Prompt: </span>{content.prompt}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">From: {item.sessionTitle}</p>
                  </div>
              </div>
          );
      }
      if(content.type === 'search') {
          return (
             <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col h-full">
                <div className="flex-grow overflow-hidden">
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4">{content.text}</p>
                </div>
                 <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Sources:</h4>
                     <ul className="space-y-1">
                        {content.citations.slice(0, 2).map((cite, index) => (
                            <li key={index} className="text-xs">
                                <a href={cite.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-500 dark:text-indigo-400 hover:underline truncate block">
                                    {cite.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                 </div>
                 <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">From: {item.sessionTitle}</p>
             </div>
          )
      }
      return null;
  }

  return (
    <div className="h-full flex flex-col">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center shrink-0">
            <button onClick={onToggleHistory} className="p-2 -ml-2 mr-2 text-gray-500 dark:text-gray-400">
                <Icon icon={MenuIcon} className="w-6 h-6"/>
            </button>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Library</h2>
        </header>
        <div className="p-6 flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900">
            {isLoading ? (
                 <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <p>Loading library...</p>
                 </div>
            ) : libraryItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <p>Your generated images and web searches will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {libraryItems.map((item) => (
                    <div key={item.timestamp}>
                        {renderItem(item)}
                    </div>
                ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default LibraryView;