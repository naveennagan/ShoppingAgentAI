export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  specs?: Record<string, any>;
  [key: string]: any;
}

export interface AIResponse {
  action: string;
  payload?: any;
  message: string;
  confidence?: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp?: number;
}

export type ActionHandler = (payload: any) => Promise<void> | void;

export interface AIAssistantConfig {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  autoDetectContext?: boolean;
  actions?: Record<string, ActionHandler>;
  dataProviders?: {
    products?: () => Promise<any[]>;
    cart?: () => Promise<any>;
    user?: () => Promise<any>;
    [key: string]: (() => Promise<any>) | undefined;
  };
}

export interface AIAssistantContext {
  websiteType?: 'ecommerce' | 'content' | 'form' | 'general';
  capabilities?: string[];
  data: Record<string, any>;
}
