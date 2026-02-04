'use client';

import { useCart } from '@/context/CartContext';
import { Product } from '@/lib/products';
import { useState } from 'react';

export default function AddToCartButton({ product }: { product: Product }) {
    const { addToCart } = useCart();
    const [added, setAdded] = useState(false);

    const handleClick = () => {
        addToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    return (
        <button
            onClick={handleClick}
            className="btn btn-primary"
            style={{
                width: '100%',
                fontSize: '1.1rem',
                padding: '1rem',
                background: added ? 'var(--secondary)' : 'var(--primary)',
                transition: 'background 0.3s'
            }}
        >
            {added ? 'Added to Cart!' : 'Add to Cart'}
        </button>
    );
}
