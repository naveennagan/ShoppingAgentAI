import { apiClient } from '@/lib/api-client';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/products';

export default async function ProductsPage() {
    const products = await apiClient.getProducts();
    return (
        <main className="container products-page">
            <header className="products-page__header">
                <h1>Our Collection</h1>
                <p>Explore our curated selection of premium goods, hand-picked for quality and style.</p>
            </header>

            <div className="products-page__grid">
                {products.map((product: Product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}
