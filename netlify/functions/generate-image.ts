import { Handler } from '@netlify/functions';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
// Using the v1 REST API which uses JSON, as it's often more reliable in serverless environments than multipart/form-data.
const API_URL = "https://api.stability.ai/v1/generation/stable-diffusion-3-medium/text-to-image";

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!STABILITY_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Stability AI API key is not configured.' })
        };
    }

    try {
        const { prompt } = JSON.parse(event.body || '{}');
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required.' }) };
        }

        const body = {
            text_prompts: [{ text: prompt }],
            cfg_scale: 7,
            height: 1024,
            width: 1024,
            samples: 1,
            steps: 30,
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STABILITY_API_KEY}`,
                'Accept': 'application/json' 
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text(); 
            console.error('Stability AI API error:', errorText);
            
            let errorMessage = `Stability AI API responded with status: ${response.status}`;
            try {
                // The API often returns a JSON object with a 'message' field on error
                const errorJson = JSON.parse(errorText);
                if(errorJson.message) {
                    errorMessage = `Stability AI error: ${errorJson.message}`;
                }
            } catch (e) {
                // Not a JSON error, use the raw text
                 errorMessage += `. Response: ${errorText}`;
            }
            // For 401, it's almost always a key issue.
            if(response.status === 401) {
                errorMessage = "Authentication failed. Please check your Stability AI API key in the Netlify environment variables.";
            }
            throw new Error(errorMessage);
        }

        const responseJson = await response.json() as { artifacts: { base64: string }[] };
        
        if (!responseJson.artifacts || responseJson.artifacts.length === 0) {
            throw new Error('API returned no images.');
        }

        const imageBase64 = responseJson.artifacts[0].base64;
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBase64 }),
        };

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Server error: ${errorMessage}` }),
        };
    }
};