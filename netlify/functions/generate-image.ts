import { Handler } from '@netlify/functions';
import { Buffer } from 'buffer';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5";

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!HUGGING_FACE_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Hugging Face API key is not set.' }) };
    }

    try {
        const { prompt } = JSON.parse(event.body || '{}');
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required.' }) };
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: prompt }),
        });

        // The API might return a JSON error if the model is loading or there's an issue
        if (response.headers.get('content-type')?.includes('application/json')) {
            const errorBody = await response.json();
            if (errorBody.error && typeof errorBody.error === 'string' && errorBody.error.includes("is currently loading")) {
                 throw new Error("The image model is warming up. Please try again in about 30 seconds.");
            }
            throw new Error(errorBody.error || `Hugging Face API responded with an error.`);
        }
        
        if (!response.ok) {
            throw new Error(`Hugging Face API responded with status: ${response.status}`);
        }

        // The successful response is a blob (the image itself)
        const imageBlob = await response.blob();
        const buffer = Buffer.from(await imageBlob.arrayBuffer());
        const base64Image = buffer.toString('base64');
        const dataUrl = `data:${imageBlob.type};base64,${base64Image}`;

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