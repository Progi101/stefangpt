import { Handler } from '@netlify/functions';
import { GoogleGenAI, Content, Part } from '@google/genai';
// FIX: Corrected import path to resolve module from project root during Netlify build.
// FIX: Import `MessageSender` as a value because it is an enum used at runtime, while other symbols are interfaces used only as types.
import { MessageSender, type Message, type UserQueryContent, type SearchResultContent } from '../../types';

const GEMINI_API_KEY = process.env.API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('The GEMINI_API_KEY environment variable is not set.');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are StefanGPT, a helpful and friendly AI assistant. Your personality is engaging and approachable.
- Use emojis to make your responses more lively and expressive. 😊
- Use colored text to highlight important keywords, concepts, or code snippets. To color text, you MUST use HTML spans like \`<span style='color: #hexcode;'>text</span>\`.
- For light themes, use colors like \`#4338ca\`. For dark themes, use colors like \`#a5b4fc\`. Choose colors that are accessible and have good contrast.

When you are asked to provide code, especially multiple files for a project, you MUST format the output within a special JSON block.
- The format is a markdown code block with the language identifier \`json-files\`.
- Inside, provide a JSON array of file objects. Each object must have a 'filename' (string) and 'content' (string) key.
- Provide any explanatory text about the code OUTSIDE of this \`json-files\` block.

Example:
Here are the files for your project:
\`\`\`json-files
[
  {"filename": "index.html", "content": "<!DOCTYPE html>..."},
  {"filename": "style.css", "content": "body { ... }"}
]
\`\`\`
This setup creates a basic webpage.`;

// Helper to convert data URL to a Gemini API Part
const fileToPart = (dataUrl: string): Part => {
  const [header, data] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  return { inlineData: { mimeType, data } };
};

// Formats the chat history for the Gemini API
const formatMessageHistory = (messages: Message[]): Content[] => {
    const relevantMessages = messages.filter(msg => 
        !(msg.sender === MessageSender.AI && msg.content.type === 'text' && msg.content.text.includes('I am StefanGPT'))
    );

    return relevantMessages.map(message => {
        const role = message.sender === MessageSender.USER ? 'user' : 'model';
        let parts: Part[] = [];

        if (message.content.type === 'text') {
            parts.push({ text: message.content.text });
        } else if (message.content.type === 'user-query') {
            const userQuery = message.content as UserQueryContent;
            if (userQuery.imageUrl) parts.push(fileToPart(userQuery.imageUrl));
            if (userQuery.text) parts.push({ text: userQuery.text });
        } else if (message.content.type === 'files') {
             parts.push({ text: 'Provided a set of project files.' });
        } else if (message.content.type === 'image') {
             parts.push({ text: 'Generated an image with prompt: ' + message.content.prompt });
        } else if (message.content.type === 'search') {
            parts.push({ text: message.content.text });
        }
        
        return { role, parts };
    }).filter(c => c.parts.length > 0);
};

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { type, payload } = JSON.parse(event.body || '{}');
        const model = 'gemini-2.5-flash';
        let responseData;

        switch (type) {
            case 'chat': {
                const contents = formatMessageHistory(payload.messages);
                const response = await ai.models.generateContent({
                    model,
                    contents,
                    config: { systemInstruction: SYSTEM_INSTRUCTION, thinkingConfig: { thinkingBudget: 0 } }
                });
                responseData = { text: response.text };
                break;
            }
            case 'title': {
                const contents = `Generate a very short, concise title (max 5 words) for a chat that starts with this user prompt: "${payload.prompt}"`;
                const response = await ai.models.generateContent({
                    model,
                    contents,
                    config: { thinkingConfig: { thinkingBudget: 0 } }
                });
                const title = response.text.replace(/"/g, '').replace(/\.$/, '').trim();
                responseData = { title };
                break;
            }
            case 'search': {
                const response = await ai.models.generateContent({
                    model,
                    contents: payload.prompt,
                    config: { tools: [{ googleSearch: {} }] },
                });
                const text = response.text;
                const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                const citations = groundingChunks
                    .map((chunk: any) => chunk.web)
                    .filter((web: any) => web && web.uri && web.title)
                    .map((web: any) => ({ uri: web.uri, title: web.title }))
                    .filter((value: any, index: number, self: any[]) => index === self.findIndex((t) => (t.uri === value.uri)));
                
                const result: SearchResultContent = { type: 'search', text, citations };
                responseData = { result };
                break;
            }
            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request type.' }) };
        }
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(responseData),
        };
    } catch (error) {
        console.error('Error in Gemini Netlify function:', error);
        const message = error instanceof Error ? error.message : "An unknown server error occurred.";
        return {
            statusCode: 500,
            body: JSON.stringify({ error: message }),
        };
    }
};