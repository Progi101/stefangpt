// A Netlify Function will handle the actual API call to the image service.
// This service just calls our own backend function.

import { AiModel } from "../components/layout/MainLayout";

export const generateImage = async (prompt: string, model: AiModel, signal: AbortSignal): Promise<string> => {
    try {
        const response = await fetch('/.netlify/functions/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, model }),
            signal, // Pass the signal to the fetch request
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage;
            try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error;
            } catch (e) {
                errorMessage = errorBody;
            }
            throw new Error(errorMessage || 'Failed to generate image.');
        }

        const responseText = await response.text();
        if (!responseText) {
            throw new Error("Received an empty response from the image generation server.");
        }

        try {
            const { imageUrl } = JSON.parse(responseText);
            if (!imageUrl) {
                 throw new Error("Invalid response format from image generation server.");
            }
            return imageUrl;
        } catch (e) {
            console.error("JSON parsing error for image response:", responseText);
            throw new Error("Received an invalid (non-JSON) response from the image generation server.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        if (error instanceof Error) {
             // Don't throw a new error for aborts, let the caller handle it.
            if (error.name === 'AbortError') {
                throw error;
            }
            throw new Error(`Image generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image generation.");
    }
};