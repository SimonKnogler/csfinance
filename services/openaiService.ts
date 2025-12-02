// OpenAI ChatGPT Service for Finance Chat

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
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

export const chatWithOpenAI = async (
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    return "⚠️ OpenAI API Key nicht konfiguriert. Bitte NEXT_PUBLIC_OPENAI_API_KEY in den Umgebungsvariablen setzen.";
  }

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: FINANCE_SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective and fast
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return `❌ API Fehler: ${error.error?.message || 'Unbekannter Fehler'}`;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Entschuldigung, ich konnte keine Antwort generieren.";
    
  } catch (error) {
    console.error("OpenAI Chat Error:", error);
    return "❌ Fehler bei der Verbindung zum AI-Service. Bitte versuche es später erneut.";
  }
};

export const isOpenAIConfigured = (): boolean => {
  return !!process.env.NEXT_PUBLIC_OPENAI_API_KEY;
};

