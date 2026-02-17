export interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image: string;
    specs?: Record<string, string>;
    brand?: string;
    stock?: number;
    rating?: number;
    tags?: string[];
}

export interface Promotion {
    id: string;
    name: string;
    description: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    promoCode: string | null;
    startDate: string | null;
    endDate: string | null;
    promotionalLabel: string | null;
    active: boolean;
    createdAt: string;
}

export interface BundleItem {
    id: string;
    bundleId: string;
    productId: string;
    createdAt: string;
}

export interface Bundle {
    id: string;
    name: string;
    description: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    active: boolean;
    createdAt: string;
    items: BundleItem[];
}
