'use client';

import { useState, useEffect } from 'react';
import { ChatHeader, ChatMessages, ChatInputBar, useGuidedFlow } from './ai-chat';
import type { AiChatPanelProps } from './ai-chat';

// Re-export types that other files may depend on
export type { GuidedFlowStep, PreferenceFilter, GuidedFlowState } from './ai-chat';

export default function AiChatPanel({ isOpen, onClose, onWidthChange }: AiChatPanelProps) {
    const [input, setInput] = useState('');
    const [panelWidth, setPanelWidth] = useState(420);
    const [isResizing, setIsResizing] = useState(false);

    const {
        messages, isTyping, showQuickActions, messagesEndRef, cart,
        sendMessage, handleCardAction,
    } = useGuidedFlow();

    // Resize handling
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
        setInput('');
    };

    const handleSendMessage = (text: string) => {
        sendMessage(text);
        setInput('');
    };

    if (!isOpen) return null;

    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="chat-panel" style={{ width: `${panelWidth}px` }}>
            {/* Resize handle */}
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                cursor: 'ew-resize', zIndex: 10,
                background: isResizing ? 'var(--primary)' : 'transparent', transition: 'background 0.2s'
            }} onMouseDown={() => setIsResizing(true)} />

            <ChatHeader cartCount={cartCount} onClose={onClose} />

            <ChatMessages
                messages={messages}
                isTyping={isTyping}
                showQuickActions={showQuickActions}
                panelWidth={panelWidth}
                messagesEndRef={messagesEndRef}
                onSendMessage={handleSendMessage}
                onCardAction={handleCardAction}
            />

            <ChatInputBar
                input={input}
                isTyping={isTyping}
                cartCount={cart.length}
                onInputChange={setInput}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
