'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Sparkles } from 'lucide-react';

function ShoppingBagIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    );
}

function OrdersIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" />
        </svg>
    );
}

interface NavbarProps {
    onToggleChat: () => void;
    isChatOpen?: boolean;
    chatWidth?: number;
}

export default function Navbar({ onToggleChat, isChatOpen, chatWidth }: NavbarProps) {
    const { count } = useCart();

    return (
        <nav style={{
            borderBottom: '1px solid #E5E5E5',
            background: 'white',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            marginRight: isChatOpen ? `${chatWidth}px` : '0',
            transition: 'margin-right 0.3s ease'
        }}>
            <div className="container" style={{
                height: '4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Link href="/" style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#000'
                }}>
                    AI.Shop
                </Link>

                <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', fontSize: '0.95rem' }}>
                    <Link href="/products" style={{ fontWeight: 400 }}>Products</Link>
                    <Link href="/orders" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 400 }}>
                        <OrdersIcon />
                        My Orders
                    </Link>
                    <button 
                        onClick={onToggleChat}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 400,
                            color: 'inherit'
                        }}
                    >
                        <Sparkles size={18} />
                        AI Assistant
                    </button>
                    <Link href="/cart" style={{ position: 'relative' }}>
                        <ShoppingBagIcon />
                        {count > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: '#3D7A7F',
                                color: 'white',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>{count}</span>
                        )}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
