
export interface User {
  username: string;
  passwordHash: string; // In a real app, this would be a hash. Here it's stored plaintext for simplicity.
}

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
}

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  imageUrl: string;
  prompt: string;
}

export interface SearchResultContent {
    type: 'search';
    text: string;
    citations: { uri: string; title: string }[];
}

export interface CodeFile {
  filename: string;
  content: string;
  language?: string;
}

export interface FilesContent {
  type: 'files';
  files: CodeFile[];
  title?: string;
}

export interface UserQueryContent {
  type: 'user-query';
  text: string;
  imageUrls: string[]; // The data URLs of the uploaded images
}

export type MessageContent = TextContent | ImageContent | SearchResultContent | FilesContent | UserQueryContent;

export interface Message {
  id: string;
  sender: MessageSender;
  content: MessageContent;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}