import { Handler } from '@netlify/functions';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const ENGINE_ID = 'stable-diffusion-xl-1024-v1-0';
const API_URL = `https://api.stability.ai/v1/generation/${ENGINE_ID}/text-to-image`;

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!STABILITY_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Stability API key is not set.' }) };
    }

    try {
        const { prompt } = JSON.parse(event.body || '{}');
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required.' }) };
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${STABILITY_API_KEY}`,
            },
            body: JSON.stringify({
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,
                height: 1024,
                width: 1024,
                samples: 1,
                steps: 30, // A good balance of quality and speed
            }),
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Stability AI Error:', errorBody);
            let errorMessage = `Stability AI API responded with status: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.message) {
                    errorMessage = errorJson.message;
                }
            } catch(e) {
                // Not a JSON error, use the default message
            }
            throw new Error(errorMessage);
        }

        const responseJSON = await response.json();
        
        if (!responseJSON.artifacts || !responseJSON.artifacts[0] || !responseJSON.artifacts[0].base64) {
             throw new Error("Invalid response structure from Stability AI. No image data found.");
        }
        
        const image = responseJSON.artifacts[0];
        const dataUrl = `data:image/png;base64,${image.base64}`;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: dataUrl }),
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
