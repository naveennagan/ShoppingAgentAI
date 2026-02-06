'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { X, Send, Sparkles, User, Bot } from 'lucide-react';
import { AIShoppingAssistant } from '../../packages/ai-shopping-assistant/src';

interface AiChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onWidthChange: (width: number) => void;
}

export default function AiChatPanel({ isOpen, onClose, onWidthChange }: AiChatPanelProps) {
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: 'Hi! I can help you find products or check your order. Try saying "Show me headphones".' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [assistant, setAssistant] = useState<AIShoppingAssistant | null>(null);
    const [panelWidth, setPanelWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);

    const router = useRouter();
    const { addToCart, clearCart, items: cart } = useCart();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initAssistant = async () => {
            const ai = new AIShoppingAssistant({
                apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
                autoDetectContext: true,
                
                dataProviders: {
                    products: async () => {
                        const { products } = await import('@/lib/products');
                        return products;
                    },
                    cart: async () => cart,
                    deals: async () => {
                        const { deals } = await import('@/lib/products');
                        return deals;
                    }
                },
                
                actions: {
                    navigate: (path: any) => {
                        const url = typeof path === 'string' ? path : path?.url || path?.path || '/checkout';
                        router.push(url);
                    },
                    add_to_cart: async (productId: string) => {
                        const { products } = await import('@/lib/products');
                        const product = products.find(p => String(p.id) === String(productId));
                        if (product) addToCart(product);
                    },
                    clear_cart: () => {
                        clearCart();
                    },
                    autofill_checkout: (data: any) => {
                        const event = new CustomEvent('autofill-checkout', { detail: data });
                        window.dispatchEvent(event);
                    }
                }
            });
            
            await ai.initialize();
            setAssistant(ai);
        };
        
        initAssistant();
    }, [router, addToCart, clearCart, cart]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !assistant) return;

        const userMessage = { role: 'user' as const, text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const history = messages.slice(-10);
            assistant.updateContext({ data: { cart } });
            const response = await assistant.chat(input, history);
            setMessages(prev => [...prev, { role: 'ai', text: response.message }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an issue. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

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
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: msg.role === 'user' ? 'var(--primary)' : '#e5e7eb',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {msg.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="#374151" />}
                            </div>
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
                    {isTyping && (
                        <div style={{ alignSelf: 'flex-start', color: '#9ca3af', fontSize: '0.8rem', paddingLeft: '2.5rem' }}>
                            typing...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

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
