import { GoogleGenAI, Type } from "@google/genai";
import { Quest, QuestLevel, QuestType, Stat, StatType } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateQuestWithAI = async (stats: Stat[]): Promise<Omit<Quest, 'id' | 'completed'> | null> => {
  const ai = getClient();
  if (!ai) return null;

  const statsSummary = stats.map(s => `${s.name} (Level ${s.level})`).join(', ');
  
  const prompt = `
    You are the Game Master for a real-life RPG app called "Streamer Divino". 
    The user is an aspiring streamer.
    Current Stats: ${statsSummary}.
    
    Generate a creative, single task (Quest) for the user to complete in real life.
    It should be related to improving one of their stats or advancing their streaming career.
    
    Return JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "A cool RPG-style name for the task" },
            type: { type: Type.STRING, enum: [QuestType.DAILY, QuestType.WEEKLY, QuestType.MONTHLY] },
            levelAssoc: { type: Type.STRING, enum: [QuestLevel.L1, QuestLevel.L2, QuestLevel.L3] },
            xpReward: { type: Type.INTEGER },
            coinReward: { type: Type.INTEGER },
            statAssoc: { 
              type: Type.STRING, 
              enum: [
                StatType.SKILL, 
                StatType.GOLD, 
                StatType.FOCUS, 
                StatType.CHAR, 
                StatType.HP_MP, 
                StatType.MORAL
              ] 
            },
          },
          required: ["name", "type", "levelAssoc", "xpReward", "coinReward", "statAssoc"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as Omit<Quest, 'id' | 'completed'>;
  } catch (error) {
    console.error("Error generating quest:", error);
    return null;
  }
};