import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Transaction, Category } from "../types";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const autoCategorizeTransaction = async (description: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API key not configured");
    return Category.MISC;
  }

  try {
    const categories = Object.values(Category).join(', ');
    const prompt = `Classify the transaction description "${description}" into one of these categories: ${categories}. Return ONLY the category name exactly as listed. If unsure, return "Miscellaneous".`;
    
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await model.generateContent(prompt);
    const result = await response.response;

    const text = result.text()?.trim();
    return text || Category.MISC;
  } catch (error) {
    console.error("Gemini Categorization Error:", error);
    return Category.MISC;
  }
};

export const generateFinancialInsights = async (transactions: Transaction[]) => {
  if (!ai || transactions.length === 0) {
    console.warn("Gemini API not available or no transactions");
    return null;
  }

  // Simplify data to save tokens and focus on patterns
  const simplifiedData = transactions.map(t => ({
    date: t.date,
    amount: t.amount,
    type: t.type,
    cat: t.category,
    desc: t.description
  }));

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      summary: { type: SchemaType.STRING, description: "A brief executive summary of the financial health." },
      actionableTips: { 
        type: SchemaType.ARRAY, 
        items: { type: SchemaType.STRING },
        description: "3 specific tips to save money or improve budget based on the data."
      },
      predictedNextMonthSpending: { type: SchemaType.NUMBER, description: "A prediction of total spending for next month." },
      anomalyDetected: { type: SchemaType.BOOLEAN, description: "True if there are unusually high expenses." }
    },
    required: ["summary", "actionableTips", "predictedNextMonthSpending", "anomalyDetected"]
  };

  try {
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });
    
    const response = await model.generateContent(`Analyze these financial transactions: ${JSON.stringify(simplifiedData)}. Provide financial advice.`);
    const result = await response.response;
    const text = result.text();

    if (text) {
      return JSON.parse(text);
    }
    return null;
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return null;
  }
};

// --- AI CHAT FOR INVESTMENT QUESTIONS ---

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FINANCE_SYSTEM_PROMPT = `Du bist ein freundlicher und kompetenter Finanzberater-Assistent in einer persönlichen Finanz-App. 

Deine Aufgaben:
- Beantworte Fragen zu Investitionen, ETFs, Aktien, Kryptowährungen und Vermögensaufbau
- Erkläre Finanzkonzepte einfach und verständlich
- Gib praktische Tipps zur Geldanlage und Budgetierung
- Antworte auf Deutsch, es sei denn der Benutzer schreibt auf Englisch

Wichtige Hinweise:
- Weise darauf hin, dass du keine professionelle Finanzberatung ersetzt
- Sei vorsichtig mit konkreten Anlageempfehlungen
- Halte Antworten prägnant aber informativ (max. 2-3 Absätze)
- Nutze Aufzählungen für bessere Lesbarkeit wenn sinnvoll`;

export const chatWithAI = async (
  userMessage: string, 
  conversationHistory: ChatMessage[] = []
): Promise<string> => {
  if (!ai) {
    return "⚠️ Gemini API nicht konfiguriert. Bitte NEXT_PUBLIC_GEMINI_API_KEY in den Umgebungsvariablen setzen.";
  }

  try {
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: FINANCE_SYSTEM_PROMPT,
    });

    // Build conversation context
    const historyFormatted = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: historyFormatted as any,
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const text = response.text();

    return text || "Entschuldigung, ich konnte keine Antwort generieren.";
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    const errorMessage = error?.message || error?.toString() || 'Unbekannter Fehler';
    return `❌ Gemini Fehler: ${errorMessage}`;
  }
};

export const isGeminiConfigured = (): boolean => {
  return !!ai;
};