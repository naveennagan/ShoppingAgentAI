import Avatar from './Avatar';

interface ChatBubbleProps {
    role: 'user' | 'ai';
    children: React.ReactNode;
}

export default function ChatBubble({ role, children }: ChatBubbleProps) {
    return (
        <div style={{
            display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
            flexDirection: role === 'user' ? 'row-reverse' : 'row',
            maxWidth: '88%'
        }}>
            {role === 'ai' && <Avatar />}
            <div className={`chat-bubble chat-bubble--${role}`}>
                {children}
            </div>
        </div>
    );
}
