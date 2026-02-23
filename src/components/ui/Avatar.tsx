import { Sparkles } from 'lucide-react';

export default function Avatar({ size = 30 }: { size?: number }) {
    return (
        <div className="avatar avatar--ai" style={{ width: size, height: size }}>
            <Sparkles size={Math.round(size * 0.43)} color="white" />
        </div>
    );
}
