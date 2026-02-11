import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Product } from '@/lib/products';

export default async function Home() {
  const products = await apiClient.getProducts();
  const featuredProducts = products.slice(0, 6);

  return (
    <main>
      <section className="home__hero">
        <div className="container" style={{ maxWidth: '1400px' }}>
          <h1 className="home__hero-title">
            DISCOVER AMAZING<br/>PRODUCTS WITH<br/>AI SHOPPING
          </h1>
          <p className="home__hero-subtitle">
            Find exactly what you need with our intelligent shopping assistant.
          </p>
          <div className="home__hero-buttons">
            <Link href="/products" className="home__hero-btn home__hero-btn--primary">
              Shop products
            </Link>
            <Link href="/products" className="home__hero-btn home__hero-btn--secondary">
              Browse deals
            </Link>
          </div>
        </div>
      </section>

      <section className="container home__products">
        <h2 className="home__products-title">AI.Shop recommends</h2>

        <div className="home__products-grid">
          {featuredProducts.map((product: Product) => (
            <Link href={`/products/${product.id}`} key={product.id} className="home__products-card">
              <div className="home__products-card-wrapper">
                <div className="home__products-card-image">
                  <img src={product.image} alt={product.name} />
                </div>
                <h3 className="home__products-card-title">{product.name}</h3>
                <div className="home__products-card-price-row">
                  <span className="home__products-card-price">${product.price.toFixed(2)}</span>
                  {product.price > 200 && (
                    <span className="home__products-card-badge">Saving £50</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
