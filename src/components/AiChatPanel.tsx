'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { X, Send, Sparkles, ShoppingCart, Tag } from 'lucide-react';
import { Product } from '@/lib/products';
import { ChatBubble, Chip, ComparisonTable, SuggestionCard, TypingIndicator } from './ui';

interface AiChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onWidthChange: (width: number) => void;
}

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    suggestions?: Product[];
    comparison?: {
        products: string[];
        rows: { field: string; values: string[] }[];
    };
}

const QUICK_ACTIONS = [
    { label: '🔥 Best deals', msg: 'Show me products with the best deals' },
    { label: '📱 Phones', msg: 'Show me all phones' },
    { label: '🛒 My cart', msg: 'What is in my cart?' },
    { label: '🏷️ Apply coupon', msg: 'Can you apply a coupon for my cart?' },
];

export default function AiChatPanel({ isOpen, onClose, onWidthChange }: AiChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'ai', text: 'Hi! I\'m your AI shopping assistant. Ask me about products, deals, or let me help manage your cart.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [panelWidth, setPanelWidth] = useState(420);
    const [isResizing, setIsResizing] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(true);

    const router = useRouter();
    const { addToCart, clearCart, updateQuantity, removeFromCart, items: cart, applyCoupon, removeCoupon, appliedCoupon } = useCart();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    useEffect(() => {
        if (!isResizing) return;
        const onMove = (e: MouseEvent) => {
            const w = Math.max(360, Math.min(800, window.innerWidth - e.clientX));
            setPanelWidth(w);
            onWidthChange(w);
        };
        const onUp = () => setIsResizing(false);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    }, [isResizing, onWidthChange]);

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;
        setShowQuickActions(false);
        setMessages(prev => [...prev, { role: 'user', text }]);
        setInput('');
        setIsTyping(true);

        try {
            const history = messages.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'ai', text: m.text }));
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text, history,
                    cartItems: cart.map(i => ({ productId: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity })),
                    appliedCouponCode: appliedCoupon?.promotionName ?? null
                })
            });
            const data = await res.json();

            let suggestions: Product[] | undefined;
            if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
                const { apiClient } = await import('@/lib/api-client');
                const all: Product[] = await apiClient.getProducts();
                suggestions = data.suggestions
                    .map((id: string) => all.find(p => String(p.id) === String(id)))
                    .filter(Boolean) as Product[];
            }

            // Support both single action (legacy) and actions array
            const actionList: { action: string; payload?: any }[] = Array.isArray(data.actions)
                ? data.actions
                : data.action && data.action !== 'none'
                    ? [{ action: data.action, payload: data.payload }]
                    : [];

            for (const act of actionList) {
                if (act.action === 'navigate') {
                    router.push(act.payload);
                } else if (act.action === 'add_to_cart') {
                    const { apiClient } = await import('@/lib/api-client');
                    const all = await apiClient.getProducts();
                    const ids = Array.isArray(act.payload) ? act.payload : [act.payload];
                    for (const id of ids) {
                        const p = all.find((p: Product) => String(p.id) === String(id));
                        if (p) addToCart(p);
                    }
                } else if (act.action === 'clear_cart') {
                    clearCart();
                } else if (act.action === 'update_quantity') {
                    updateQuantity(act.payload.productId, act.payload.quantity);
                } else if (act.action === 'set_all_quantities') {
                    cart.forEach(item => updateQuantity(item.product.id, act.payload.quantity));
                } else if (act.action === 'remove_from_cart') {
                    removeFromCart(act.payload);
                } else if (act.action === 'autofill_checkout') {
                    window.dispatchEvent(new CustomEvent('autofill-checkout', { detail: act.payload || {} }));
                    setTimeout(() => router.push('/checkout'), 100);
                } else if (act.action === 'apply_coupon' && act.payload?.code) {
                    try {
                        await applyCoupon(act.payload.code);
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Failed to apply coupon';
                        setMessages(prev => [...prev, { role: 'ai', text: `Couldn't apply that code: ${msg}` }]);
                        setIsTyping(false);
                        return;
                    }
                } else if (act.action === 'remove_coupon') {
                    removeCoupon();
                }
            }

            setMessages(prev => [...prev, { role: 'ai', text: data.message, suggestions, comparison: data.comparison }]);
        } catch {
            setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, something went wrong.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

    if (!isOpen) return null;

    return (
        <div className="chat-panel" style={{ width: `${panelWidth}px` }}>
            {/* Resize handle */}
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                cursor: 'ew-resize', zIndex: 10,
                background: isResizing ? 'var(--primary)' : 'transparent', transition: 'background 0.2s'
            }} onMouseDown={() => setIsResizing(true)} />

            {/* Header */}
            <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>AI Assistant</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                            Online
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {cart.length > 0 && (
                        <div style={{
                            background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)',
                            padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            <ShoppingCart size={12} /> {cart.reduce((s, i) => s + i.quantity, 0)}
                        </div>
                    )}
                    <button onClick={onClose} className="icon-btn">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        gap: '0.5rem'
                    }}>
                        <ChatBubble role={msg.role}>{msg.text}</ChatBubble>

                        {msg.comparison && Array.isArray(msg.comparison.rows) && msg.comparison.rows.length > 0 && (
                            <div style={{ width: '100%', maxWidth: `${panelWidth - 40}px` }}>
                                <ComparisonTable comparison={msg.comparison} />
                            </div>
                        )}

                        {msg.suggestions && msg.suggestions.length > 0 && (
                            <div style={{ width: '100%', maxWidth: `${panelWidth - 40}px` }}>
                                <div style={{
                                    display: 'flex', gap: '0.6rem', overflowX: 'auto',
                                    paddingBottom: '0.5rem', paddingTop: '0.25rem',
                                    scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent'
                                }}>
                                    {msg.suggestions.map((product, idx) => (
                                        <SuggestionCard key={product.id} product={product} highlight={idx === 0} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {isTyping && <TypingIndicator />}

                {showQuickActions && messages.length === 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {QUICK_ACTIONS.map(a => (
                            <Chip key={a.label} label={a.label} onClick={() => sendMessage(a.msg)} />
                        ))}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="chat-input-bar">
                {cart.length > 0 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.6rem',
                        padding: '0.35rem 0.75rem', background: '#edf6f6',
                        borderRadius: '8px', border: '1px solid #b2d4d6'
                    }}>
                        <Tag size={11} />
                        <span>{cart.length} item{cart.length > 1 ? 's' : ''} in cart — ask me to apply a coupon!</span>
                    </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about products, deals, your cart…"
                        style={{
                            flex: 1, padding: '0.7rem 1rem', borderRadius: '24px',
                            border: '1.5px solid #e5e7eb', background: '#f9fafb',
                            outline: 'none', color: '#1f2937', fontSize: '0.9rem',
                            transition: 'border-color 0.15s'
                        }}
                        onFocus={e => (e.target.style.borderColor = '#3D7A7F')}
                        onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    />
                    <button type="submit" disabled={!input.trim() || isTyping} style={{
                        width: '42px', height: '42px', borderRadius: '50%', border: 'none',
                        background: input.trim() && !isTyping ? 'linear-gradient(135deg, var(--primary), var(--primary-hover))' : '#e5e7eb',
                        color: input.trim() && !isTyping ? 'white' : '#9ca3af',
                        cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s',
                        boxShadow: input.trim() && !isTyping ? '0 2px 8px rgba(61,122,127,0.35)' : 'none'
                    }}>
                        <Send size={17} />
                    </button>
                </form>
            </div>
        </div>
    );
}
