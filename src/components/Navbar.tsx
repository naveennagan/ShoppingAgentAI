'use client';

import React from 'react';
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

function NavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <Link href={href} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontWeight: 500, fontSize: '0.9rem', color: '#404040',
            padding: '0.45rem 0.9rem', borderRadius: '999px',
            border: '1.5px solid transparent',
            transition: 'all 0.2s',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.background = '#f5f5f5'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
        >
            {icon}
            {children}
        </Link>
    );
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
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    color: '#000',
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                }}>
                    <span style={{
                        background: '#3D7A7F',
                        color: 'white',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '1rem',
                        fontWeight: 800,
                    }}>AI</span>
                    <span>.Shop</span>
                </Link>

                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <NavLink href="/products">Products</NavLink>
                    <NavLink href="/orders" icon={<OrdersIcon />}>My Orders</NavLink>
                    <button
                        onClick={onToggleChat}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: isChatOpen ? '#3D7A7F' : 'transparent',
                            border: isChatOpen ? 'none' : '1.5px solid #E5E5E5',
                            cursor: 'pointer',
                            fontWeight: 500,
                            color: isChatOpen ? 'white' : '#404040',
                            fontSize: '0.9rem',
                            padding: '0.45rem 0.9rem',
                            borderRadius: '999px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            if (!isChatOpen) {
                                e.currentTarget.style.background = '#f5f5f5';
                                e.currentTarget.style.borderColor = '#3D7A7F';
                                e.currentTarget.style.color = '#3D7A7F';
                            }
                        }}
                        onMouseLeave={e => {
                            if (!isChatOpen) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = '#E5E5E5';
                                e.currentTarget.style.color = '#404040';
                            }
                        }}
                    >
                        <Sparkles size={15} />
                        AI Assistant
                    </button>
                    <Link href="/cart" style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '999px',
                        border: '1.5px solid #E5E5E5',
                        color: '#404040',
                        transition: 'all 0.2s',
                        marginLeft: '0.25rem',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3D7A7F'; e.currentTarget.style.color = '#3D7A7F'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.color = '#404040'; }}
                    >
                        <ShoppingBagIcon />
                        {count > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                background: '#3D7A7F',
                                color: 'white',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                width: '17px',
                                height: '17px',
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
