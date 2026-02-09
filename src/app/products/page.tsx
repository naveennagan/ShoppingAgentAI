import { apiClient } from '@/lib/api-client';
import ProductCard from '@/components/ProductCard';

export default async function ProductsPage() {
    const products = await apiClient.getProducts();
    return (
        <main className="container" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '3rem', marginTop: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
                    Our Collection
                </h1>
                <p style={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                    Explore our curated selection of premium goods, hand-picked for quality and style.
                </p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '2rem'
            }}>
                {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}
