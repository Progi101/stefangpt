import React, { useState, useRef, useEffect } from 'react';
import Icon, { CheckIcon, ChevronDownIcon } from '../common/Icon';
import { AiModel } from '../layout/MainLayout';

interface ModelSwitcherProps {
    selectedModel: AiModel;
    onModelChange: (model: AiModel) => void;
}

const modelOptions: { id: AiModel, name: string, description: string }[] = [
    { id: 'beta', name: 'StefanGPT Beta', description: 'Ajutor rapid și complet' },
    { id: 'nerd', name: 'StefanGPT Nerd', description: 'Raționament, calcul matematic și programare' },
];

const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ selectedModel, onModelChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = modelOptions.find(opt => opt.id === selectedModel) || modelOptions[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (modelId: AiModel) => {
        onModelChange(modelId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                <span className="font-semibold text-gray-800 dark:text-gray-100">{selectedOption.name}</span>
                <Icon icon={ChevronDownIcon} className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10">
                    <div className="p-2">
                        <p className="px-2 pb-1 text-sm text-gray-500 dark:text-gray-400">Alege modelul</p>
                        {modelOptions.map(option => (
                            <button
                                key={option.id}
                                onClick={() => handleSelect(option.id)}
                                className={`w-full text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${selectedModel === option.id ? 'bg-gray-100 dark:bg-gray-900' : ''}`}
                            >
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{option.description}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{option.name}</p>
                                </div>
                                {selectedModel === option.id && (
                                    <Icon icon={CheckIcon} className="w-5 h-5 text-gray-800 dark:text-white" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelSwitcher;
