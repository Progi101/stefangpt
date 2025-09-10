// A Netlify Function will handle the actual API call to the image service.
// This service just calls our own backend function.

export const generateImage = async (prompt: string, signal: AbortSignal): Promise<string> => {
    try {
        const response = await fetch('/.netlify/functions/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
            signal, // Pass the signal to the fetch request
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate image.');
        }

        const { imageUrl } = await response.json();
        // The server function now returns a base64 data URL.
        return imageUrl;
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