
import { Message, SearchResultContent } from '../types';
import { callApiFunction } from './api';

export const generateChatResponse = async (history: Message[]): Promise<string> => {
    const data = await callApiFunction('chat', { history });
    if (data.text) {
        return data.text;
    }
    throw new Error("Failed to get a valid chat response from the server.");
};

export const generateTitleForChat = async (firstMessage: string): Promise<string> => {
    try {
        const data = await callApiFunction('title', { message: firstMessage });
        if (data.title) {
            return data.title;
        }
        return "New Chat"; // Fallback on empty title
    } catch (error) {
        console.error("Error generating title, falling back.", error);
        return "New Chat"; // Fallback on error
    }
};

export const performWebSearch = async (prompt: string): Promise<SearchResultContent> => {
    const data = await callApiFunction('search', { prompt });
    if (data.result) {
        return data.result;
    }
    throw new Error("Failed to get valid search results from the server.");
};