import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Message, MessageSender, CodeFile, FilesContent } from '../../types';
import Icon, { UserIcon, DownloadIcon, ClipboardDocumentIcon, CheckIcon, FolderIcon, DocumentIcon, XIcon } from '../common/Icon';
import { marked } from 'marked';

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

export const CodeSidePanel: React.FC<{ file: CodeFile, onClose: () => void }> = ({ file, onClose }) => {
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
        if (!messageRef.current || !messageRef.current.isConnected) return;
        if (content.type !== 'text' && content.type !== 'search' && content.type !== 'user-query') return;

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
        switch (content.type) {
            case 'files':
                return <FileGroupDisplay content={content} onOpenFile={onOpenFile} />;
            case 'user-query':
                return (
                    <div className="space-y-3" ref={messageRef}>
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
                        {content.text && <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(content.text, { breaks: true, gfm: true }) }}></div>}
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
                        <div className="whitespace-pre-wrap markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(content.text, { breaks: true, gfm: true }) }}></div>
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
                const html = marked.parse(content.text, { breaks: true, gfm: true });
                return <div ref={messageRef} className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
            default:
                 return null;
        }
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

export default ChatMessage;