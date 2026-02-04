export interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image: string;
    specs?: Record<string, string>;
}

export const products: Product[] = [
    // Electronics - Headphones
    {
        id: '1',
        name: 'Pro Wireless Noise-Cancelling Headphones',
        price: 299.99,
        description: 'Industry-leading noise cancellation with 30-hour battery life and premium sound quality.',
        category: 'Electronics',
        image: 'https://placehold.co/400x400/4f46e5/ffffff?text=Pro+Headphones',
        specs: {
            'Battery Life': '30 Hours',
            'Noise Cancellation': 'Active (ANC)',
            'Connectivity': 'Bluetooth 5.2',
            'Weight': '250g'
        }
    },
    {
        id: '1-b',
        name: 'Studio Monitor Headphones',
        price: 149.99,
        description: 'Neutral sound signature perfect for mixing and mastering or audiophile listening.',
        category: 'Electronics',
        image: 'https://placehold.co/400x400/3730a3/ffffff?text=Studio+Headphones',
        specs: {
            'Type': 'Open-Back',
            'Impedance': '80 Ohms',
            'Cable': 'Detachable 3m',
            'Weight': '300g'
        }
    },

    // Electronics - Wearables
    {
        id: '2',
        name: 'Ultra Smart Fitness Watch',
        price: 199.50,
        description: 'Advanced health tracking including ECG, SpO2, and sleep analysis. Water resistant up to 50m.',
        category: 'Electronics',
        image: 'https://placehold.co/400x400/ec4899/ffffff?text=Smart+Watch',
        specs: {
            'Battery Life': '7 Days',
            'Sensors': 'Heart Rate, SpO2, GPS',
            'Water Resistance': '5ATM',
            'Display': 'AMOLED'
        }
    },

    // Electronics - Phones
    {
        id: 'ph-1',
        name: 'Flagship Smartphone X1',
        price: 999.00,
        description: 'The ultimate smartphone experience with a pro-grade camera system and blazing fast processor.',
        category: 'Electronics',
        image: 'https://placehold.co/400x400/2563eb/ffffff?text=Phone+X1',
        specs: {
            'Processor': 'Snapdragon 8 Gen 3',
            'RAM': '12GB',
            'Storage': '256GB',
            'Screen': '6.8-inch OLED 120Hz',
            'Camera': '200MP Main'
        }
    },
    {
        id: 'ph-2',
        name: 'Budget King Smartphone Lite',
        price: 499.00,
        description: 'All the essentials you need with an amazing battery life and clean software.',
        category: 'Electronics',
        image: 'https://placehold.co/400x400/60a5fa/ffffff?text=Phone+Lite',
        specs: {
            'Processor': 'Snapdragon 7+ Gen 2',
            'RAM': '8GB',
            'Storage': '128GB',
            'Screen': '6.5-inch OLED 90Hz',
            'Camera': '64MP Main'
        }
    },

    // Electronics - Laptops
    {
        id: 'lap-1',
        name: 'Creator Laptop Pro 16',
        price: 2499.00,
        description: 'Powerhouse workstation for video editing and 3D rendering.',
        category: 'Electronics',
        image: 'https://placehold.co/400x400/475569/ffffff?text=Laptop+Pro',
        specs: {
            'Processor': 'M3 Max',
            'RAM': '64GB',
            'Storage': '2TB SSD',
            'Display': '16-inch Mini-LED',
            'GPU': '40-core'
        }
    },
    {
        id: 'lap-2',
        name: 'AirLight Laptop 13',
        price: 1199.00,
        description: 'Incredibly thin and light, perfect for students and professionals on the go.',
        category: 'Electronics',
        image: 'https://placehold.co/400x400/94a3b8/ffffff?text=Laptop+Air',
        specs: {
            'Processor': 'M2',
            'RAM': '16GB',
            'Storage': '512GB SSD',
            'Display': '13.6-inch LCD',
            'Weight': '1.24kg'
        }
    },

    // Furniture
    {
        id: '3',
        name: 'Ergonomic Mesh Chair',
        price: 349.00,
        description: 'Designed for 24/7 comfort with adjustable lumbar, armrests, and headrest.',
        category: 'Furniture',
        image: 'https://placehold.co/400x400/8b5cf6/ffffff?text=Office+Chair',
        specs: {
            'Material': 'Breathable Mesh',
            'Weight Capacity': '300lbs',
            'Adjustability': 'Height, Tilt, Lumbar',
            'Warranty': '10 Years'
        }
    },
    {
        id: 'fur-2',
        name: 'Standing Desk Pro',
        price: 599.00,
        description: 'Dual-motor electric standing desk with memory presets and solid wood top.',
        category: 'Furniture',
        image: 'https://placehold.co/400x400/c2410c/ffffff?text=Standing+Desk',
        specs: {
            'Height Range': '24" - 50"',
            'Weight Capacity': '350lbs',
            'Top Material': 'Walnut',
            'Width': '60 inches'
        }
    },

    // Accessories
    {
        id: '4',
        name: 'Waterproof Travel Backpack',
        price: 89.99,
        description: 'Keep your gear safe and dry with this rugged, organized backpack.',
        category: 'Accessories',
        image: 'https://placehold.co/400x400/10b981/ffffff?text=Backpack',
        specs: {
            'Capacity': '30L',
            'Material': '500D Nylon',
            'Laptop Sleeve': 'Up to 16"',
            'Waterproof': 'IPX6'
        }
    },
    {
        id: 'acc-2',
        name: 'Mechanical Gaming Keyboard',
        price: 129.99,
        description: 'RGB backlit keyboard with hot-swappable switches and aluminum frame.',
        category: 'Accessories',
        image: 'https://placehold.co/400x400/f59e0b/ffffff?text=Keyboard',
        specs: {
            'Switch Type': 'Red Linear',
            'Form Factor': 'TKL (80%)',
            'Connectivity': 'Wired/Wireless',
            'Backlight': 'Per-key RGB'
        }
    },
    {
        id: 'acc-3',
        name: 'Precision Wireless Mouse',
        price: 79.99,
        description: 'Ergonomic shape with high-precision sensor for productivity and gaming.',
        category: 'Accessories',
        image: 'https://placehold.co/400x400/d97706/ffffff?text=Mouse',
        specs: {
            'DPI': '20,000',
            'Buttons': '7 Programmable',
            'Battery': 'Rechargeable 70h',
            'Weight': '80g'
        }
    },

    // Home
    {
        id: '6',
        name: 'Ceramic Coffee Mug Set',
        price: 35.00,
        description: 'Minimalist stoneware mugs, perfect for your morning brew. Set of 4.',
        category: 'Home',
        image: 'https://placehold.co/400x400/ef4444/ffffff?text=Mugs',
        specs: {
            'Capacity': '12oz',
            'Material': 'Stoneware',
            'Microwave Safe': 'Yes',
            'Dishwasher Safe': 'Yes'
        }
    },
    {
        id: 'home-2',
        name: 'Smart Air Purifier',
        price: 159.00,
        description: 'HEPA filter purifier that cleans air in rooms up to 400 sq ft. App controlled.',
        category: 'Home',
        image: 'https://placehold.co/400x400/14b8a6/ffffff?text=Air+Purifier',
        specs: {
            'Filter Type': 'True HEPA H13',
            'Coverage': '400 sq ft',
            'Noise Level': '24dB (Sleep Mode)',
            'Smart Features': 'WiFi, Voice Control'
        }
    }
];

// Define active deals/bundles
export const deals = [
    {
        id: 'deal-1',
        title: 'Work From Home Bundle',
        description: 'Buy a Standing Desk and get the Ergonomic Chair for 20% off!',
        triggerProducts: ['fur-2', '3'],
        discount: '20%'
    },
    {
        id: 'deal-2',
        title: 'Audiophile Starter',
        description: 'Buy the Pro Headphones, get the Stand for free (if we had one!). For now, enjoy 10% off.',
        triggerProducts: ['1'],
        discount: '10%'
    },
    {
        id: 'deal-3',
        title: 'Mobile Power User',
        description: 'Purchase Flagship Phone X1 and get the Smart Watch for $50 off.',
        triggerProducts: ['ph-1', '2'],
        discount: '$50 off'
    }
];
