import { AIShoppingAssistant } from './AIShoppingAssistant';
import { AIAssistantConfig, AIResponse, ChatMessage } from './types';
export declare function useAIAssistant(config: AIAssistantConfig): {
    messages: ChatMessage[];
    sendMessage: (message: string) => Promise<AIResponse | null>;
    clearMessages: () => void;
    updateContext: (context: any) => void;
    isLoading: boolean;
    error: string | null;
    assistant: AIShoppingAssistant | null;
};
