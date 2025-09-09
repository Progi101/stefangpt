import { User, ChatSession } from '../types';

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
  return sessions ? JSON.parse(sessions) : [];
};

export const saveChatSessions = (sessions: ChatSession[]): void => {
  const key = getChatsKeyForCurrentUser();
  if(!key) return;
  localStorage.setItem(key, JSON.stringify(sessions));
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
