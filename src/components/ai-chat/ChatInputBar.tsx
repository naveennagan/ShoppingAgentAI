'use client';

import { Send, Tag } from 'lucide-react';

interface ChatInputBarProps {
    input: string;
    isTyping: boolean;
    cartCount: number;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function ChatInputBar({ input, isTyping, cartCount, onInputChange, onSubmit }: ChatInputBarProps) {
    return (
        <div className="chat-input-bar">
            {cartCount > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.6rem',
                    padding: '0.35rem 0.75rem', background: '#edf6f6',
                    borderRadius: '8px', border: '1px solid #b2d4d6'
                }}>
                    <Tag size={11} />
                    <span>{cartCount} item{cartCount > 1 ? 's' : ''} in cart — ask me to apply a coupon!</span>
                </div>
            )}
            <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => onInputChange(e.target.value)}
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
    );
}
