"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAIAssistant = useAIAssistant;
const react_1 = require("react");
const AIShoppingAssistant_1 = require("./AIShoppingAssistant");
function useAIAssistant(config) {
    const [assistant, setAssistant] = (0, react_1.useState)(null);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const initAssistant = async () => {
            const ai = new AIShoppingAssistant_1.AIShoppingAssistant(config);
            await ai.initialize();
            setAssistant(ai);
        };
        initAssistant();
    }, []);
    const sendMessage = (0, react_1.useCallback)(async (message) => {
        if (!assistant)
            return null;
        setIsLoading(true);
        setError(null);
        try {
            const userMessage = { role: 'user', text: message };
            setMessages(prev => [...prev, userMessage]);
            const response = await assistant.chat(message, messages);
            const aiMessage = { role: 'ai', text: response.message };
            setMessages(prev => [...prev, aiMessage]);
            return response;
        }
        catch (err) {
            const errorMsg = err.message || 'Failed to get response';
            setError(errorMsg);
            return null;
        }
        finally {
            setIsLoading(false);
        }
    }, [assistant, messages]);
    const clearMessages = (0, react_1.useCallback)(() => {
        setMessages([]);
    }, []);
    const updateContext = (0, react_1.useCallback)((context) => {
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
