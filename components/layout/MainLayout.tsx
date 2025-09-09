

import React, { useState, useEffect, useCallback } from 'react';
import HistoryPanel from './HistoryPanel';
import ChatWindow from '../chat/ChatWindow';
import LibraryView from '../library/LibraryView';
import AboutPage from '../about/AboutPage';
import { ChatSession, Message, MessageSender, MessageContent } from '../../types';
import { getChatSessions, saveChatSessions } from '../../services/storageService';
import Icon, { MenuIcon } from '../common/Icon';
import { generateChatResponse, generateTitleForChat, performWebSearch } from '../../services/geminiService';
import { generateImage } from '../../services/stabilityImageService';
import BottomNavBar from './BottomNavBar';

const ACTIVE_SESSION_ID_KEY = 'stefan_gpt_active_session_id';

type ViewType = 'chat' | 'library' | 'about';

const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const media = window.matchMedia(query);
        const listener = () => setMatches(media.matches);
        
        if (media.matches !== matches) {
            setMatches(media.matches);
        }

        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [matches, query]);

    return matches;
};

const MainLayout: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(() => {
    if (typeof window !== 'undefined') {
        return window.innerWidth >= 768;
    }
    return false;
  });
  const isDesktop = useMediaQuery('(min-width: 768px)');


  const handleNewChat = useCallback(() => {
    const initialMessage: Message = {
      id: `${Date.now()}-ai-greeting`,
      sender: MessageSender.AI,
      content: {
        type: 'text',
        text: 'I am StefanGPT, your personal AI assistant. How can I help you today?',
      },
    };

    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [initialMessage],
      createdAt: Date.now(),
    };
    
    setSessions(prevSessions => {
      const updatedSessions = [newSession, ...prevSessions];
      saveChatSessions(updatedSessions);
      return updatedSessions;
    });

    setActiveSessionId(newSession.id);
    sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);
    setView('chat');
    if (window.innerWidth < 768) {
      setIsHistoryPanelOpen(false);
    }
  }, []);

  useEffect(() => {
    const loadedSessions = getChatSessions();
    setSessions(loadedSessions);

    const lastActiveId = sessionStorage.getItem(ACTIVE_SESSION_ID_KEY);
    
    if (lastActiveId && loadedSessions.some(s => s.id === lastActiveId)) {
        setActiveSessionId(lastActiveId);
        setView('chat');
    } else if (loadedSessions.length > 0) {
        const mostRecentSessionId = loadedSessions[0].id;
        setActiveSessionId(mostRecentSessionId);
        sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, mostRecentSessionId);
        setView('chat');
    } else {
        handleNewChat();
    }
  }, [handleNewChat]);

  const handleSessionUpdate = useCallback((updatedSession: ChatSession) => {
    setSessions(currentSessions => {
        const sessionIndex = currentSessions.findIndex(s => s.id === updatedSession.id);
        let newSessions;
        if (sessionIndex > -1) {
            newSessions = [...currentSessions];
            newSessions[sessionIndex] = updatedSession;
        } else {
            // This case should not happen often with the current logic, but it's a safeguard
            newSessions = [updatedSession, ...currentSessions];
        }

        // Ensure the updated session is always at the top
        const finalSessions = [updatedSession, ...newSessions.filter(s => s.id !== updatedSession.id)];
        saveChatSessions(finalSessions);
        return finalSessions;
    });
  }, []);


  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
    setView('chat');
    if (window.innerWidth < 768) {
      setIsHistoryPanelOpen(false);
    }
  };

  const handleShowLibrary = () => {
      setView('library');
      setActiveSessionId(null);
      sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      if (window.innerWidth < 768) {
        setIsHistoryPanelOpen(false);
      }
  };

  const handleShowAbout = () => {
      setView('about');
      setActiveSessionId(null);
      sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      if (window.innerWidth < 768) {
        setIsHistoryPanelOpen(false);
      }
  };

  const handleSendMessage = async (prompt: string, attachment?: { dataUrl: string; mimeType: string }) => {
    if (!activeSessionId) return;

    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;
    
    // Create the user message
    const userMessageContent: MessageContent = attachment
      ? { type: 'user-query', text: prompt, imageUrl: attachment.dataUrl }
      : { type: 'text', text: prompt };

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: MessageSender.USER,
      content: userMessageContent,
    };

    // Update UI immediately with user's message
    const sessionWithUserMessage = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage],
    };
    handleSessionUpdate(sessionWithUserMessage);
    setIsLoading(true);
    
    try {
        let aiMessages: Message[] = [];
        let commandMatched = false;

        // Command processing should only happen for text-only prompts
        if (!attachment) {
            const lowercasedInput = prompt.toLowerCase().trim();
            const searchPrefixes = ['search', 'find', 'lookup', 'google'];
            const imagePrefixes = ['generate', 'create', 'draw', 'image of', 'picture of', 'icon of', 'logo of'];

            for (const prefix of searchPrefixes) {
                if (lowercasedInput.startsWith(prefix + ' ')) {
                    const searchPrompt = prompt.substring(prefix.length + 1).trim();
                    const searchContent = await performWebSearch(searchPrompt);
                    aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: searchContent });
                    commandMatched = true;
                    break;
                }
            }
            if (!commandMatched) {
                for (const prefix of imagePrefixes) {
                    if (lowercasedInput.startsWith(prefix + ' ')) {
                        const imagePrompt = prompt.substring(prefix.length + 1).trim();
                        const imageUrl = await generateImage(imagePrompt);
                        aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'image', imageUrl, prompt: imagePrompt } });
                        commandMatched = true;
                        break;
                    }
                }
            }
        }
        
        // If no command was matched, proceed with a general chat response
        if (!commandMatched) {
            const responseText = await generateChatResponse(sessionWithUserMessage.messages);
            const fileBlockRegex = /```json-files\s*([\s\S]*?)\s*```/s; // Use 's' flag for dotAll
            const match = responseText.match(fileBlockRegex);

            if (match && match[1]) {
                try {
                    // Extract explanation text that is outside the json block
                    const explanationText = responseText.replace(fileBlockRegex, '').trim();

                    const filesJson = JSON.parse(match[1]);
                    // Basic validation of the parsed JSON
                    if (Array.isArray(filesJson) && filesJson.length > 0 && filesJson.every(f => 'filename' in f && 'content' in f)) {
                        // Add files content first
                        aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'files', files: filesJson } });
                        
                        // If there's accompanying text, add it as a separate message
                        if (explanationText) {
                             aiMessages.push({ id: (Date.now() + 2).toString(), sender: MessageSender.AI, content: { type: 'text', text: explanationText } });
                        }
                    } else {
                         // The JSON is malformed, treat the whole thing as text
                         aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'text', text: responseText } });
                    }
                } catch (e) {
                     // JSON parsing failed, treat the whole response as a single text message
                     aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'text', text: responseText } });
                }
            } else {
                 // No file block found, just a regular text response
                 aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'text', text: responseText } });
            }
        }
        
        // Update session with AI response(s) immediately
        const sessionAfterAI = {
            ...sessionWithUserMessage,
            messages: [...sessionWithUserMessage.messages, ...aiMessages],
        };
        handleSessionUpdate(sessionAfterAI);

        // Generate title for new chats asynchronously
        if (sessionWithUserMessage.messages.length <= 2 && sessionWithUserMessage.title === 'New Chat') {
            (async () => {
                try {
                    const newTitle = await generateTitleForChat(prompt);
                    setSessions(currentSessions => {
                        const sessionIndex = currentSessions.findIndex(s => s.id === activeSessionId);
                        if (sessionIndex > -1) {
                            const newSessions = [...currentSessions];
                            newSessions[sessionIndex] = { ...newSessions[sessionIndex], title: newTitle };
                            saveChatSessions(newSessions);
                            return newSessions;
                        }
                        return currentSessions;
                    });
                } catch (error) {
                    console.error("Title generation failed:", error);
                }
            })();
        }

    } catch (error) {
        console.error("Error processing AI response:", error);
        const errorMessageText = error instanceof Error ? error.message : "An unknown error occurred. Please try again.";
        const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            sender: MessageSender.AI,
            content: { type: 'text', text: `<span style="color: #ef4444;">${errorMessageText}</span>` },
        };
        const sessionWithError = { ...sessionWithUserMessage, messages: [...sessionWithUserMessage.messages, errorMessage] };
        handleSessionUpdate(sessionWithError);
    } finally {
        setIsLoading(false);
    }
  };
  
  const activeSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : undefined;

  return (
    <div className="flex h-screen relative overflow-hidden">
      {isHistoryPanelOpen && !isDesktop && (
          <div 
              onClick={() => setIsHistoryPanelOpen(false)}
              className="fixed inset-0 bg-black/30 z-20 md:hidden"
              aria-hidden="true"
          ></div>
      )}
      <div className={`
        w-4/5 sm:w-80 md:w-64 h-full shrink-0 transform transition-all duration-300 ease-in-out
        fixed md:static z-30
        ${isHistoryPanelOpen ? 'translate-x-0' : '-translate-x-full md:ml-[-16rem]'}
      `}>
        <HistoryPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onShowLibrary={handleShowLibrary}
            onShowAbout={handleShowAbout}
            onClose={() => setIsHistoryPanelOpen(false)}
        />
      </div>
      <main className={`flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden ${!isDesktop ? 'pb-16' : ''}`}>
        {view === 'chat' && activeSession ? (
          <ChatWindow 
            key={activeSession.id} 
            session={activeSession} 
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
          />
        ) : view === 'library' ? (
          <LibraryView sessions={sessions} onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} />
        ) : view === 'about' ? (
           <AboutPage onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
             <button onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} className="p-2 mb-4 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Icon icon={MenuIcon} className="w-8 h-8"/>
              </button>
             Select a chat or start a new one.
          </div>
        )}
      </main>
      {!isDesktop && (
        <BottomNavBar
            onNewChat={handleNewChat}
            onShowLibrary={handleShowLibrary}
            onToggleHistory={() => setIsHistoryPanelOpen(true)}
            activeView={view}
        />
       )}
    </div>
  );
};

export default MainLayout;