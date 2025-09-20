
import React, { useState, useEffect, useCallback, useRef } from 'react';
import HistoryPanel from './HistoryPanel';
import ChatWindow from '../chat/ChatWindow';
import LibraryView from '../library/LibraryView';
import AboutPage from '../about/AboutPage';
import { ChatSession, Message, MessageSender, MessageContent } from '../../types';
import { getChatSessionMetadatas, saveChatSession, getChatSession, getAllChatSessions } from '../../services/storageService';
import Icon, { MenuIcon } from '../common/Icon';
import { generateChatResponse, generateTitleForChat, performWebSearch } from '../../services/geminiService';
import { generateImage } from '../../services/imageService';
import BottomNavBar from './BottomNavBar';
import { resizeImageFromDataUrl } from '../../utils/imageUtils';

const ACTIVE_SESSION_ID_KEY = 'stefan_gpt_active_session_id';

type ViewType = 'chat' | 'library' | 'about';
type SessionMeta = Pick<ChatSession, 'id' | 'title' | 'createdAt'>;

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
  const [sessionMetas, setSessionMetas] = useState<SessionMeta[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [librarySessions, setLibrarySessions] = useState<ChatSession[] | null>(null);
  const [view, setView] = useState<ViewType>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false); // Default to closed on mobile
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const abortControllerRef = useRef<AbortController | null>(null);

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
    saveChatSession(newSession);
    setSessionMetas(prev => [{id: newSession.id, title: newSession.title, createdAt: newSession.createdAt}, ...prev]);
    setActiveSession(newSession);
    sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id);
    setView('chat');
    if (!isDesktop) setIsHistoryPanelOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    const loadedMetas = getChatSessionMetadatas();
    setSessionMetas(loadedMetas);
    const lastActiveId = sessionStorage.getItem(ACTIVE_SESSION_ID_KEY);
    
    if (lastActiveId && loadedMetas.some(s => s.id === lastActiveId)) {
        const session = getChatSession(lastActiveId);
        if (session) {
            setActiveSession(session);
            setView('chat');
        } else { // Handle case where session ID is invalid/deleted
             sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
             if (loadedMetas.length > 0) {
                const mostRecentSession = getChatSession(loadedMetas[0].id);
                setActiveSession(mostRecentSession || null);
             } else {
                 handleNewChat();
             }
        }
    } else if (loadedMetas.length > 0) {
        const mostRecentSessionId = loadedMetas[0].id;
        setActiveSession(getChatSession(mostRecentSessionId) || null);
        sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, mostRecentSessionId);
        setView('chat');
    } else {
        handleNewChat();
    }
  }, [handleNewChat]);

  useEffect(() => {
      if (view === 'library' && librarySessions === null) {
          // Load all sessions for the library view when it's opened
          setLibrarySessions(getAllChatSessions());
      } else if (view !== 'library' && librarySessions !== null) {
          // Unload sessions when leaving library view to free up memory
          setLibrarySessions(null);
      }
  }, [view, librarySessions]);


  const handleSessionUpdate = useCallback((updatedSession: ChatSession) => {
    // Update active session in state
    setActiveSession(updatedSession);
    
    // Persist change to storage
    saveChatSession(updatedSession);

    // Update the metadata list in state
    setSessionMetas(currentMetas => {
        const metaIndex = currentMetas.findIndex(m => m.id === updatedSession.id);
        const newMeta = { id: updatedSession.id, title: updatedSession.title, createdAt: updatedSession.createdAt };
        let newMetas;
        if (metaIndex > -1) {
            newMetas = [...currentMetas];
            newMetas[metaIndex] = newMeta;
        } else {
            newMetas = [newMeta, ...currentMetas];
        }
        // Ensure updated session is at the top
        return [newMeta, ...newMetas.filter(m => m.id !== updatedSession.id)];
    });
  }, []);

  const handleSelectSession = (id: string) => {
    const session = getChatSession(id);
    if (session) {
      setActiveSession(session);
      sessionStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
      setView('chat');
      if (!isDesktop) setIsHistoryPanelOpen(false);
    }
  };

  const handleShowLibrary = () => {
      setView('library');
      setActiveSession(null);
      sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      if (!isDesktop) setIsHistoryPanelOpen(false);
  };

  const handleShowAbout = () => {
      setView('about');
      setActiveSession(null);
      sessionStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      if (!isDesktop) setIsHistoryPanelOpen(false);
  };
  
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
    }
  };

  const handleSendMessage = async (prompt: string, attachments?: { dataUrl: string; mimeType: string }[]) => {
    if (!activeSession) return;
    
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
    setIsLoading(true);
    
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
                    const searchContent = await performWebSearch(searchPrompt, signal);
                    aiMessages.push({ id: (Date.now() + 1).toString(), sender: MessageSender.AI, content: searchContent });
                    commandMatched = true;
                    break;
                }
            }
            if (!commandMatched) {
                for (const prefix of imagePrefixes) {
                    if (lowercasedInput.startsWith(prefix + ' ')) {
                        const imagePrompt = prompt.substring(prefix.length + 1).trim();
                        let imageUrl = await generateImage(imagePrompt, signal);
                        try {
                            imageUrl = await resizeImageFromDataUrl(imageUrl);
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
            const responseText = await generateChatResponse(sessionWithUserMessage.messages, signal);
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
                    const newTitle = await generateTitleForChat(prompt, titleAbortController.signal);
                    const sessionToUpdate = getChatSession(sessionWithUserMessage.id);
                    if (sessionToUpdate) {
                       handleSessionUpdate({ ...sessionToUpdate, title: newTitle });
                    }
                } catch (error) {
                    if ((error as Error).name !== 'AbortError') {
                       console.error("Title generation failed:", error);
                    }
                }
            })();
        }

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
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
        abortControllerRef.current = null;
    }
  };
  
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
        group shrink-0 transition-all duration-300 ease-in-out
        md:w-20 md:hover:w-64 md:relative fixed z-30
        ${isHistoryPanelOpen ? 'translate-x-0 w-4/5 sm:w-80' : '-translate-x-full w-4/5 sm:w-80 md:w-20'}
      `}>
        <HistoryPanel
            sessions={sessionMetas}
            activeSessionId={activeSession?.id ?? null}
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
            onCancelGeneration={handleCancelGeneration}
            onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
          />
        ) : view === 'library' ? (
          <LibraryView sessions={librarySessions} onToggleHistory={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)} />
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