'use client';

import Link from 'next/link';
import { Product } from '@/lib/products';
import AddToCartButton from './AddToCartButton';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
            <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '100%',
                marginBottom: '1rem',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#f3f4f6'
            }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={product.image}
                    alt={product.name}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s'
                    }}
                    className="product-image"
                />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                    {product.category}
                </span>
                <Link href={`/products/${product.id}`} style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    margin: '0.5rem 0',
                    display: 'block'
                }}>
                    {product.name}
                </Link>
                <p style={{
                    fontSize: '0.9rem',
                    color: '#4b5563',
                    marginBottom: '1rem',
                    flex: 1, /* Pushes price to bottom */
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {product.description}
                </p>

                <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            ${product.price.toFixed(2)}
                        </span>
                    </div>
                    <AddToCartButton product={product} />
                </div>
            </div>
        </div>
    );
}
