
import { GoogleGenAI } from "@google/genai";
import { GEMINI_DESCRIPTION_PROMPT_TEMPLATE, GEMINI_API_KEY_INFO } from '../constants';

const API_KEY = process.env.API_KEY;

export const generateBeanDescription = async (origin: string, roast: string): Promise<string> => {
  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE" || API_KEY.length < 10) { // Basic check for placeholder or missing key
    console.error(GEMINI_API_KEY_INFO);
    throw new Error(`AI features are disabled. ${GEMINI_API_KEY_INFO}`);
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const modelName = 'gemini-2.5-flash-preview-04-17';
  
  const prompt = GEMINI_DESCRIPTION_PROMPT_TEMPLATE(origin, roast);

  try {
    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
    });
    // The response.text directly gives the string output.
    const text = response.text; 
    if (!text) {
        throw new Error("Received an empty description from AI.");
    }
    return text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        // Check for specific error messages if needed, e.g., related to API key
        if (error.message.includes("API key not valid")) {
             throw new Error("Invalid API Key. Please check your Gemini API key configuration.");
        }
        throw new Error(`Failed to generate description with AI: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating description with AI.");
  }
};
