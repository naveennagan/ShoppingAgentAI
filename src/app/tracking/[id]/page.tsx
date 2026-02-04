'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, use } from 'react';

// Client components using useSearchParams should be wrapped in Suspense or handle loading state, 
// but for this simple demo it's usually fine in Next.js 14/15 if the page is dynamic.
// However, getting `params` in a client component:
// In Next.js 15, params is a promise even in client components if passed as prop, 
// but here it's likely just a page component receiving params.
// Let's stick to standard handling.

// Note: params and searchParams are promises in latest generic PageProps.
// Since this is 'use client', we should unwrap them or use hooks.

interface PageProps {
    params: Promise<{ id: string }>;
}

function TrackingContent({ id }: { id: string }) {
    const searchParams = useSearchParams();
    const confirmed = searchParams.get('confirmed');

    return (
        <main className="container" style={{ padding: '4rem 0', maxWidth: '600px', textAlign: 'center' }}>
            {confirmed && (
                <div style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                    fontWeight: 600
                }}>
                    Order placed successfully!
                </div>
            )}

            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Order Tracking</h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Order ID: <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{id}</span></p>

            <div className="card" style={{ textAlign: 'left', padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Status: <span style={{ color: 'var(--primary)' }}>Processing</span></h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', borderLeft: '2px solid #e5e7eb', paddingLeft: '2rem', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-2.6rem', top: '0', width: '1.2rem', height: '1.2rem', borderRadius: '50%', background: 'var(--primary)' }} />
                        <h3 style={{ fontWeight: 700 }}>Order Confirmed</h3>
                        <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>We have received your order.</p>
                    </div>
                    <div style={{ position: 'relative', opacity: 0.5 }}>
                        <div style={{ position: 'absolute', left: '-2.6rem', top: '0', width: '1.2rem', height: '1.2rem', borderRadius: '50%', background: '#e5e7eb' }} />
                        <h3 style={{ fontWeight: 700 }}>Shipped</h3>
                        <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Pending...</p>
                    </div>
                    <div style={{ position: 'relative', opacity: 0.5 }}>
                        <div style={{ position: 'absolute', left: '-2.6rem', top: '0', width: '1.2rem', height: '1.2rem', borderRadius: '50%', background: '#e5e7eb' }} />
                        <h3 style={{ fontWeight: 700 }}>Out for Delivery</h3>
                        <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Pending...</p>
                    </div>
                </div>
            </div>

            <Link href="/" className="btn btn-primary" style={{ marginTop: '2rem' }}>
                Continue Shopping
            </Link>
        </main>
    );
}

export default function TrackingPage({ params }: PageProps) {
    // Unwrap params using React.use() if available or just wait for it? 
    // Since it's a client component, `params` prop from Next.js can be a promise.
    // However, to be safe across versions let's handle it.

    // Actually, `use` is available in React 19 / Next.js 15.
    const resolvedParams = use(params);

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TrackingContent id={resolvedParams.id} />
        </Suspense>
    );
}
