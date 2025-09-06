
import { callApiFunction } from './api';

export const generateImage = async (prompt: string): Promise<string> => {
  const data = await callApiFunction('image', { prompt });
  if (data.imageUrl) {
    return data.imageUrl;
  }
  throw new Error("Failed to get a valid image from the server.");
};
