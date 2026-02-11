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
        <main className="container product-detail">
            <Link href="/products" className="product-detail__back">
                ← Back to Products
            </Link>

            <div className="product-detail__grid">
                <div className="product-detail__image">
                    <img
                        src={product.image.replace('400x400', '800x800')}
                        alt={product.name}
                    />
                </div>

                <div>
                    <span className="product-detail__category">{product.category}</span>
                    <h1 className="product-detail__title">{product.name}</h1>
                    <p className="product-detail__price">${product.price.toFixed(2)}</p>

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
