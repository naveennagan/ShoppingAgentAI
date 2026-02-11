'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { X, Send, Sparkles, User, Bot } from 'lucide-react';

/** Props for the AI Chat Panel component */
interface AiChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onWidthChange: (width: number) => void;
}

/**
 * AiChatPanel — A resizable side panel that provides an AI-powered chat interface.
 * Uses the AIShoppingAssistant package to handle conversations, product lookups,
 * cart operations, and navigation actions via Gemini AI.
 */
export default function AiChatPanel({ isOpen, onClose, onWidthChange }: AiChatPanelProps) {
    // Chat state: message history and current input
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: 'Hi! I can help you find products or check your order. Try saying "Show me headphones".' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const [panelWidth, setPanelWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);

    const router = useRouter();
    const { addToCart, clearCart, updateQuantity, removeFromCart, items: cart } = useCart();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the latest message when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /**
     * Handle panel resize via mouse drag on the left edge.
     * Clamps width between 300px and 800px.
     */
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            const clampedWidth = Math.max(300, Math.min(800, newWidth));
            setPanelWidth(clampedWidth);
            onWidthChange(clampedWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    /**
     * Handle chat form submission.
     * Sends the user message to the AI assistant, updates chat history,
     * and displays the AI response. Keeps last 10 messages as context.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user' as const, text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const history = messages.slice(-10).map(m => ({
                role: m.role === 'user' ? 'user' : 'ai',
                text: m.text
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, history })
            });

            const data = await response.json();
            
            // Execute action
            if (data.action === 'navigate') {
                router.push(data.payload);
            } else if (data.action === 'add_to_cart') {
                const { products } = await import('@/lib/products');
                // Handle multiple products if payload is an array
                const productIds = Array.isArray(data.payload) ? data.payload : [data.payload];
                for (const productId of productIds) {
                    const product = products.find(p => String(p.id) === String(productId));
                    if (product) addToCart(product);
                }
            } else if (data.action === 'clear_cart') {
                clearCart();
            } else if (data.action === 'update_quantity') {
                updateQuantity(data.payload.productId, data.payload.quantity);
            } else if (data.action === 'remove_from_cart') {
                removeFromCart(data.payload);
            } else if (data.action === 'autofill_checkout') {
                const event = new CustomEvent('autofill-checkout', { detail: data.payload || {} });
                window.dispatchEvent(event);
                setTimeout(() => router.push('/checkout'), 100);
            }

            setMessages(prev => [...prev, { role: 'ai', text: data.message }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an issue." }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Don't render anything if the panel is closed
    if (!isOpen) return null;

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: `${panelWidth}px`,
                background: 'var(--surface)',
                borderLeft: '1px solid var(--border)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)'
            }}
        >
                {/* Resize handle — drag left edge to resize panel */}
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        cursor: 'ew-resize',
                        background: isResizing ? 'var(--primary)' : 'transparent',
                        transition: 'background 0.2s'
                    }}
                    onMouseDown={() => setIsResizing(true)}
                />

                {/* Header with title and close button */}
                <div style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={18} />
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>AI Assistant</h3>
                    </div>
                    <button onClick={onClose} style={{ color: 'white', opacity: 1, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Message list — scrollable area showing conversation history */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            display: 'flex',
                            gap: '0.5rem',
                            maxWidth: '85%',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                        }}>
                            {/* Avatar icon — user or bot */}
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: msg.role === 'user' ? 'var(--primary)' : '#e5e7eb',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {msg.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="#374151" />}
                            </div>
                            {/* Message bubble with role-based styling */}
                            <div style={{
                                background: msg.role === 'user' ? 'var(--primary)' : '#f3f4f6',
                                color: msg.role === 'user' ? 'white' : '#1f2937',
                                padding: '0.75rem 1rem',
                                borderRadius: '1rem',
                                borderTopRightRadius: msg.role === 'user' ? '4px' : '1rem',
                                borderTopLeftRadius: msg.role === 'ai' ? '4px' : '1rem',
                                boxShadow: 'var(--shadow-sm)',
                                fontSize: '0.95rem',
                                lineHeight: 1.5,
                                border: msg.role === 'ai' ? '1px solid #e5e7eb' : 'none'
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {/* Typing indicator shown while AI is generating a response */}
                    {isTyping && (
                        <div style={{ alignSelf: 'flex-start', color: '#9ca3af', fontSize: '0.8rem', paddingLeft: '2.5rem' }}>
                            typing...
                        </div>
                    )}
                    {/* Scroll anchor — auto-scrolls to here on new messages */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input form — text field and send button */}
                <form onSubmit={handleSubmit} style={{
                    padding: '1rem',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface)',
                    display: 'flex',
                    gap: '0.5rem'
                }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a command..."
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            background: 'var(--background)',
                            outline: 'none',
                            color: 'var(--foreground)',
                            paddingLeft: '1rem'
                        }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        );
}
