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
            let errorText;
            try {
                // Try to parse a JSON error response first
                const errorData = await response.json();
                errorText = errorData.error;
            } catch (e) {
                // If that fails, the error is likely plain text (e.g., from a gateway)
                errorText = await response.text();
            }
            throw new Error(errorText || `API call failed with status ${response.status}`);
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