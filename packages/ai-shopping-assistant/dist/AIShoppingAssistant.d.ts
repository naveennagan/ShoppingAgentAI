import { AIAssistantConfig, AIAssistantContext, AIResponse, ChatMessage } from './types';
export declare class AIShoppingAssistant {
    private genAI;
    private config;
    private context;
    private dynamicSchema?;
    constructor(config: AIAssistantConfig);
    initialize(): Promise<void>;
    chat(message: string, history?: ChatMessage[]): Promise<AIResponse>;
    private retryWithBackoff;
    private executeAction;
    private generateSystemPrompt;
    updateContext(context: Partial<AIAssistantContext>): void;
    getContext(): AIAssistantContext;
    registerAction(name: string, handler: (payload: any) => Promise<void> | void): void;
    registerDataProvider(name: string, provider: () => Promise<any>): void;
}
