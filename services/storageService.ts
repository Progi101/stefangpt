import { User, ChatSession } from '../types';

const USERS_KEY = 'stefan_gpt_users';
const CURRENT_USER_KEY = 'stefan_gpt_current_user';
// --- New Storage Keys ---
const CHATS_METADATA_KEY_PREFIX = 'stefan_gpt_chats_';
const SESSION_KEY_PREFIX = 'stefan_gpt_session_';
// Old key for migration
const OLD_CHATS_KEY_PREFIX = 'stefan_gpt_chats_';


// --- Data Persistence Strategy ---
// The application uses the browser's `localStorage`.
// To improve performance, chat sessions are stored individually.
// A "metadata" entry holds an array of {id, title, createdAt} for quick listing.
// Each full session is stored under a key like `stefan_gpt_session_{id}`.
// This prevents loading all message data into memory at once.

const profanityFragments = ['fuck', 'shit', 'bitch', 'cunt', 'nigger', 'nigga', 'asshole', 'dick', 'pussy', 'slut', 'whore', 'rape', 'raping'];

// --- User Management ---

const getUsers = (): Record<string, User> => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : {};
};

const saveUsers = (users: Record<string, User>): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const registerUser = async (username: string, password: string): Promise<User> => {
  const lowercasedUsername = username.toLowerCase();
  for (const fragment of profanityFragments) {
    if (lowercasedUsername.includes(fragment)) {
      throw new Error("This username is not allowed.");
    }
  }

  const users = getUsers();
  const isUsernameTaken = users[lowercasedUsername] || 
                          Object.values(users).some(user => user.username.toLowerCase() === lowercasedUsername);
  
  if (isUsernameTaken) {
    throw new Error("Username is already taken.");
  }

  const newUser: User = { username, passwordHash: password };
  users[lowercasedUsername] = newUser;
  saveUsers(users);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  return newUser;
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const users = getUsers();
  const user = users[username.toLowerCase()];
  if (user && user.passwordHash === password) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
  return null;
};

export const logoutUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};

// --- Chat Session Management ---

const getChatsMetadataKey = (): string | null => {
    const user = getCurrentUser();
    return user ? `${CHATS_METADATA_KEY_PREFIX}${user.username}` : null;
}

const getSessionKey = (sessionId: string): string => `${SESSION_KEY_PREFIX}${sessionId}`;

const migrateOldChatData = (username: string): void => {
    const oldKey = `${OLD_CHATS_KEY_PREFIX}${username}`;
    const oldData = localStorage.getItem(oldKey);
    if (!oldData) return; // No old data to migrate

    console.log("Old chat data format found. Migrating to new format...");
    try {
        const allSessions: ChatSession[] = JSON.parse(oldData);
        if (!Array.isArray(allSessions)) {
             localStorage.removeItem(oldKey);
             return;
        }

        const metadatas = allSessions.map(({ id, title, createdAt }) => ({ id, title, createdAt }));
        
        // Save metadatas to the new master key
        const newMetadataKey = `${CHATS_METADATA_KEY_PREFIX}${username}`;
        localStorage.setItem(newMetadataKey, JSON.stringify(metadatas));

        // Save each session individually
        allSessions.forEach(session => {
            localStorage.setItem(getSessionKey(session.id), JSON.stringify(session));
        });

        // Remove old key after successful migration
        localStorage.removeItem(oldKey);
        console.log("Migration successful.");
    } catch (error) {
        console.error("Failed to migrate old chat data. The data may be corrupt. Discarding old data.", error);
        // If parsing fails, remove the corrupt old data to prevent future errors.
        localStorage.removeItem(oldKey);
    }
}

export const getChatSessionMetadatas = (): Pick<ChatSession, 'id' | 'title' | 'createdAt'>[] => {
  const user = getCurrentUser();
  if (!user) return [];
  
  // Run migration check
  migrateOldChatData(user.username);
  
  const key = getChatsMetadataKey();
  if(!key) return [];
  const metadatas = localStorage.getItem(key);
  if (!metadatas) return [];

  try {
    const parsedMetadatas = JSON.parse(metadatas);
    // Sort by createdAt descending to ensure newest is always first
    return parsedMetadatas.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Failed to parse chat session metadatas. Clearing corrupt data.", error);
    localStorage.removeItem(key);
    return [];
  }
};

export const getAllChatSessions = (): ChatSession[] => {
    const metadatas = getChatSessionMetadatas();
    return metadatas
        .map(meta => getChatSession(meta.id))
        .filter((session): session is ChatSession => session !== undefined);
};


export const getChatSession = (id: string): ChatSession | undefined => {
    const key = getSessionKey(id);
    const sessionData = localStorage.getItem(key);
    if (!sessionData) return undefined;

    try {
        return JSON.parse(sessionData);
    } catch (error) {
        console.error(`Failed to parse session ${id}. Data might be corrupt.`, error);
        localStorage.removeItem(key); // Remove corrupt session
        return undefined;
    }
}

export const saveChatSession = (session: ChatSession): void => {
    // 1. Save the full session object under its own key
    const sessionKey = getSessionKey(session.id);
    try {
        localStorage.setItem(sessionKey, JSON.stringify(session));
    } catch (error) {
        console.error(`Failed to save session ${session.id}.`, error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
             console.warn("LocalStorage quota exceeded. This session may not be saved.");
        }
        return; // Don't update metadata if session save failed
    }

    // 2. Update the metadata list
    const metadatas = getChatSessionMetadatas();
    const newMetadata = { id: session.id, title: session.title, createdAt: session.createdAt };
    const index = metadatas.findIndex(m => m.id === session.id);

    if (index > -1) {
        metadatas[index] = newMetadata;
    } else {
        metadatas.unshift(newMetadata);
    }
    
    // Save the updated metadata list
    const metadataKey = getChatsMetadataKey();
    if (metadataKey) {
        try {
            localStorage.setItem(metadataKey, JSON.stringify(metadatas));
        } catch (error) {
            console.error("Failed to save chat metadatas.", error);
        }
    }
};