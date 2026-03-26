import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Product } from '@/lib/products';

interface ProductWidgetProps {
  product: Product;
}

export default function ProductWidget({ product }: ProductWidgetProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '1rem',
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      maxWidth: '280px'
    }}>
      <img
        src={product.image}
        alt={product.name}
        style={{
          width: '100%',
          height: '150px',
          objectFit: 'cover',
          borderRadius: '6px',
          marginBottom: '0.75rem'
        }}
      />
      
      <h4 style={{
        margin: '0 0 0.5rem 0',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#333'
      }}>
        {product.name}
      </h4>
      
      <p style={{
        margin: '0 0 0.75rem 0',
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#2563eb'
      }}>
        ${product.price.toFixed(2)}
      </p>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        <span style={{ fontSize: '0.875rem', color: '#666' }}>Qty:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            style={{
              width: '28px',
              height: '28px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            -
          </button>
          <span style={{ minWidth: '30px', textAlign: 'center' }}>
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            style={{
              width: '28px',
              height: '28px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
      </div>
      
      <button
        onClick={() => addToCart(product, quantity)}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}