
import { Handler } from '@netlify/functions';
import { Buffer } from 'buffer';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5";

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!HUGGING_FACE_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: HUGGING_FACE_API_KEY is not set.' }) };
    }

    try {
        const { prompt, negativePrompt } = JSON.parse(event.body || '{}');
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required.' }) };
        }

        const payload: { inputs: string, parameters?: { negative_prompt?: string } } = {
            inputs: prompt,
        };

        if (negativePrompt) {
            payload.parameters = { negative_prompt: negativePrompt };
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // The API might return a JSON error if the model is loading or there's an issue
        if (response.headers.get('content-type')?.includes('application/json')) {
            const errorBody = await response.json();
            if (errorBody.error && typeof errorBody.error === 'string' && errorBody.error.includes("is currently loading")) {
                 throw new Error("The image model is warming up. Please try again in about 30 seconds.");
            }
            // A different kind of error from Hugging Face
            if (errorBody.error) {
                throw new Error(errorBody.error);
            }
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API responded with status ${response.status}: ${errorText}`);
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
