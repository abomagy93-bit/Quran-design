
import { GoogleGenAI } from "@google/genai";

export const generateVisualPromptFromVerses = async (verses: string[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Based on these Quranic verses, suggest a highly cinematic, peaceful, and spiritual background scene. 
    Theme: abstract or nature-based (mountains, galaxies, oceans, or dawn light).
    Verses: "${verses.join(' ')}"
    Output ONLY a descriptive English prompt for an image/video generator. Max 40 words.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text?.trim() || "Cinematic peaceful landscape, ethereal light, spiritual atmosphere, 4k";
  } catch (error) {
    console.error("Prompt generation failed:", error);
    return "Cinematic peaceful landscape, ethereal light, spiritual atmosphere, 4k";
  }
};

export const generateGeminiImage = async (textPrompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `${textPrompt}, soft focus, elegant, minimal Islamic art elements, deep colors, 4k resolution` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (part?.inlineData) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  
  throw new Error("فشل توليد الصورة من الخادم. يرجى المحاولة مرة أخرى.");
};
