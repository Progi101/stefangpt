

import React, { useState, useEffect, useCallback, useRef } from 'react';
import HistoryPanel from './HistoryPanel';
import ChatWindow from '../chat/ChatWindow';
import LibraryView from '../library/LibraryView';
import AboutPage from '../about/AboutPage';
import { ChatSession, Message, MessageSender, MessageContent } from '../../types';
import { getChatSessions, saveChatSessions } from '../../services/storageService';
import Icon, { MenuIcon } from '../common/Icon';
import { generateChatResponse, generateTitleForChat, performWebSearch } from '../../services/geminiService';
import { generateImage } from '../../services/imageService';
import BottomNavBar from './BottomNavBar';
import { resizeImageFromDataUrl } from '../../utils/imageUtils';

const ACTIVE_SESSION_ID_KEY = 'stefan_gpt_active_session_id';
const SELECTED_MODEL_KEY = 'stefan_gpt_model';

type ViewType = 'chat' | 'library' | 'about';
export type AiModel = 'beta' | 'nerd';

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
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedModel, setSelectedModel] = useState<AiModel>(() => 
    (localStorage.getItem(SELECTED_MODEL_KEY) as AiModel) || 'beta'
  );

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

  const handleModelChange = (model: AiModel) => {
      setSelectedModel(model);
      localStorage.setItem(SELECTED_MODEL_KEY, model);

      if (activeSessionId) {
        const activeSession = sessions.find(s => s.id === activeSessionId);
        if (activeSession) {
            const modelName = model === 'beta' ? 'StefanGPT Beta' : 'nerd';
            const notificationMessage: Message = {
                id: `${Date.now()}-system-notification`,
                sender: MessageSender.AI,
                content: {
                    type: 'text',
                    text: `*You have switched to ${modelName}.*`
                },
            };
            const updatedSession = {
                ...activeSession,
                messages: [...activeSession.messages, notificationMessage],
            };
            handleSessionUpdate(updatedSession);
        }
    }
  };

  useEffect(() => {
    if (isDesktop) {
        setIsHistoryPanelOpen(false); // Ensure mobile panel is closed when switching to desktop view
    }
  }, [isDesktop]);


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
    if (!isDesktop) {
      setIsHistoryPanelOpen(false);
    }
  }, [isDesktop]);

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


  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
    setView('chat');
    if (!isDesktop) {
      setIsHistoryPanelOpen(false);
    }
  };

  const handleShowLibrary = () => {
      setView('library');
      setActiveSessionId(null);
      sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      if (!isDesktop) {
        setIsHistoryPanelOpen(false);
      }
  };

  const handleShowAbout = () => {
      setView('about');
      setActiveSessionId(null);
      sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      if (!isDesktop) {
        setIsHistoryPanelOpen(false);
      }
  };
  
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleSendMessage = async (prompt: string, attachments?: { dataUrl: string; mimeType: string }[]) => {
    if (!activeSessionId) return;

    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;
    
    const getThinkingMessage = (prompt: string): string => {
        const p = prompt.toLowerCase();
        if (p.startsWith('generate ') || p.startsWith('create ') || p.startsWith('draw ') || p.startsWith('image of')) return "Painting with pixels...";
        if (p.includes('code') || p.includes('script') || p.includes('function') || p.includes('program')) return "Compiling the perfect solution...";
        if (p.includes('write') || p.includes('poem') || p.includes('story') || p.includes('essay')) return "Composing a masterpiece...";
        if (p.startsWith('search ') || p.startsWith('find ') || p.startsWith('google ')) return "Searching the web for answers...";
        if (p.includes('explain') || p.includes('what is') || p.includes('how does')) return "Consulting my knowledge banks...";
        const options = ["Thinking...", "Processing your request...", "Just a moment...", "Working on it..."];
        return options[Math.floor(Math.random() * options.length)];
    };

    const userMessageContent: MessageContent = (attachments && attachments.length > 0)
      ? { type: 'user-query', text: prompt, imageUrls: attachments.map(a => a.dataUrl) }
      : { type: 'text', text: prompt };

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: MessageSender.USER,
      content: userMessageContent,
    };

    const sessionWithUserMessage = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage],
    };
    handleSessionUpdate(sessionWithUserMessage);
    setLoadingMessage(getThinkingMessage(prompt));
    setIsLoading(true);
    
    // Create and store the AbortController for this specific request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    try {
        let aiMessages: Message[] = [];
        let commandMatched = false;

        if (!attachments || attachments.length === 0) {
            const lowercasedInput = prompt.toLowerCase().trim();
            const searchPrefixes = ['search', 'find', 'lookup', 'google'];
            const imagePrefixes = ['generate', 'create', 'draw', 'image of', 'picture of', 'icon of', 'logo of'];

            for (const prefix of searchPrefixes) {
                if (lowercasedInput.startsWith(prefix + ' ')) {
                    const searchPrompt = prompt.substring(prefix.length + 1).trim();
                    const searchContent = await performWebSearch(searchPrompt, selectedModel, signal);
                    aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: searchContent });
                    commandMatched = true;
                    break;
                }
            }
            if (!commandMatched) {
                for (const prefix of imagePrefixes) {
                    if (lowercasedInput.startsWith(prefix + ' ')) {
                        const imagePrompt = prompt.substring(prefix.length + 1).trim();
                        let imageUrl = await generateImage(imagePrompt, selectedModel, signal);

                        try {
                            const resizedDataUrl = await resizeImageFromDataUrl(imageUrl);
                            imageUrl = resizedDataUrl;
                        } catch (resizeError) {
                            console.warn("Could not resize AI-generated image, using original.", resizeError);
                        }

                        aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'image', imageUrl, prompt: imagePrompt } });
                        commandMatched = true;
                        break;
                    }
                }
            }
        }
        
        if (!commandMatched) {
            const responseText = await generateChatResponse(sessionWithUserMessage.messages, selectedModel, signal);
            const fileBlockRegex = /```json-files\s*([\s\S]*?)\s*```/s;
            const match = responseText.match(fileBlockRegex);

            if (match && match[1]) {
                try {
                    const explanationText = responseText.replace(fileBlockRegex, '').trim();
                    const filesJson = JSON.parse(match[1]);
                    if (Array.isArray(filesJson) && filesJson.length > 0 && filesJson.every(f => 'filename' in f && 'content' in f)) {
                        aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'files', files: filesJson } });
                        if (explanationText) {
                             aiMessages.push({ id: (Date.now() + 2).toString(), sender: MessageSender.AI, content: { type: 'text', text: explanationText } });
                        }
                    } else {
                         aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'text', text: responseText } });
                    }
                } catch (e) {
                     aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'text', text: responseText } });
                }
            } else {
                 aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: { type: 'text', text: responseText } });
            }
        }
        
        const sessionAfterAI = {
            ...sessionWithUserMessage,
            messages: [...sessionWithUserMessage.messages, ...aiMessages],
        };
        handleSessionUpdate(sessionAfterAI);

        if (sessionWithUserMessage.messages.length <= 2 && sessionWithUserMessage.title === 'New Chat') {
            (async () => {
                const titleAbortController = new AbortController();
                try {
                    const newTitle = await generateTitleForChat(prompt, selectedModel, titleAbortController.signal);
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
                    if ((error as Error).name !== 'AbortError') {
                       console.error("Title generation failed:", error);
                    }
                }
            })();
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log("Request was cancelled by the user.");
            // Don't show an error message in the chat for user-initiated cancellations.
            // The loading state is already handled by the cancel handler and finally block.
            return;
        }

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
        setLoadingMessage('');
        abortControllerRef.current = null;
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
          group
          fixed md:relative h-full shrink-0 z-30
          w-4/5 sm:w-80 
          bg-slate-100 dark:bg-slate-900
          transition-all duration-300 ease-in-out
          md:w-14 md:hover:w-64
          ${isHistoryPanelOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
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
            loadingMessage={loadingMessage}
            onSendMessage={handleSendMessage}
            onCancelGeneration={handleCancelGeneration}
            onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        ) : view === 'library' ? (
          <LibraryView sessions={sessions} onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} />
        ) : view === 'about' ? (
           <AboutPage onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
             <button onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} className="p-2 mb-4 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden">
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