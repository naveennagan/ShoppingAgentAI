import Avatar from './Avatar';

export default function TypingIndicator() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
            <Avatar size={32} />
            <div style={{
                background: '#f3f4f6', border: '1px solid #e5e7eb',
                borderRadius: '1rem', borderTopLeftRadius: '4px',
                padding: '0.75rem 1rem', display: 'flex', gap: '4px', alignItems: 'center'
            }}>
                {[0, 1, 2].map(i => (
                    <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
            </div>
        </div>
    );
}
