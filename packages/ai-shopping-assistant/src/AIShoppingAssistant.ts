import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { AIAssistantConfig, AIAssistantContext, AIResponse, ChatMessage } from './types';
import { ContextExtractor } from './ContextExtractor';
import { DEFAULT_MODEL } from './config';
import { SYSTEM_PROMPT_TEMPLATE } from './prompts';

const ResponseSchema = z.object({
  action: z.string(),
  payload: z.any().optional(),
  message: z.string(),
  confidence: z.number().optional()
});

export class AIShoppingAssistant {
  private genAI: GoogleGenerativeAI;
  private config: AIAssistantConfig;
  private context: AIAssistantContext;
  private dynamicSchema?: string;

  constructor(config: AIAssistantConfig) {
    this.config = {
      autoDetectContext: true,
      ...config
    };
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.context = { data: {} };
  }

  async initialize() {
    // Auto-detect website context
    if (this.config.autoDetectContext && typeof window !== 'undefined') {
      const webContext = ContextExtractor.extractFromDOM();
      this.context.websiteType = webContext.type;
      this.context.capabilities = webContext.capabilities;
      this.context.data = { ...this.context.data, ...webContext.elements };
    }

    // Fetch data from providers
    if (this.config.dataProviders) {
      for (const [key, provider] of Object.entries(this.config.dataProviders)) {
        if (provider) {
          try {
            this.context.data[key] = await provider();
          } catch (error) {
            console.warn(`Failed to fetch ${key}:`, error);
          }
        }
      }
    }

      // Generate dynamic schema using AI (disabled to save quota)
    // if (Object.keys(this.context.data).length > 0) {
    //   try {
    //     const analysis = await SchemaGenerator.analyzeWithAI(this.context.data, this.config.apiKey, this.config.model);
    //     this.dynamicSchema = analysis.schema;
    //     if (!this.context.capabilities) {
    //       this.context.capabilities = analysis.capabilities;
    //     }
    //   } catch (error) {
    //     console.warn('Failed to generate dynamic schema:', error);
    //     this.dynamicSchema = SchemaGenerator.createDynamicPrompt(this.context.data);
    //   }
    // }
  }

  async chat(message: string, history: ChatMessage[] = []): Promise<AIResponse> {
    // Regenerate system prompt with current context data
    const systemPrompt = this.config.systemPrompt || this.generateSystemPrompt();
    
    const model = this.genAI.getGenerativeModel({
      model: this.config.model || DEFAULT_MODEL,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: '{"action": "none", "payload": null, "message": "Ready"}' }] },
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))
      ]
    });

    const result = await this.retryWithBackoff(() => chat.sendMessage(message));
    const responseText = result.response.text();
    
    // Validate response
    let response: AIResponse;
    try {
      const parsed = JSON.parse(responseText);
      response = ResponseSchema.parse(parsed);
    } catch (error) {
      response = {
        action: 'none',
        payload: null,
        message: 'I had trouble understanding that. Could you rephrase?'
      };
    }

    // Execute action
    await this.executeAction(response);

    return response;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const isRateLimitError = error?.message?.includes('429') || error?.message?.includes('quota');
        if (!isRateLimitError || i === maxRetries - 1) throw error;
        
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private async executeAction(response: AIResponse) {
    const { action, payload } = response;

    if (this.config.actions && this.config.actions[action]) {
      try {
        await this.config.actions[action](payload);
      } catch (error) {
        console.error(`Action ${action} failed:`, error);
      }
    }
  }

  private generateSystemPrompt(): string {
    const capabilities = this.context.capabilities?.join(', ') || 'general assistance';
    const dataKeys = Object.keys(this.context.data).join(', ');
    const availableActions = Object.keys(this.config.actions || {}).join(', ') || 'none';
    // Always use fresh data, not cached dynamicSchema
    const schemaInfo = `Available data: ${dataKeys}\n${JSON.stringify(this.context.data, null, 2)}`;

    return SYSTEM_PROMPT_TEMPLATE({
      websiteType: this.context.websiteType,
      capabilities,
      schemaInfo,
      availableActions
    });
  }

  updateContext(context: Partial<AIAssistantContext>) {
    this.context = { 
      ...this.context, 
      ...context,
      data: { ...this.context.data, ...context.data }
    };
  }

  getContext(): AIAssistantContext {
    return this.context;
  }

  registerAction(name: string, handler: (payload: any) => Promise<void> | void) {
    if (!this.config.actions) {
      this.config.actions = {};
    }
    this.config.actions[name] = handler;
  }

  registerDataProvider(name: string, provider: () => Promise<any>) {
    if (!this.config.dataProviders) {
      this.config.dataProviders = {};
    }
    this.config.dataProviders[name] = provider;
  }
}
