import { Handler } from '@netlify/functions';
import { Buffer } from 'buffer';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const API_URL = "https://api.stability.ai/v2beta/stable-image/generate/sd3";

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

        // FormData is natively available in the Netlify Function environment (Node.js).
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('model', 'sd3-medium');
        formData.append('output_format', 'png');
        formData.append('aspect_ratio', '1:1');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STABILITY_API_KEY}`,
                'Accept': 'image/*' // Expect an image response on success.
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Stability AI API error:', errorText);

            let errorMessage = `Stability AI API responded with status: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.errors && Array.isArray(errorJson.errors)) {
                     errorMessage = `Stability AI error: ${errorJson.errors.join(', ')}`;
                } else if (errorJson.message) {
                     errorMessage = `Stability AI error: ${errorJson.message}`;
                }
            } catch (e) {
                 // The error response wasn't JSON.
                 errorMessage += `. Response: ${errorText}`;
            }

            // Provide a more user-friendly message for common issues.
            if (response.status === 401) {
                errorMessage = "Authentication failed. Please check your Stability AI API key in the Netlify environment variables.";
            }
            if (response.status === 404 && errorText.includes("not found")) {
                errorMessage = "The requested model was not found. The API may have changed.";
            }

            throw new Error(errorMessage);
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
