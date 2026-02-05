
import { GoogleGenAI, Type } from "@google/genai";
import { Department } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTriageSuggestion = async (reason: string, age: string, gender: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform clinical triage for a patient. 
      Patient Info: Age ${age}, Gender ${gender}. 
      Reason for visit: "${reason}". 
      Decide if they belong in OPD or EMERGENCY. 
      Provide a brief priority level (Low, Medium, High) and a one-sentence clinical note.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            department: { type: Type.STRING, description: "Either 'OPD' or 'EMERGENCY'" },
            priority: { type: Type.STRING, description: "Low, Medium, or High" },
            note: { type: Type.STRING, description: "Concise medical note" }
          },
          required: ["department", "priority", "note"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return {
      department: data.department.toUpperCase() === 'EMERGENCY' ? Department.EMERGENCY : Department.OPD,
      priority: data.priority,
      note: data.note
    };
  } catch (error) {
    console.error("Triage AI failed:", error);
    return null;
  }
};
