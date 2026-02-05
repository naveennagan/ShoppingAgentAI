'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { MessageCircle, X, Send, Sparkles, User, Bot } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: 'Hi! I can help you find products or check your order. Try saying "Show me headphones".' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const router = useRouter();
    const { addToCart, clearCart } = useCart();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Add user message
        const newMessages = [...messages, { role: 'user' as const, text: input }];
        setMessages(newMessages);
        const userInput = input;
        setInput('');
        setIsTyping(true);

        try {
            const history = newMessages.slice(-10).map(m => ({
                role: m.role,
                text: m.text
            }));

            const data = await apiClient.chat(userInput, history);

            if (data.action === 'NAVIGATE' && data.payload) {
                router.push(data.payload);
            } else if (data.action === 'ADD_TO_CART' && data.payload) {
                const productToAdd = (await import('@/lib/products')).products.find(p => String(p.id) === String(data.payload));
                if (productToAdd) {
                    addToCart(productToAdd);
                }
            } else if (data.action === 'CLEAR_CART') {
                clearCart();
            } else if (data.action === 'AUTOFILL_CHECKOUT') {
                let detail = {};
                try {
                    if (data.payload) {
                        detail = JSON.parse(data.payload);
                    }
                } catch (e) {
                    console.error("Failed to parse autofill payload", e);
                }
                const event = new CustomEvent('autofill-checkout', { detail });
                window.dispatchEvent(event);
            }

            setMessages(prev => [...prev, { role: 'ai', text: data.message }]);

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered network issue. Please check your connection." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '1rem'
        }}>
            {isOpen && (
                <div className="card" style={{
                    width: '350px',
                    height: '500px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: 'var(--surface)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border)'
                }}>
                    {/* Header */}
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
                        <button onClick={() => setIsOpen(false)} style={{ color: 'white', opacity: 0.8 }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
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

                    {/* Input */}
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
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn-primary"
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-lg)',
                    fontSize: '1.5rem',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>
        </div>
    );
}
