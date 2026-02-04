'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';

// Helper for icons
function ShoppingBagIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    );
}

export default function Navbar() {
    const { count } = useCart();

    return (
        <nav style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 50
        }}>
            <div className="container" style={{
                height: '4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Link href="/" style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    AI.Shop
                </Link>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link href="/products" style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                        Products
                    </Link>
                    <Link href="/cart" style={{ position: 'relative' }}>
                        <ShoppingBagIcon />
                        {count > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                background: 'var(--secondary)',
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

