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

export const products: Product[] = [
    // Electronics - Headphones
    {
        id: '1',
        name: 'Pro Wireless Noise-Cancelling Headphones',
        price: 299.99,
        description: 'Industry-leading noise cancellation with 30-hour battery life and premium sound quality.',
        category: 'Electronics',
        brand: 'AudioTech',
        stock: 45,
        rating: 4.8,
        tags: ['wireless', 'noise-cancelling', 'premium', 'travel'],
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
        brand: 'AudioTech',
        stock: 32,
        rating: 4.7,
        tags: ['wired', 'studio', 'professional', 'audiophile'],
        image: 'https://placehold.co/400x400/3730a3/ffffff?text=Studio+Headphones',
        specs: {
            'Type': 'Open-Back',
            'Impedance': '80 Ohms',
            'Cable': 'Detachable 3m',
            'Weight': '300g'
        }
    },
    {
        id: 'hp-3',
        name: 'Sport Wireless Earbuds',
        price: 89.99,
        description: 'Sweat-proof earbuds with secure fit and powerful bass. Perfect for workouts.',
        category: 'Electronics',
        brand: 'FitSound',
        stock: 120,
        rating: 4.5,
        tags: ['wireless', 'sport', 'waterproof', 'earbuds'],
        image: 'https://placehold.co/400x400/06b6d4/ffffff?text=Sport+Earbuds',
        specs: {
            'Battery Life': '8 Hours (24h with case)',
            'Water Resistance': 'IPX7',
            'Connectivity': 'Bluetooth 5.3',
            'Weight': '5g per earbud'
        }
    },

    // Electronics - Wearables
    {
        id: '2',
        name: 'Ultra Smart Fitness Watch',
        price: 199.50,
        description: 'Advanced health tracking including ECG, SpO2, and sleep analysis. Water resistant up to 50m.',
        category: 'Electronics',
        brand: 'FitTech',
        stock: 78,
        rating: 4.6,
        tags: ['smartwatch', 'fitness', 'health', 'waterproof'],
        image: 'https://placehold.co/400x400/ec4899/ffffff?text=Smart+Watch',
        specs: {
            'Battery Life': '7 Days',
            'Sensors': 'Heart Rate, SpO2, GPS',
            'Water Resistance': '5ATM',
            'Display': 'AMOLED'
        }
    },
    {
        id: 'watch-2',
        name: 'Classic Analog Smartwatch',
        price: 279.00,
        description: 'Elegant hybrid watch with smart features. Traditional look, modern tech.',
        category: 'Electronics',
        brand: 'TimeTech',
        stock: 42,
        rating: 4.4,
        tags: ['smartwatch', 'hybrid', 'elegant', 'business'],
        image: 'https://placehold.co/400x400/78716c/ffffff?text=Hybrid+Watch',
        specs: {
            'Battery Life': '30 Days',
            'Display': 'Analog + Digital',
            'Water Resistance': '10ATM',
            'Material': 'Stainless Steel'
        }
    },

    // Electronics - Phones
    {
        id: 'ph-1',
        name: 'Flagship Smartphone X1',
        price: 999.00,
        description: 'The ultimate smartphone experience with a pro-grade camera system and blazing fast processor.',
        category: 'Electronics',
        brand: 'TechPro',
        stock: 25,
        rating: 4.9,
        tags: ['flagship', '5G', 'camera', 'premium'],
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
        brand: 'ValueTech',
        stock: 95,
        rating: 4.3,
        tags: ['budget', '5G', 'long-battery', 'value'],
        image: 'https://placehold.co/400x400/60a5fa/ffffff?text=Phone+Lite',
        specs: {
            'Processor': 'Snapdragon 7+ Gen 2',
            'RAM': '8GB',
            'Storage': '128GB',
            'Screen': '6.5-inch OLED 90Hz',
            'Camera': '64MP Main'
        }
    },
    {
        id: 'ph-3',
        name: 'Compact Pro Smartphone',
        price: 749.00,
        description: 'Powerful performance in a pocket-friendly size. Perfect for one-handed use.',
        category: 'Electronics',
        brand: 'MiniTech',
        stock: 58,
        rating: 4.7,
        tags: ['compact', '5G', 'lightweight', 'portable'],
        image: 'https://placehold.co/400x400/8b5cf6/ffffff?text=Compact+Pro',
        specs: {
            'Processor': 'Snapdragon 8 Gen 2',
            'RAM': '8GB',
            'Storage': '256GB',
            'Screen': '5.9-inch OLED 120Hz',
            'Camera': '50MP Main'
        }
    },

    // Electronics - Laptops
    {
        id: 'lap-1',
        name: 'Creator Laptop Pro 16',
        price: 2499.00,
        description: 'Powerhouse workstation for video editing and 3D rendering.',
        category: 'Electronics',
        brand: 'ProBook',
        stock: 18,
        rating: 4.9,
        tags: ['laptop', 'professional', 'creator', 'high-performance'],
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
        brand: 'AirBook',
        stock: 67,
        rating: 4.6,
        tags: ['laptop', 'portable', 'lightweight', 'student'],
        image: 'https://placehold.co/400x400/94a3b8/ffffff?text=Laptop+Air',
        specs: {
            'Processor': 'M2',
            'RAM': '16GB',
            'Storage': '512GB SSD',
            'Display': '13.6-inch LCD',
            'Weight': '1.24kg'
        }
    },
    {
        id: 'lap-3',
        name: 'Gaming Beast Laptop 17',
        price: 1899.00,
        description: 'Dominate every game with RTX graphics and high refresh rate display.',
        category: 'Electronics',
        brand: 'GameForce',
        stock: 34,
        rating: 4.7,
        tags: ['laptop', 'gaming', 'RGB', 'high-refresh'],
        image: 'https://placehold.co/400x400/dc2626/ffffff?text=Gaming+Laptop',
        specs: {
            'Processor': 'Intel i9-14900HX',
            'RAM': '32GB DDR5',
            'Storage': '1TB SSD',
            'Display': '17.3-inch QHD 240Hz',
            'GPU': 'RTX 4080'
        }
    },

    // Furniture
    {
        id: '3',
        name: 'Ergonomic Mesh Chair',
        price: 349.00,
        description: 'Designed for 24/7 comfort with adjustable lumbar, armrests, and headrest.',
        category: 'Furniture',
        brand: 'ComfortPro',
        stock: 52,
        rating: 4.8,
        tags: ['chair', 'ergonomic', 'office', 'adjustable'],
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
        brand: 'DeskMaster',
        stock: 28,
        rating: 4.9,
        tags: ['desk', 'standing', 'electric', 'ergonomic'],
        image: 'https://placehold.co/400x400/c2410c/ffffff?text=Standing+Desk',
        specs: {
            'Height Range': '24" - 50"',
            'Weight Capacity': '350lbs',
            'Top Material': 'Walnut',
            'Width': '60 inches'
        }
    },
    {
        id: 'fur-3',
        name: 'Monitor Arm Dual Mount',
        price: 129.00,
        description: 'Free up desk space with this sturdy dual monitor arm. Supports up to 32" displays.',
        category: 'Furniture',
        brand: 'MountTech',
        stock: 85,
        rating: 4.5,
        tags: ['monitor-arm', 'dual', 'adjustable', 'space-saving'],
        image: 'https://placehold.co/400x400/6366f1/ffffff?text=Monitor+Arm',
        specs: {
            'Max Monitor Size': '32 inches',
            'Weight Capacity': '20lbs per arm',
            'Adjustment': '360° rotation',
            'VESA': '75x75, 100x100'
        }
    },

    // Accessories
    {
        id: '4',
        name: 'Waterproof Travel Backpack',
        price: 89.99,
        description: 'Keep your gear safe and dry with this rugged, organized backpack.',
        category: 'Accessories',
        brand: 'TravelGear',
        stock: 145,
        rating: 4.6,
        tags: ['backpack', 'waterproof', 'travel', 'laptop'],
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
        brand: 'KeyMaster',
        stock: 73,
        rating: 4.7,
        tags: ['keyboard', 'mechanical', 'RGB', 'gaming'],
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
        brand: 'ClickPro',
        stock: 98,
        rating: 4.6,
        tags: ['mouse', 'wireless', 'ergonomic', 'gaming'],
        image: 'https://placehold.co/400x400/d97706/ffffff?text=Mouse',
        specs: {
            'DPI': '20,000',
            'Buttons': '7 Programmable',
            'Battery': 'Rechargeable 70h',
            'Weight': '80g'
        }
    },
    {
        id: 'acc-4',
        name: 'USB-C Hub 7-in-1',
        price: 49.99,
        description: 'Expand your laptop connectivity with HDMI, USB 3.0, SD card reader, and more.',
        category: 'Accessories',
        brand: 'ConnectHub',
        stock: 156,
        rating: 4.4,
        tags: ['hub', 'USB-C', 'adapter', 'portable'],
        image: 'https://placehold.co/400x400/64748b/ffffff?text=USB+Hub',
        specs: {
            'Ports': '7 (HDMI, 3xUSB, SD, microSD, PD)',
            'HDMI Output': '4K@60Hz',
            'Power Delivery': '100W',
            'Material': 'Aluminum'
        }
    },
    {
        id: 'acc-5',
        name: 'Webcam 4K Pro',
        price: 159.99,
        description: 'Crystal clear 4K video calls with auto-focus and built-in dual microphones.',
        category: 'Accessories',
        brand: 'CamTech',
        stock: 64,
        rating: 4.8,
        tags: ['webcam', '4K', 'streaming', 'video-call'],
        image: 'https://placehold.co/400x400/0891b2/ffffff?text=Webcam',
        specs: {
            'Resolution': '4K@30fps',
            'Field of View': '90°',
            'Microphones': 'Dual Stereo',
            'Mount': 'Universal Clip'
        }
    },

    // Home
    {
        id: '6',
        name: 'Ceramic Coffee Mug Set',
        price: 35.00,
        description: 'Minimalist stoneware mugs, perfect for your morning brew. Set of 4.',
        category: 'Home',
        brand: 'HomeStyle',
        stock: 210,
        rating: 4.5,
        tags: ['mug', 'ceramic', 'kitchen', 'set'],
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
        brand: 'PureAir',
        stock: 47,
        rating: 4.7,
        tags: ['air-purifier', 'smart', 'HEPA', 'health'],
        image: 'https://placehold.co/400x400/14b8a6/ffffff?text=Air+Purifier',
        specs: {
            'Filter Type': 'True HEPA H13',
            'Coverage': '400 sq ft',
            'Noise Level': '24dB (Sleep Mode)',
            'Smart Features': 'WiFi, Voice Control'
        }
    },
    {
        id: 'home-3',
        name: 'LED Desk Lamp with Wireless Charging',
        price: 69.99,
        description: 'Adjustable LED lamp with built-in wireless charger and USB ports.',
        category: 'Home',
        brand: 'LightUp',
        stock: 132,
        rating: 4.6,
        tags: ['lamp', 'LED', 'wireless-charging', 'desk'],
        image: 'https://placehold.co/400x400/fbbf24/ffffff?text=Desk+Lamp',
        specs: {
            'Brightness Levels': '5',
            'Color Temperature': '3000K-6500K',
            'Wireless Charging': '15W',
            'USB Ports': '2'
        }
    },
    {
        id: 'home-4',
        name: 'Robot Vacuum Cleaner',
        price: 299.00,
        description: 'Smart navigation robot vacuum with mopping function and auto-empty base.',
        category: 'Home',
        brand: 'CleanBot',
        stock: 38,
        rating: 4.8,
        tags: ['robot-vacuum', 'smart', 'cleaning', 'automation'],
        image: 'https://placehold.co/400x400/06b6d4/ffffff?text=Robot+Vacuum',
        specs: {
            'Suction Power': '4000Pa',
            'Battery Life': '180 minutes',
            'Dustbin': '450ml',
            'Features': 'Mapping, Mopping, Auto-empty'
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
