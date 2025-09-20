
import React, { useState, useRef, useCallback } from 'react';
import Icon, { MenuIcon, SparklesIcon, DownloadIcon, ClipboardDocumentIcon } from '../common/Icon';
import { generateImage } from '../../services/imageService';

interface ImageGeneratorPageProps {
    onToggleHistory: () => void;
}

const stylePresets = [
    { name: 'Cinematic', keywords: 'cinematic, 8k, detailed, movie still, sharp focus' },
    { name: 'Photorealistic', keywords: 'photorealistic, ultra-detailed, 4k, professional photography' },
    { name: 'Anime', keywords: 'anime style, vibrant, detailed, studio ghibli inspired' },
    { name: 'Fantasy Art', keywords: 'fantasy art, epic, detailed, concept art, matte painting' },
    { name: 'Watercolor', keywords: 'watercolor painting, soft, vibrant colors, artistic' },
    { name: 'Low Poly', keywords: 'low poly, isometric, 3d render, vibrant colors' },
];

const ImageGeneratorPage: React.FC<ImageGeneratorPageProps> = ({ onToggleHistory }) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt to generate an image.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        
        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        try {
            const imageUrl = await generateImage(prompt, negativePrompt, signal);
            setGeneratedImage(imageUrl);
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.error("Image generation failed:", err);
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };
    
    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };
    
    const handleAddStyle = (keywords: string) => {
        setPrompt(prev => {
            const separator = prev.trim().length > 0 && !prev.trim().endsWith(',') ? ', ' : '';
            return `${prev.trim()}${separator}${keywords}`;
        });
    };

    const handleDownload = async () => {
        if (!generatedImage) return;
        try {
            const response = await fetch(generatedImage);
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
            window.open(generatedImage, '_blank');
        }
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(prompt);
    };

    return (
        <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center shrink-0 bg-white dark:bg-gray-800/50">
                <button onClick={onToggleHistory} className="p-2 -ml-2 mr-2 text-gray-500 dark:text-gray-400 md:hidden">
                    <Icon icon={MenuIcon} className="w-6 h-6"/>
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Image Studio</h2>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Control Panel */}
                <aside className="w-full md:w-96 p-6 flex flex-col gap-6 overflow-y-auto bg-white dark:bg-gray-800 border-r-0 md:border-r border-gray-200 dark:border-gray-700">
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prompt</label>
                        <textarea
                            id="prompt"
                            rows={5}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="A majestic lion in a futuristic city, cinematic lighting..."
                            className="w-full p-2 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                        />
                    </div>
                     <div>
                        <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Negative Prompt</label>
                        <textarea
                            id="negative-prompt"
                            rows={3}
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="blurry, text, watermark, ugly..."
                            className="w-full p-2 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style Presets</label>
                        <div className="grid grid-cols-2 gap-2">
                            {stylePresets.map(style => (
                                <button key={style.name} onClick={() => handleAddStyle(style.keywords)} className="p-2 text-sm text-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">
                                    {style.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto pt-6">
                        {isLoading ? (
                             <button onClick={handleCancel} className="w-full flex items-center justify-center px-4 py-3 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none transition-colors">
                                Cancel
                            </button>
                        ) : (
                             <button onClick={handleGenerate} disabled={!prompt.trim()} className="w-full flex items-center justify-center px-4 py-3 font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-800 focus:outline-none disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                                <Icon icon={SparklesIcon} className="w-5 h-5 mr-2" />
                                Generate
                            </button>
                        )}
                       
                    </div>
                </aside>

                {/* Display Area */}
                <main className="flex-1 p-6 flex items-center justify-center overflow-auto">
                    <div className="w-full h-full max-w-2xl max-h-[768px] flex flex-col items-center justify-center">
                         {error && <p className="text-red-500 text-center">{error}</p>}

                         {!isLoading && !generatedImage && !error && (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <Icon icon={SparklesIcon} className="w-16 h-16 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold">Your generated image will appear here</h3>
                                <p className="mt-1">Enter a prompt and click "Generate" to start.</p>
                            </div>
                         )}

                         {isLoading && (
                            <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                         )}

                         {generatedImage && (
                            <div className='flex flex-col items-center gap-4'>
                                <img src={generatedImage} alt={prompt} className="rounded-lg shadow-lg object-contain max-w-full max-h-[calc(100vh-200px)] md:max-h-[600px]" />
                                <div className='flex items-center gap-3'>
                                    <button onClick={handleDownload} className='flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md'>
                                        <Icon icon={DownloadIcon} className="w-4 h-4" />
                                        Download
                                    </button>
                                     <button onClick={handleCopyPrompt} className='flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md'>
                                        <Icon icon={ClipboardDocumentIcon} className="w-4 h-4" />
                                        Copy Prompt
                                    </button>
                                </div>
                            </div>
                         )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ImageGeneratorPage;
