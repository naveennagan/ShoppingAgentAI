'use client';

import { useState } from 'react';
import { Product } from '@/lib/products';
import ProductCard from './ProductCard';
import { Pagination } from './ui';

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

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
    );
}
