import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: PageProps) {
    const { id } = await params;
    const product = await apiClient.getProductById(id);

    if (!product) {
        notFound();
    }

    return (
        <main className="container" style={{ paddingBottom: '4rem', marginTop: '2rem' }}>
            <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: '2rem', color: '#6b7280', fontWeight: 500 }}>
                ← Back to Products
            </Link>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
                {/* Image Section */}
                <div style={{ background: '#f3f4f6', borderRadius: '1rem', overflow: 'hidden', paddingBottom: '100%', position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={product.image.replace('400x400', '800x800')}
                        alt={product.name}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                {/* Details Section */}
                <div>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {product.category}
                    </span>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '0.5rem 0 1rem', lineHeight: 1.1 }}>
                        {product.name}
                    </h1>
                    <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', marginBottom: '2rem' }}>
                        ${product.price.toFixed(2)}
                    </p>

                    <div style={{ marginBottom: '2rem', lineHeight: 1.6, color: '#4b5563' }}>
                        {product.description}
                    </div>

                    <AddToCartButton product={product} />

                    {/* Specs Section */}
                    {product.specs && (
                        <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 700 }}>Technical Specifications</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                gap: '1rem',
                                border: '1px solid var(--border)',
                                borderRadius: '0.5rem',
                                padding: '1.5rem',
                                background: 'white'
                            }}>
                                {Object.entries(product.specs).map(([key, value]) => (
                                    <div key={key} style={{ display: 'contents' }}>
                                        <div style={{ color: '#6b7280', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>{key}</div>
                                        <div style={{ fontWeight: 600, color: '#111827', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', paddingTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                        <ul>
                            <li>Premium materials & build quality</li>
                            <li>2-year warranty included</li>
                            <li>Free shipping & 30-day returns</li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
