'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { chatWithAI, isGeminiConfigured, ChatMessage } from '../services/geminiService';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Get AI response from Gemini
      const response = await chatWithAI(userMessage, messages);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: '❌ Fehler beim Senden der Nachricht.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isConfigured = isGeminiConfigured();

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all z-50 flex items-center justify-center group"
          title="AI Finanzberater"
        >
          <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center">
            <Sparkles size={10} className="text-emerald-900" />
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[520px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Finanz-Assistent</h3>
                <p className="text-[10px] text-indigo-200">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={32} className="text-indigo-400" />
                </div>
                <h4 className="text-white font-medium mb-2">Hallo! 👋</h4>
                <p className="text-slate-400 text-sm max-w-[280px] mx-auto">
                  Ich bin dein AI-Finanzberater. Frag mich alles über Investitionen, ETFs, Aktien oder Vermögensaufbau!
                </p>
                <div className="mt-4 space-y-2">
                  {['Was sind ETFs?', 'Wie starte ich mit Investieren?', 'Krypto vs. Aktien?'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInputValue(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="block w-full text-left px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                  msg.role === 'user' 
                    ? 'bg-indigo-500' 
                    : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                }`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-slate-800 text-slate-200 rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="text-indigo-400 animate-spin" />
                    <span className="text-slate-400 text-sm">Denke nach...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-slate-700 bg-slate-900/80">
            {!isConfigured && (
              <div className="mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                ⚠️ Gemini API Key nicht konfiguriert
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Frag mich etwas..."
                disabled={isLoading}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-2">
              Keine professionelle Finanzberatung • Powered by Gemini
            </p>
          </div>
        </div>
      )}
    </>
  );
};

