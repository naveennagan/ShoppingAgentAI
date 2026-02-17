import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';
import { Promotion, Bundle } from '@/lib/products';
import { calculateDiscountedPrice } from '@/lib/discountCalculator';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: PageProps) {
    const { id } = await params;

    let product;
    let promotions: Promotion[] = [];
    let bundles: Bundle[] = [];

    try {
        [product, promotions, bundles] = await Promise.all([
            apiClient.getProductById(id),
            apiClient.getPromotionsForProduct(id).catch(() => []),
            apiClient.getActiveBundles().catch(() => []),
        ]);
    } catch {
        notFound();
    }

    if (!product) {
        notFound();
    }

    const activePromo = promotions.find((p: Promotion) => p.active);
    const discountedPrice = activePromo
        ? calculateDiscountedPrice(product.price, activePromo.discountType, activePromo.discountValue)
        : null;

    // Filter bundles that include this product
    const relevantBundles = bundles.filter((b: Bundle) =>
        b.items?.some(item => item.productId === id)
    );

    return (
        <main className="container product-detail">
            <Link href="/products" className="product-detail__back">
                ← Back to Products
            </Link>

            <div className="product-detail__grid">
                <div className="product-detail__image">
                    <img
                        src={product.image?.replace('400x400', '800x800') || ''}
                        alt={product.name}
                    />
                </div>

                <div>
                    <span className="product-detail__category">{product.category}</span>
                    <h1 className="product-detail__title">{product.name}</h1>

                    <div className="product-detail__price">
                        {discountedPrice !== null ? (
                            <>
                                <span style={{ color: '#ef4444' }}>£{discountedPrice.toFixed(2)}</span>
                                <span style={{ fontSize: '1rem', color: '#9ca3af', textDecoration: 'line-through', marginLeft: '0.75rem' }}>
                                    £{product.price.toFixed(2)}
                                </span>
                            </>
                        ) : (
                            <span>£{product.price.toFixed(2)}</span>
                        )}
                    </div>

                    {activePromo && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1rem'
                        }}>
                            <span style={{ fontWeight: 600, color: '#ef4444' }}>
                                {activePromo.promotionalLabel || activePromo.name}
                            </span>
                            {activePromo.description && (
                                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                                    {activePromo.description}
                                </p>
                            )}
                            {activePromo.promoCode && (
                                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                    Use code: <code style={{ background: '#fee2e2', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>{activePromo.promoCode}</code>
                                </p>
                            )}
                        </div>
                    )}

                    <div className="product-detail__description">{product.description}</div>

                    <AddToCartButton product={product} />

                    {product.specs && (
                        <div className="product-detail__specs">
                            <h3>Technical Specifications</h3>
                            <div className="product-detail__specs-grid">
                                {Object.entries(product.specs).map(([key, value]: [string, unknown]) => (
                                    <div key={key} style={{ display: 'contents' }}>
                                        <div className="product-detail__specs-key">{key}</div>
                                        <div className="product-detail__specs-value">{String(value)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {relevantBundles.length > 0 && (
                        <div style={{
                            marginTop: '1.5rem',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '1rem'
                        }}>
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Bundle Deals</h3>
                            {relevantBundles.map((bundle: Bundle) => (
                                <div key={bundle.id} style={{ marginBottom: '0.5rem' }}>
                                    <span style={{ fontWeight: 600, color: '#16a34a' }}>{bundle.name}</span>
                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                        {bundle.discountType === 'percentage'
                                            ? `${bundle.discountValue}% off`
                                            : `£${bundle.discountValue} off`}
                                    </span>
                                    {bundle.description && (
                                        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                                            {bundle.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="product-detail__features">
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
