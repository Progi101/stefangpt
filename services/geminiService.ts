import { Message, SearchResultContent } from '../types';

const callGeminiApi = async (type: string, payload: any, signal: AbortSignal) => {
    try {
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload }),
            signal, // Pass the signal to the fetch request
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API call failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error in ${type} API call:`, error);
        if (error instanceof Error) {
            // Don't throw a new error for aborts, let the caller handle it.
            if (error.name === 'AbortError') {
                throw error;
            }
            throw new Error(`Failed to get a response from the AI: ${error.message}`);
        }
        throw new Error('An unknown error occurred while contacting the AI.');
    }
};

export const generateChatResponse = async (messages: Message[], signal: AbortSignal): Promise<string> => {
    const data = await callGeminiApi('chat', { messages }, signal);
    return data.text;
};

export const generateTitleForChat = async (prompt: string, signal: AbortSignal): Promise<string> => {
    const data = await callGeminiApi('title', { prompt }, signal);
    return data.title;
};

export const performWebSearch = async (prompt: string, signal: AbortSignal): Promise<SearchResultContent> => {
    const data = await callGeminiApi('search', { prompt }, signal);
    return data.result;
};