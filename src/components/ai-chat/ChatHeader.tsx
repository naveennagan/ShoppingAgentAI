'use client';

import { X, Sparkles, ShoppingCart } from 'lucide-react';

interface ChatHeaderProps {
    cartCount: number;
    onClose: () => void;
}

export default function ChatHeader({ cartCount, onClose }: ChatHeaderProps) {
    return (
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
                {cartCount > 0 && (
                    <div style={{
                        background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)',
                        padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <ShoppingCart size={12} /> {cartCount}
                    </div>
                )}
                <button onClick={onClose} className="icon-btn">
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
