
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Handler } from "@netlify/functions";

// Duplicating types to avoid pathing issues in serverless environment.
enum MessageSender {
  USER = 'user',
  AI = 'ai',
}
interface TextContent { type: 'text'; text: string; }
interface ImageContent { type: 'image'; imageUrl: string; prompt: string; }
interface SearchResultContent { type: 'search'; text: string; citations: { uri: string; title: string }[]; }
interface CodeFile { filename: string; content: string; language?: string; }
interface FilesContent { type: 'files'; files: CodeFile[]; title?: string; }
interface UserQueryContent { type: 'user-query'; text: string; imageUrl: string; }
type MessageContent = TextContent | ImageContent | SearchResultContent | FilesContent | UserQueryContent;
interface Message { id: string; sender: MessageSender; content: MessageContent; }

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

const API_KEY = process.env.API_KEY;
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

const getAiInstance = () => {
  if (!API_KEY) {
    throw new Error("The Google Gemini API key is not set in the Netlify environment variables.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

const generateChat = async (history: Message[]): Promise<string> => {
  const ai = getAiInstance();
  const contents = history.map(msg => {
    const role = msg.sender === 'user' ? 'user' : 'model';
    const content = msg.content;
    
    if (role === 'user') {
        const parts: any[] = [];
        if ('text' in content && content.text) {
            parts.push({ text: content.text });
        }
        
        if (content.type === 'user-query' && content.imageUrl) {
            const [header, data] = content.imageUrl.split(',');
            const mimeType = header?.match(/:(.*?);/)?.[1];
            if (data && mimeType) {
                parts.push({
                    inlineData: { mimeType, data }
                });
            }
        }
        return { role, parts };
    } 
    else {
        let text = '';
        if (content.type === 'text' || content.type === 'search') {
          text = content.text;
        } else if (content.type === 'image') {
          text = `[An image was generated for the prompt: "${content.prompt}"]`;
        } else if (content.type === 'files') {
            text = `[A set of files was generated.]`;
        }
        return { role, parts: [{ text }] };
    }
  });

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: {
        systemInstruction: SYSTEM_INSTRUCTION
    }
  });

  return response.text;
};

const generateTitle = async (firstMessage: string): Promise<string> => {
  const ai = getAiInstance();
  const prompt = `Generate a very short, concise title (3-5 words max) for the following user query. Just return the title, nothing else.\n\nQuery: "${firstMessage}"`;
  
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        thinkingConfig: { thinkingBudget: 0 }
    }
  });
  
  return response.text.replace(/["']/g, "").trim();
};

const performSearch = async (prompt: string): Promise<SearchResultContent> => {
    const ai = getAiInstance();

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(
        (chunk: any) => ({
            uri: chunk.web.uri,
            title: chunk.web.title,
        })
    ).filter((c: {uri: string, title: string}) => c.uri && c.title) ?? [];

    return {
        type: 'search',
        text: response.text,
        citations,
    };
};

const generateImage = async (prompt: string): Promise<string> => {
    if (!STABILITY_API_KEY) {
        throw new Error("The Stability AI API key is not set in the Netlify environment variables.");
    }

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'image/png',
            'Authorization': `Bearer ${STABILITY_API_KEY}`,
        },
        body: JSON.stringify({
            prompt: prompt,
            output_format: "png",
            model: "sd3-large-turbo",
            aspect_ratio: "1:1",
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability AI request failed with status ${response.status}: ${errorText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    return `data:image/png;base64,${base64Image}`;
};


export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { action, payload } = JSON.parse(event.body || '{}');

        if (!action || !payload) {
            return { statusCode: 400, body: 'Missing action or payload' };
        }

        let responseData;

        switch (action) {
            case 'chat':
                const text = await generateChat(payload.history);
                responseData = { text };
                break;
            case 'title':
                const title = await generateTitle(payload.message);
                responseData = { title };
                break;
            case 'search':
                const result = await performSearch(payload.prompt);
                responseData = { result };
                break;
            case 'image':
                const imageUrl = await generateImage(payload.prompt);
                responseData = { imageUrl };
                break;
            default:
                return { statusCode: 400, body: `Unknown action: ${action}` };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(responseData),
        };

    } catch (error) {
        console.error('Error in Netlify function:', error);
        const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage }),
        };
    }
};