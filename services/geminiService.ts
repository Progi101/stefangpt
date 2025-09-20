import { Message, SearchResultContent } from '../types';
import { AiModel } from '../components/layout/MainLayout';

const callGeminiApi = async (type: string, payload: any, signal: AbortSignal) => {
    try {
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload }),
            signal, // Pass the signal to the fetch request
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage;
            try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error;
            } catch (e) {
                errorMessage = errorBody;
            }
            throw new Error(errorMessage || `API call failed with status ${response.status}`);
        }

        const responseText = await response.text();
        if (!responseText) {
            // This can happen if the Netlify function times out but still returns a 200 OK
            throw new Error("Received an empty response from the server.");
        }
        
        try {
            return JSON.parse(responseText);
        } catch(e) {
            // The function returned a success code but the body wasn't valid JSON
            console.error("JSON parsing error for response:", responseText);
            throw new Error("Received an invalid (non-JSON) response from the AI.");
        }

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

export const generateChatResponse = async (messages: Message[], model: AiModel, signal: AbortSignal): Promise<string> => {
    const data = await callGeminiApi('chat', { messages, model }, signal);
    return data.text;
};

export const generateTitleForChat = async (prompt: string, model: AiModel, signal: AbortSignal): Promise<string> => {
    const data = await callGeminiApi('title', { prompt, model }, signal);
    return data.title;
};

export const performWebSearch = async (prompt: string, model: AiModel, signal: AbortSignal): Promise<SearchResultContent> => {
    const data = await callGeminiApi('search', { prompt, model }, signal);
    return data.result;
};