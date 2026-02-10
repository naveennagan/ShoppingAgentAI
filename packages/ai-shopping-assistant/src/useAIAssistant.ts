import { useState, useEffect, useCallback } from 'react';
import { AIShoppingAssistant } from './AIShoppingAssistant';
import { AIAssistantConfig, AIResponse, ChatMessage } from './types';

export function useAIAssistant(config: AIAssistantConfig) {
  const [assistant, setAssistant] = useState<AIShoppingAssistant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAssistant = async () => {
      const ai = new AIShoppingAssistant(config);
      await ai.initialize();
      setAssistant(ai);
    };
    initAssistant();
  }, []);

  const sendMessage = useCallback(async (message: string): Promise<AIResponse | null> => {
    if (!assistant) return null;

    setIsLoading(true);
    setError(null);

    try {
      const userMessage: ChatMessage = { role: 'user', text: message };
      setMessages(prev => [...prev, userMessage]);

      const response = await assistant.chat(message, messages);

      const aiMessage: ChatMessage = { role: 'ai', text: response.message };
      setMessages(prev => [...prev, aiMessage]);

      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to get response';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assistant, messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const updateContext = useCallback((context: any) => {
    assistant?.updateContext(context);
  }, [assistant]);

  return {
    messages,
    sendMessage,
    clearMessages,
    updateContext,
    isLoading,
    error,
    assistant
  };
}
