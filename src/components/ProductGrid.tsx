'use client';

import { useState } from 'react';
import { Product } from '@/lib/products';
import ProductCard from './ProductCard';

const PRODUCTS_PER_PAGE = 25;

interface ProductGridProps {
    products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
    const startIdx = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const pageProducts = products.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

    return (
        <>
            <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                Showing {startIdx + 1}–{Math.min(startIdx + PRODUCTS_PER_PAGE, products.length)} of {products.length} products
            </div>

            <div className="products-page__grid">
                {pageProducts.map((product: Product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            {totalPages > 1 && (
                <nav aria-label="Product pagination" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '2rem',
                    paddingBottom: '2rem'
                }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            background: currentPage === 1 ? '#f3f4f6' : '#fff',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            color: currentPage === 1 ? '#9ca3af' : '#374151'
                        }}
                    >
                        Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            aria-current={page === currentPage ? 'page' : undefined}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: page === currentPage ? 'var(--primary)' : '#d1d5db',
                                background: page === currentPage ? 'var(--primary)' : '#fff',
                                color: page === currentPage ? '#fff' : '#374151',
                                cursor: 'pointer',
                                fontWeight: page === currentPage ? 600 : 400
                            }}
                        >
                            {page}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            background: currentPage === totalPages ? '#f3f4f6' : '#fff',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            color: currentPage === totalPages ? '#9ca3af' : '#374151'
                        }}
                    >
                        Next
                    </button>
                </nav>
            )}
        </>
    );
}
