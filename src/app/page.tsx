import Link from 'next/link';
import Image from 'next/image';
import { products } from '@/lib/products';

export default function Home() {
  const featuredProducts = products.slice(0, 4);

  return (
    <main>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
        color: 'white',
        padding: '6rem 1rem',
        textAlign: 'center',
        borderRadius: '0 0 2rem 2rem',
        marginBottom: '4rem'
      }}>
        <div className="container">
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.2 }}>
            The Future of Shopping is Here
          </h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            Experience the world's first AI-powered shopping assistant.
            Find products, compare specs, and get exclusive deals just by chatting.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/products" className="btn" style={{ background: 'white', color: 'var(--primary)', padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container" style={{ marginBottom: '6rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
        {[
          { icon: '🤖', title: 'AI Assistant', desc: 'Chat to find exactly what you need in seconds.' },
          { icon: '⚡', title: 'Smart Specs', desc: 'Instant spec comparisons and deal recommendations.' },
          { icon: '📦', title: 'Fast Shipping', desc: 'Free express shipping on all orders over $50.' }
        ].map((feature, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{feature.title}</h3>
            <p style={{ color: '#6b7280' }}>{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Featured Products */}
      <section className="container" style={{ marginBottom: '6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Featured Products</h2>
          <Link href="/products" style={{ color: 'var(--primary)', fontWeight: 600 }}>View All →</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
          {featuredProducts.map(product => (
            <Link href={`/products/${product.id}`} key={product.id} className="card" style={{ display: 'block', overflow: 'hidden', padding: 0 }}>
              <div style={{ position: 'relative', paddingBottom: '100%', background: '#f3f4f6' }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {product.category}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>${product.price.toFixed(2)}</span>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>View Details</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
