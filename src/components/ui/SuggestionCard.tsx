'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Product } from '@/lib/products';

interface SuggestionCardProps {
    product: Product;
    highlight?: boolean;
}

export default function SuggestionCard({ product, highlight }: SuggestionCardProps) {
    const { addToCart } = useCart();
    const [added, setAdded] = useState(false);

    const handleAdd = () => {
        addToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
    };

    return (
        <div className={`suggestion-card ${highlight ? 'suggestion-card--highlight' : 'suggestion-card--default'}`}>
            {highlight && (
                <div style={{
                    position: 'absolute', top: '6px', left: '6px', zIndex: 1,
                    background: 'var(--primary)', color: 'white', fontSize: '0.6rem',
                    fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                    letterSpacing: '0.05em', textTransform: 'uppercase'
                }}>Best pick</div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={product.name}
                style={{ width: '100%', height: '100px', objectFit: 'cover', background: '#f3f4f6' }} />
            <div style={{ padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                <span style={{
                    fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.3, color: '#1f2937',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>{product.name}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
                    £{product.price.toFixed(2)}
                </span>
                <button onClick={handleAdd} style={{
                    marginTop: 'auto', padding: '0.35rem 0.5rem',
                    background: added ? 'var(--success)' : 'var(--primary)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontSize: '0.72rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                    transition: 'background 0.2s', fontWeight: 600
                }}>
                    {added ? '✓ Added' : <><Plus size={11} /> Add to cart</>}
                </button>
            </div>
        </div>
    );
}
