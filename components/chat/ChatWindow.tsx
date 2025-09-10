// FIX: Corrected typo in React hooks import statement.
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ChatSession, Message, MessageSender, MessageContent, CodeFile, FilesContent, UserQueryContent } from '../../types';
import Icon, { SendIcon, UserIcon, DownloadIcon, MenuIcon, ClipboardDocumentIcon, CheckIcon, FolderIcon, DocumentIcon, XIcon, PaperclipIcon, StopIcon } from '../common/Icon';

declare const marked: any;
declare const hljs: any;

const CodeCopyButton: React.FC<{ content: string }> = ({ content }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <button onClick={handleCopy} className="code-copy-button">
            {isCopied ? <Icon icon={CheckIcon} className="w-4 h-4" /> : <Icon icon={ClipboardDocumentIcon} className="w-4 h-4" />}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
    );
};

const FileGroupDisplay: React.FC<{ content: FilesContent, onOpenFile: (file: CodeFile) => void }> = ({ content, onOpenFile }) => {
    return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Icon icon={FolderIcon} className="w-5 h-5"/>
                <span>{content.title || 'Project Files'}</span>
            </div>
            <div className="space-y-1">
                {content.files.map(file => (
                    <button 
                        key={file.filename}
                        onClick={() => onOpenFile(file)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Icon icon={DocumentIcon} className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0"/>
                        <span className="text-sm truncate text-gray-800 dark:text-gray-200">{file.filename}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const CodeSidePanel: React.FC<{ file: CodeFile, onClose: () => void }> = ({ file, onClose }) => {
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current && typeof hljs !== 'undefined') {
            hljs.highlightElement(codeRef.current);
        }
    }, [file.content]);

    return (
        <aside className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
            <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 truncate">
                    <Icon icon={DocumentIcon} className="w-5 h-5 shrink-0"/>
                    <span className="font-semibold truncate">{file.filename}</span>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <Icon icon={XIcon} className="w-5 h-5" />
                </button>
            </header>
            <div className="flex-1 relative overflow-auto">
                <div className="p-4">
                    <div className="code-block-wrapper">
                         <CodeCopyButton content={file.content} />
                         <pre className="!m-0"><code ref={codeRef} className={`text-sm md:text-base leading-relaxed language-${file.language || file.filename.split('.').pop()}`}>{file.content}</code></pre>
                    </div>
                </div>
            </div>
        </aside>
    );
};


interface ChatMessageProps {
    message: Message;
    onOpenFile: (file: CodeFile) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOpenFile }) => {
    const isUser = message.sender === MessageSender.USER;
    const content = message.content;
    const messageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Safety checks to prevent crashes
        if (!messageRef.current || !messageRef.current.isConnected) return;
        if (content.type !== 'text' && content.type !== 'search') return;

        const roots: any[] = [];
        const preElements = messageRef.current.querySelectorAll('pre');
        preElements.forEach(pre => {
            if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

            const code = pre.querySelector('code');
            if (!code) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            pre.parentElement?.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const buttonContainer = document.createElement('div');
            wrapper.appendChild(buttonContainer);
            const root = ReactDOM.createRoot(buttonContainer);
            root.render(<CodeCopyButton content={code.innerText} />);
            roots.push(root);
            
            if (typeof hljs !== 'undefined') {
                 hljs.highlightElement(code as HTMLElement);
            }
        });
        
        // Cleanup function to unmount all the dynamically created React roots.
        // This prevents errors when the component re-renders or unmounts.
        return () => {
            roots.forEach(root => root.unmount());
        };
    }, [content]);

    const handleDownload = async (imageUrl: string, prompt: string) => {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Network response was not ok.');
            const blob = await response.blob();
    
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
            link.download = `stefangpt-${filename || 'image'}.png`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
    
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(imageUrl, '_blank');
        }
    };

    const renderContent = () => {
        const parts: { type: string, node: React.ReactNode, id: string }[] = [];
        
        if (content.type === 'files') {
            parts.push({ type: 'files', id: 'files', node: <FileGroupDisplay content={content} onOpenFile={onOpenFile} />});
        }
        
        const otherContent = () => {
            switch (content.type) {
                case 'user-query':
                    return (
                        <div className="space-y-3">
                            {content.imageUrls.length > 0 && (
                                <div className={`grid gap-2 grid-cols-1 ${content.imageUrls.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                                    {content.imageUrls.map((url, index) => (
                                        <img 
                                            key={index} 
                                            src={url} 
                                            alt={`User upload ${index + 1}`} 
                                            className="rounded-lg w-full h-auto object-cover max-w-full"
                                        />
                                    ))}
                                </div>
                            )}
                            {content.text && <div className="markdown-content text-base" dangerouslySetInnerHTML={{ __html: content.text.replace(/\n/g, '<br/>') }}></div>}
                        </div>
                    );
                case 'image':
                    return (
                        <div className="group relative">
                            <p className="italic text-gray-300 dark:text-gray-400 mb-2">Prompt: "{content.prompt}"</p>
                            <img src={content.imageUrl} alt={content.prompt} className="rounded-lg max-w-sm" />
                            <button onClick={() => handleDownload(content.imageUrl, content.prompt)} className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <Icon icon={DownloadIcon} className="w-5 h-5" />
                            </button>
                        </div>
                    );
                case 'search':
                    return (
                        <div ref={messageRef}>
                            <div className="whitespace-pre-wrap markdown-content" dangerouslySetInnerHTML={{ __html: typeof marked !== 'undefined' ? marked.parse(content.text, { breaks: true, gfm: true }) : content.text.replace(/\n/g, '<br/>') }}></div>
                            {content.citations.length > 0 && (
                                <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Sources:</h4>
                                    <ul className="space-y-1">
                                        {content.citations.map((cite, index) => (
                                            <li key={index} className="text-xs">
                                                <a href={cite.uri} target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:underline truncate">
                                                    [{index + 1}] {cite.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                case 'text':
                    const html = typeof marked !== 'undefined' ? marked.parse(content.text, { breaks: true, gfm: true }) : content.text.replace(/\n/g, '<br/>');
                    return <div ref={messageRef} className={`markdown-content ${isUser ? 'text-base' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
                default:
                     return null;
            }
        };

        if (content.type !== 'files') {
            parts.push({ type: 'other', id: 'other', node: otherContent() });
        }

        return (
            <div className="space-y-3">
                {parts.map(part => <div key={part.id}>{part.node}</div>)}
            </div>
        );
    };
    
    const isFiles = message.content.type === 'files';
    const bubbleMaxWidth = isFiles ? 'max-w-md' : (isUser ? 'max-w-xl' : 'max-w-2xl');

    return (
        <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
            
            <div className={`rounded-lg px-4 py-3 ${isUser ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'} ${bubbleMaxWidth}`}>
                {renderContent()}
            </div>
             {isUser && (
                <Icon icon={UserIcon} className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 p-1 flex-shrink-0" />
            )}
        </div>
    );
};

const resizeImage = (file: File): Promise<{ dataUrl: string; mimeType: string; }> => {
    const MAX_DIMENSION = 1024; // Resize images to be max 1024px on their largest side
    const QUALITY = 0.9; // Use 90% JPEG quality for smaller file size

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error("FileReader did not return a result."));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const { width, height } = img;

                // If the image is already small enough, no need to resize.
                if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
                    return resolve({ dataUrl: img.src, mimeType: file.type });
                }

                let newWidth, newHeight;
                if (width > height) {
                    newWidth = MAX_DIMENSION;
                    newHeight = Math.round((height * MAX_DIMENSION) / width);
                } else {
                    newHeight = MAX_DIMENSION;
                    newWidth = Math.round((width * MAX_DIMENSION) / height);
                }

                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get 2D canvas context'));
                }
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Forcing JPEG often results in a smaller file size than PNG for photos.
                const mimeType = 'image/jpeg';
                const dataUrl = canvas.toDataURL(mimeType, QUALITY);

                resolve({ dataUrl, mimeType });
            };
            img.onerror = (err) => reject(new Error(`Image loading failed.`));
        };
        reader.onerror = (err) => reject(new Error(`FileReader failed.`));
    });
};

interface ChatWindowProps {
    session: ChatSession;
    isLoading: boolean;
    onSendMessage: (prompt: string, attachments?: { dataUrl: string; mimeType: string; }[]) => Promise<void>;
    onCancelGeneration: () => void;
    onToggleHistory: () => void;
}

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

const ChatWindow: React.FC<ChatWindowProps> = ({ session, isLoading, onSendMessage, onCancelGeneration, onToggleHistory }) => {
  const [input, setInput] = useState('');
  const [sidePanelFile, setSidePanelFile] = useState<CodeFile | null>(null);
  const [panelWidth, setPanelWidth] = useState(450);
  const [attachments, setAttachments] = useState<{ file: File; dataUrl: string; mimeType: string; }[]>([]);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const prevIsLoadingRef = useRef<boolean>(isLoading);
  
  const MAX_TOTAL_SIZE_MB = 5.5;
  const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const lastMessage = session.messages[session.messages.length - 1];
    const wasLoading = prevIsLoadingRef.current;
    
    // Scroll down when user sends a message or when loading starts for the first time.
    // This prevents scrolling when the AI response arrives.
    if (lastMessage?.sender === MessageSender.USER || (isLoading && !wasLoading)) {
        scrollToBottom();
    }
    
    prevIsLoadingRef.current = isLoading;
  }, [session.messages, isLoading]);


  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 320 && newWidth < window.innerWidth * 0.8) {
            setPanelWidth(newWidth);
        }
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const files = e.target.files;
    if (files && files.length > 0) {
      const currentSize = attachments.reduce((sum, att) => sum + att.file.size, 0);
      const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      const newSize = newFiles.reduce((sum, file) => sum + file.size, 0);

      if (currentSize + newSize > MAX_TOTAL_SIZE_BYTES) {
        setUploadError(`Total file size cannot exceed ${MAX_TOTAL_SIZE_MB}MB.`);
        if (e.target) e.target.value = '';
        return;
      }
      
      try {
        const newAttachmentsPromises = newFiles.map(async file => {
          const { dataUrl, mimeType } = await resizeImage(file);
          return { file, dataUrl, mimeType };
        });

        const newAttachments = await Promise.all(newAttachmentsPromises);
        setAttachments(prev => [...prev, ...newAttachments]);
      } catch (error) {
          console.error("Error processing image:", error);
          setUploadError(error instanceof Error ? error.message : "There was an error processing an image file.");
      }
    }
    if (e.target) e.target.value = '';
  };
  
  const handleRemoveAttachment = (index: number) => {
    setUploadError('');
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocalSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedInput = input.trim();
    if ((!trimmedInput && attachments.length === 0) || isLoading) return;

    setInput('');
    setAttachments([]);
    setUploadError('');
    await onSendMessage(trimmedInput, attachments);
  };

  const renderMessageNode = (message: Message) => {
    return <ChatMessage key={message.id} message={message} onOpenFile={setSidePanelFile} />;
  };


  return (
    <div className="flex h-full relative overflow-hidden">
        <div className="flex flex-col h-full flex-1 min-w-0">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center shrink-0">
                <button onClick={onToggleHistory} className="p-2 -ml-2 mr-2 text-gray-500 dark:text-gray-400">
                    <Icon icon={MenuIcon} className="w-6 h-6"/>
                </button>
                <h2 className="text-xl font-semibold truncate">{session.title}</h2>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="p-3 mb-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold">Quick Commands:</p>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">BETA</span>
                        </div>
                        <p><strong className="font-medium text-gray-800 dark:text-gray-100">For Images:</strong> <code className="text-xs bg-gray-200 dark:bg-gray-800 p-1 rounded">generate</code>, <code className="text-xs bg-gray-200 dark:bg-gray-800 p-1 rounded">create</code>, <code className="text-xs bg-gray-200 dark:bg-gray-800 p-1 rounded">draw</code>, <code className="text-xs bg-gray-200 dark:bg-gray-800 p-1 rounded">image of</code>, <code className="text-xs bg-gray-200 dark:bg-gray-800 p-1 rounded">picture of</code></p>
                        <p className="mt-1"><strong className="font-medium text-gray-800 dark:text-gray-100">For Searches:</strong> <code className="text-xs bg-gray-200 dark:bg-gray-800 p-1 rounded">search</code>, <code className="text-xs bg-gray-200 dark:bg-gray-800 p-1 rounded">find</code>, <code className="text-xs bg-gray-200 dark:bg-gray-800 p-1 rounded">google</code></p>
                    </div>

                    <div className="space-y-6">
                        {session.messages.map(renderMessageNode)}
                        {isLoading && (
                            <div className="flex items-start gap-4">
                                <div className="max-w-xl px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                <div className="max-w-4xl mx-auto">
                    {uploadError && <p className="text-sm text-red-500 mb-2 text-center">{uploadError}</p>}
                    {attachments.length > 0 && (
                        <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                            <div className="flex space-x-2 overflow-x-auto">
                                {attachments.map((att, index) => (
                                    <div key={index} className="relative flex-shrink-0">
                                        <img src={att.dataUrl} className="w-20 h-20 object-cover rounded-md" alt="Attachment preview"/>
                                        <button 
                                            onClick={() => handleRemoveAttachment(index)} 
                                            className="absolute -top-1 -right-1 p-0.5 bg-gray-800 text-white rounded-full"
                                            aria-label="Remove attachment"
                                        >
                                            <Icon icon={XIcon} className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleLocalSendMessage} className="relative">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleAttachmentChange}
                            accept="image/*"
                            multiple
                            className="hidden"
                        />
                         <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-not-allowed"
                            aria-label="Attach file"
                        >
                            <Icon icon={PaperclipIcon} className="w-5 h-5" />
                        </button>
                        <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleLocalSendMessage();
                            }
                        }}
                        placeholder="Message StefanGPT..."
                        rows={1}
                        className="w-full px-12 py-3 pr-12 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                        disabled={isLoading}
                        />
                        {isLoading ? (
                            <button type="button" onClick={onCancelGeneration} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors" aria-label="Stop generation">
                                <Icon icon={StopIcon} className="w-5 h-5" />
                            </button>
                        ) : (
                            <button type="submit" disabled={!input.trim() && attachments.length === 0} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-700 text-white disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors" aria-label="Send message">
                                <Icon icon={SendIcon} className="w-5 h-5" />
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
        {sidePanelFile && (
            isDesktop ? (
                <>
                    <div 
                        className="w-2 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 transition-colors shrink-0"
                        onMouseDown={handleMouseDown}
                        aria-label="Resize code panel"
                        role="separator"
                    />
                    <div style={{ width: `${panelWidth}px` }} className="shrink-0 overflow-hidden">
                        <CodeSidePanel key={sidePanelFile.filename} file={sidePanelFile} onClose={() => setSidePanelFile(null)} />
                    </div>
                </>
            ) : (
                <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50">
                    <CodeSidePanel file={sidePanelFile} onClose={() => setSidePanelFile(null)} />
                </div>
            )
        )}
    </div>
  );
};

export default ChatWindow;