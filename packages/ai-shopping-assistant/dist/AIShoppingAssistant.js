"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIShoppingAssistant = void 0;
const generative_ai_1 = require("@google/generative-ai");
const zod_1 = require("zod");
const ContextExtractor_1 = require("./ContextExtractor");
const SchemaGenerator_1 = require("./SchemaGenerator");
const config_1 = require("./config");
const prompts_1 = require("./prompts");
const ResponseSchema = zod_1.z.object({
    action: zod_1.z.string(),
    payload: zod_1.z.any().optional(),
    message: zod_1.z.string(),
    confidence: zod_1.z.number().optional()
});
class AIShoppingAssistant {
    constructor(config) {
        this.config = {
            autoDetectContext: true,
            ...config
        };
        this.genAI = new generative_ai_1.GoogleGenerativeAI(config.apiKey);
        this.context = { data: {} };
    }
    async initialize() {
        // Auto-detect website context
        if (this.config.autoDetectContext && typeof window !== 'undefined') {
            const webContext = ContextExtractor_1.ContextExtractor.extractFromDOM();
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
                    }
                    catch (error) {
                        console.warn(`Failed to fetch ${key}:`, error);
                    }
                }
            }
        }
        // Generate dynamic schema using AI
        if (Object.keys(this.context.data).length > 0) {
            try {
                const analysis = await SchemaGenerator_1.SchemaGenerator.analyzeWithAI(this.context.data, this.config.apiKey, this.config.model);
                this.dynamicSchema = analysis.schema;
                if (!this.context.capabilities) {
                    this.context.capabilities = analysis.capabilities;
                }
            }
            catch (error) {
                console.warn('Failed to generate dynamic schema:', error);
                this.dynamicSchema = SchemaGenerator_1.SchemaGenerator.createDynamicPrompt(this.context.data);
            }
        }
    }
    async chat(message, history = []) {
        // Regenerate system prompt with current context data
        const systemPrompt = this.config.systemPrompt || this.generateSystemPrompt();
        const model = this.genAI.getGenerativeModel({
            model: this.config.model || config_1.DEFAULT_MODEL,
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
        let response;
        try {
            const parsed = JSON.parse(responseText);
            response = ResponseSchema.parse(parsed);
        }
        catch (error) {
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
    async retryWithBackoff(fn, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            }
            catch (error) {
                const isRateLimitError = error?.message?.includes('429') || error?.message?.includes('quota');
                if (!isRateLimitError || i === maxRetries - 1)
                    throw error;
                const delay = Math.min(1000 * Math.pow(2, i), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('Max retries exceeded');
    }
    async executeAction(response) {
        const { action, payload } = response;
        if (this.config.actions && this.config.actions[action]) {
            try {
                await this.config.actions[action](payload);
            }
            catch (error) {
                console.error(`Action ${action} failed:`, error);
            }
        }
    }
    generateSystemPrompt() {
        const capabilities = this.context.capabilities?.join(', ') || 'general assistance';
        const dataKeys = Object.keys(this.context.data).join(', ');
        const availableActions = Object.keys(this.config.actions || {}).join(', ') || 'none';
        // Always use fresh data, not cached dynamicSchema
        const schemaInfo = `Available data: ${dataKeys}\n${JSON.stringify(this.context.data, null, 2)}`;
        return (0, prompts_1.SYSTEM_PROMPT_TEMPLATE)({
            websiteType: this.context.websiteType,
            capabilities,
            schemaInfo,
            availableActions
        });
    }
    updateContext(context) {
        this.context = {
            ...this.context,
            ...context,
            data: { ...this.context.data, ...context.data }
        };
    }
    getContext() {
        return this.context;
    }
    registerAction(name, handler) {
        if (!this.config.actions) {
            this.config.actions = {};
        }
        this.config.actions[name] = handler;
    }
    registerDataProvider(name, provider) {
        if (!this.config.dataProviders) {
            this.config.dataProviders = {};
        }
        this.config.dataProviders[name] = provider;
    }
}
exports.AIShoppingAssistant = AIShoppingAssistant;
