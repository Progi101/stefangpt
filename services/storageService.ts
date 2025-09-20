import { User, ChatSession, TextContent } from '../types';

const USERS_KEY = 'stefan_gpt_users';
const CURRENT_USER_KEY = 'stefan_gpt_current_user';
const CHATS_KEY_PREFIX = 'stefan_gpt_chats_';

// --- Data Persistence Strategy ---
// The application uses the browser's `localStorage` as a persistent data store.
// This ensures that user data, including accounts and chat sessions, is saved
// across browser sessions and application updates. Data will remain until the
// user manually clears their browser's site data.

// A simple list of fragments to check for. In a real app, this would be more robust.
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

  // Robust check: This ensures case-insensitive uniqueness against both the storage
  // keys (for new accounts) and the `username` property within the stored user 
  // objects (to handle legacy data structures). This prevents 'Progi' and 'progi' 
  // from being treated as different users, regardless of how the data was stored previously.
  const isUsernameTaken = users[lowercasedUsername] || 
                          Object.values(users).some(user => user.username.toLowerCase() === lowercasedUsername);
  
  if (isUsernameTaken) {
    throw new Error("Username is already taken.");
  }

  // Store the user object with the original casing for display, but use the lowercased version as the key for uniqueness.
  const newUser: User = { username, passwordHash: password }; // Plaintext for simplicity
  users[lowercasedUsername] = newUser;
  saveUsers(users);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  return newUser;
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const users = getUsers();
  // Perform a case-insensitive lookup for the username to match the registration logic.
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

const getChatsKeyForCurrentUser = (): string | null => {
    const user = getCurrentUser();
    // The username here is the original case, which is unique due to the registration check.
    return user ? `${CHATS_KEY_PREFIX}${user.username}` : null;
}

export const getChatSessions = (): ChatSession[] => {
  const key = getChatsKeyForCurrentUser();
  if(!key) return [];
  const sessions = localStorage.getItem(key);
  if (!sessions) return [];

  // FIX: Added a try-catch block to prevent the app from crashing if the
  // session data in localStorage is corrupt. This is a critical fix for the
  // login and refresh crashes.
  try {
    return JSON.parse(sessions);
  } catch (error) {
    console.error("Failed to parse chat sessions from localStorage. Data might be corrupt. Clearing corrupt data.", error);
    // Clear the corrupt data to prevent future crashes on subsequent loads.
    localStorage.removeItem(key);
    return []; // Return an empty array to allow the app to continue functioning.
  }
};

export const saveChatSessions = (sessions: ChatSession[]): void => {
  const key = getChatsKeyForCurrentUser();
  if(!key) return;

  // Sanitize sessions to prevent storing large image data that exceeds localStorage quota.
  // This replaces image content with a text placeholder for long-term storage,
  // preventing the "QuotaExceededError" crash. The in-memory state will still
  // show images for the current session.
  const sanitizedSessions = sessions.map(session => ({
      ...session,
      messages: session.messages.map(message => {
          if (message.content.type === 'image') {
              return {
                  ...message,
                  content: {
                      type: 'text',
                      text: `[AI generated an image for prompt: "${message.content.prompt}"]`
                  } as TextContent
              };
          }
          if (message.content.type === 'user-query' && message.content.imageUrls.length > 0) {
              return {
                  ...message,
                  content: {
                      type: 'text',
                      text: message.content.text 
                            ? `[User sent ${message.content.imageUrls.length} image(s) with prompt: "${message.content.text}"]`
                            : `[User sent ${message.content.imageUrls.length} image(s)]`
                  } as TextContent
              };
          }
          return message;
      })
  }));

  try {
    localStorage.setItem(key, JSON.stringify(sanitizedSessions));
  } catch (error) {
    // FIX: Removed the re-throwing of errors. A failure to save to localStorage
    // should not crash the entire application. The in-memory state will persist
    // for the current session. This prevents crashes during image generation/upload.
    console.error("Failed to save chat sessions to localStorage. The current session will remain available, but history may not be saved.", error);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(
            "LocalStorage quota exceeded. Chat history may not be fully saved. " +
            "This can happen with very long conversations even after image sanitization."
        );
    }
  }
};

export const saveChatSession = (session: ChatSession): void => {
    const sessions = getChatSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index > -1) {
        sessions[index] = session;
    } else {
        sessions.unshift(session);
    }
    saveChatSessions(sessions);
};

export const getChatSession = (id: string): ChatSession | undefined => {
    const sessions = getChatSessions();
    return sessions.find(s => s.id === id);
}