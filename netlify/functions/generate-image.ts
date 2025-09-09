import { Handler } from '@netlify/functions';
// FIX: Import Buffer to resolve TypeScript error in Node.js environment.
import { Buffer } from 'buffer';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
// Using SD3 Core, see https://platform.stability.ai/docs/getting-started/stable-diffusion-3
const API_URL = "https://api.stability.ai/v2beta/stable-image/generate/core"; 

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

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('output_format', 'png');
        formData.append('aspect_ratio', '1:1');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STABILITY_API_KEY}`,
                'Accept': 'image/*' // We want the binary image data back
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Stability AI API error:', errorText);
            throw new Error(`Stability AI API responded with status: ${response.status}`);
        }

        const imageBuffer = await response.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');
        
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
