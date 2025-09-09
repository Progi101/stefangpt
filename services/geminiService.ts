import { Message, SearchResultContent } from '../types';

const callGeminiApi = async (type: string, payload: any) => {
    try {
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API call failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error in ${type} API call:`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to get a response from the AI: ${error.message}`);
        }
        throw new Error('An unknown error occurred while contacting the AI.');
    }
};

export const generateChatResponse = async (messages: Message[]): Promise<string> => {
    const data = await callGeminiApi('chat', { messages });
    return data.text;
};

export const generateTitleForChat = async (prompt: string): Promise<string> => {
    const data = await callGeminiApi('title', { prompt });
    return data.title;
};

export const performWebSearch = async (prompt: string): Promise<SearchResultContent> => {
    const data = await callGeminiApi('search', { prompt });
    return data.result;
};
