import { apiClient } from '@/lib/api-client';
import { Product } from '@/lib/products';
import ProductGrid from '@/components/ProductGrid';

export default async function ProductsPage() {
    let products: Product[] = [];
    let error = '';

    try {
        products = await apiClient.getProducts();
    } catch (e) {
        error = 'Unable to load products. Please try again later.';
    }

    return (
        <main className="container products-page">
            <header className="products-page__header">
                <h1>Our Collection</h1>
                <p>Explore our curated selection of premium goods, hand-picked for quality and style.</p>
            </header>

            {error ? (
                <p style={{ textAlign: 'center', color: '#ef4444', padding: '2rem' }}>{error}</p>
            ) : (
                <ProductGrid products={products} />
            )}
        </main>
    );
}
