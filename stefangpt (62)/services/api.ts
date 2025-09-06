
const getApiEndpoint = () => {
    if (typeof window !== 'undefined') {
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        // The port 8888 is the default for 'netlify dev' command
        return isDev ? 'http://localhost:8888/.netlify/functions/geminiServer' : '/.netlify/functions/geminiServer';
    }
    // Fallback for non-browser environments, though this app is client-side focused.
    return '/.netlify/functions/geminiServer';
};

const FUNCTION_ENDPOINT = getApiEndpoint();

export const callApiFunction = async (action: string, payload: object) => {
    try {
        const response = await fetch(FUNCTION_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Server responded with status ${response.status}` }));
            throw new Error(errorData.error || `An unexpected server error occurred.`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error calling function for action "${action}":`, error);
        throw error;
    }
};
