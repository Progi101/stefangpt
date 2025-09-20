import { Handler } from '@netlify/functions';
import { Buffer } from 'buffer';

const STABLE_HORDE_BASE_URL = "https://stablehorde.net/api/v2";
const ANONYMOUS_API_KEY = "0000000000";
const POLLING_INTERVAL_MS = 3000;
const MAX_POLLING_ATTEMPTS = 25; // ~75 seconds timeout

// Helper function to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { prompt } = JSON.parse(event.body || '{}');
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required.' }) };
        }

        // 1. Request image generation asynchronously
        const initialResponse = await fetch(`${STABLE_HORDE_BASE_URL}/generate/async`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': ANONYMOUS_API_KEY,
                'Client-Agent': 'StefanGPT:1.0:stefangpt.com'
            },
            body: JSON.stringify({
                prompt: prompt,
                params: {
                    n: 1,
                    width: 512,
                    height: 512,
                },
            }),
        });

        if (!initialResponse.ok) {
            const errorBody = await initialResponse.json();
            throw new Error(`Stable Horde API error: ${errorBody.message || 'Failed to submit request'}`);
        }

        const { id } = await initialResponse.json();
        if (!id) {
            throw new Error("Did not receive a job ID from Stable Horde.");
        }

        // 2. Poll for the result
        for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
            await sleep(POLLING_INTERVAL_MS);

            const checkResponse = await fetch(`${STABLE_HORDE_BASE_URL}/generate/check/${id}`);
            if (!checkResponse.ok) {
                // Don't fail the whole process if one check fails, just log and continue
                console.warn(`Polling check failed with status: ${checkResponse.status}`);
                continue;
            }

            const status = await checkResponse.json();
            if (status.done) {
                // 3. Generation is complete, fetch the image
                const finalResponse = await fetch(`${STABLE_HORDE_BASE_URL}/generate/status/${id}`);
                const finalData = await finalResponse.json();
                
                if (finalData.faulted) {
                    throw new Error("The Stable Horde worker failed to generate the image.");
                }

                const imageUrl = finalData.generations[0]?.img;
                if (!imageUrl) {
                    throw new Error("Generation finished but no image URL was provided.");
                }

                // 4. Convert remote image to a data URL to make it permanent for localStorage
                const imageFetch = await fetch(imageUrl);
                const imageBlob = await imageFetch.blob();
                const buffer = Buffer.from(await imageBlob.arrayBuffer());
                const base64Image = buffer.toString('base64');
                const dataUrl = `data:${imageBlob.type};base64,${base64Image}`;

                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: dataUrl }),
                };
            }
        }

        // 5. If the loop finishes, it timed out
        throw new Error("Image generation timed out. The Stable Horde network might be busy. Please try again later.");

    } catch (error) {
        console.error("Error in generate-image function:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Server error: ${errorMessage}` }),
        };
    }
};
