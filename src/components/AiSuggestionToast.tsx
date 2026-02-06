'use client';

import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface AiSuggestionToastProps {
    message: string;
    onClose: () => void;
    onOpenChat: () => void;
}

export default function AiSuggestionToast({ message, onClose, onOpenChat }: AiSuggestionToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    if (!isVisible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: '4.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '600px',
                width: '90%',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '1px solid #bae6fd',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
                padding: '1rem 1.25rem',
                zIndex: 999,
                animation: 'slideDown 0.3s ease-out'
            }}
        >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div
                    style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px'
                    }}
                >
                    <Sparkles size={14} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem', color: '#0c4a6e' }}>
                        💡 AI Suggestion
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#0369a1', lineHeight: 1.5 }}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#0369a1',
                        flexShrink: 0
                    }}
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
