import { Handler } from '@netlify/functions';

// No API key is needed for the public source.unsplash.com API.
export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { prompt } = JSON.parse(event.body || '{}');
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required.' }) };
        }

        // Clean the prompt to get keywords for the Unsplash search.
        const keywords = prompt
            .toLowerCase()
            .replace(/^(generate|create|draw|image of|picture of|icon of|logo of)\s+/, '') // Remove command words.
            .replace(/\s+/g, ',') // Replace spaces with commas for better search results.
            .trim();

        const unsplashUrl = `https://source.unsplash.com/1024x768/?${keywords}`;
        
        // Fetch the URL. The `fetch` response object will contain the final URL after redirection.
        const response = await fetch(unsplashUrl);
        
        // The final image URL is in the `response.url` property.
        // A successful fetch will result in a URL from images.unsplash.com.
        if (!response.ok || !response.url.startsWith('https://images.unsplash.com')) {
             throw new Error('Could not fetch an image from Unsplash. The topic might be too specific or there was a network issue.');
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: response.url }), // Return the final, direct image URL.
        };

    } catch (error) {
        console.error("Error in generate-image function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Server error: ${errorMessage}` }),
        };
    }
};
