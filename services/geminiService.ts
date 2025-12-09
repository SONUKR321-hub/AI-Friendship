import { GoogleGenAI } from "@google/genai";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an image using Gemini 2.5 Flash Image.
 * Used by the LiveClient tool execution.
 */
export const generateImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
    return undefined;
  }
  return undefined;
};

// Deprecated chat functions removed to force usage of LiveService
export const sendMessageToPriyanka = async () => { return { text: "Deprecated" }; };
export const resetChat = () => {};