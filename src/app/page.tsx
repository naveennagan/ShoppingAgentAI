import Link from 'next/link';
import { products } from '@/lib/products';

export default function Home() {
  const featuredProducts = products.slice(0, 6);

  return (
    <main>
      {/* Hero Section - EE Style */}
      <section style={{
        background: '#3D7A7F',
        color: 'white',
        padding: '5rem 2rem',
        marginBottom: '3rem'
      }}>
        <div className="container" style={{ maxWidth: '1400px' }}>
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
            fontWeight: 700, 
            marginBottom: '1.5rem', 
            lineHeight: 1.1,
            letterSpacing: '0.02em'
          }}>
            DISCOVER AMAZING<br/>PRODUCTS WITH<br/>AI SHOPPING
          </h1>
          <p style={{ fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '500px', lineHeight: 1.6 }}>
            Find exactly what you need with our intelligent shopping assistant.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/products" style={{
              background: 'white',
              color: '#000',
              padding: '0.875rem 2rem',
              borderRadius: '50px',
              fontWeight: 600,
              display: 'inline-block'
            }}>
              Shop products
            </Link>
            <Link href="/products" style={{
              background: 'transparent',
              color: 'white',
              padding: '0.875rem 2rem',
              borderRadius: '50px',
              fontWeight: 600,
              border: '2px solid white',
              display: 'inline-block'
            }}>
              Browse deals
            </Link>
          </div>
        </div>
      </section>

      {/* Products Section - EE Style */}
      <section className="container" style={{ marginBottom: '4rem', maxWidth: '1400px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>AI.Shop recommends</h2>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {featuredProducts.map(product => (
            <Link href={`/products/${product.id}`} key={product.id} style={{ display: 'block' }}>
              <div style={{
                background: '#F5F5F5',
                borderRadius: '12px',
                padding: '1.5rem',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}>
                <div style={{ 
                  background: 'white', 
                  borderRadius: '8px', 
                  padding: '1.5rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px'
                }}>
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }}
                  />
                </div>
                <h3 style={{ 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  marginBottom: '0.75rem',
                  lineHeight: 1.3,
                  minHeight: '2.6em'
                }}>
                  {product.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>£{product.price.toFixed(2)}</span>
                  {product.price > 200 && (
                    <span style={{ 
                      background: '#FFE500', 
                      color: '#000', 
                      padding: '0.125rem 0.5rem', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>Saving £50</span>
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
