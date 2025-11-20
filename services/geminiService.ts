import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Transaction, Category } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const autoCategorizeTransaction = async (description: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API key not configured");
    return Category.MISC;
  }

  try {
    const categories = Object.values(Category).join(', ');
    const prompt = `Classify the transaction description "${description}" into one of these categories: ${categories}. Return ONLY the category name exactly as listed. If unsure, return "Miscellaneous".`;
    
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
      model: 'gemini-1.5-flash',
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