package com.shoppingagent.service;

import com.shoppingagent.model.Product;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ProductService {
    private final List<Product> products = new ArrayList<>();
    
    public ProductService() {
        initializeProducts();
    }
    
    public List<Product> getAllProducts() {
        return products;
    }
    
    public Optional<Product> getProductById(String id) {
        return products.stream()
            .filter(p -> p.getId().equals(id))
            .findFirst();
    }
    
    private void initializeProducts() {
        // Headphones
        products.add(new Product("1", "Pro Wireless Noise-Cancelling Headphones", 299.99,
            "Industry-leading noise cancellation with 30-hour battery life and premium sound quality.",
            "Electronics", "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=400&fit=crop",
            Map.of("Battery Life", "30 Hours", "Noise Cancellation", "Active (ANC)", "Connectivity", "Bluetooth 5.2", "Weight", "250g")));
        products.add(new Product("1-b", "Studio Monitor Headphones", 149.99,
            "Neutral sound signature perfect for mixing and mastering or audiophile listening.",
            "Electronics", "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop",
            Map.of("Type", "Open-Back", "Impedance", "80 Ohms", "Cable", "Detachable 3m", "Weight", "300g")));
        products.add(new Product("hp-3", "Sport Wireless Earbuds", 89.99,
            "Sweat-proof earbuds with secure fit and powerful bass. Perfect for workouts.",
            "Electronics", "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
            Map.of("Battery Life", "8 Hours (24h with case)", "Water Resistance", "IPX7", "Connectivity", "Bluetooth 5.3", "Weight", "5g per earbud")));
        
        // Wearables
        products.add(new Product("2", "Ultra Smart Fitness Watch", 199.50,
            "Advanced health tracking including ECG, SpO2, and sleep analysis. Water resistant up to 50m.",
            "Electronics", "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop",
            Map.of("Battery Life", "7 Days", "Sensors", "Heart Rate, SpO2, GPS", "Water Resistance", "5ATM", "Display", "AMOLED")));
        products.add(new Product("watch-2", "Classic Analog Smartwatch", 279.00,
            "Elegant hybrid watch with smart features. Traditional look, modern tech.",
            "Electronics", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
            Map.of("Battery Life", "30 Days", "Display", "Analog + Digital", "Water Resistance", "10ATM", "Material", "Stainless Steel")));
        
        // Phones
        products.add(new Product("ph-1", "Flagship Smartphone X1", 999.00,
            "The ultimate smartphone experience with a pro-grade camera system and blazing fast processor.",
            "Electronics", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop",
            Map.of("Processor", "Snapdragon 8 Gen 3", "RAM", "12GB", "Storage", "256GB", "Screen", "6.8-inch OLED 120Hz", "Camera", "200MP Main")));
        products.add(new Product("ph-2", "Budget King Smartphone Lite", 499.00,
            "All the essentials you need with an amazing battery life and clean software.",
            "Electronics", "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop",
            Map.of("Processor", "Snapdragon 7+ Gen 2", "RAM", "8GB", "Storage", "128GB", "Screen", "6.5-inch OLED 90Hz", "Camera", "64MP Main")));
        products.add(new Product("ph-3", "Compact Pro Smartphone", 749.00,
            "Powerful performance in a pocket-friendly size. Perfect for one-handed use.",
            "Electronics", "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop",
            Map.of("Processor", "Snapdragon 8 Gen 2", "RAM", "8GB", "Storage", "256GB", "Screen", "5.9-inch OLED 120Hz", "Camera", "50MP Main")));
        
        // Laptops
        products.add(new Product("lap-1", "Creator Laptop Pro 16", 2499.00,
            "Powerhouse workstation for video editing and 3D rendering.",
            "Electronics", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop",
            Map.of("Processor", "M3 Max", "RAM", "64GB", "Storage", "2TB SSD", "Display", "16-inch Mini-LED", "GPU", "40-core")));
        products.add(new Product("lap-2", "AirLight Laptop 13", 1199.00,
            "Incredibly thin and light, perfect for students and professionals on the go.",
            "Electronics", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop",
            Map.of("Processor", "M2", "RAM", "16GB", "Storage", "512GB SSD", "Display", "13.6-inch LCD", "Weight", "1.24kg")));
        products.add(new Product("lap-3", "Gaming Beast Laptop 17", 1899.00,
            "Dominate every game with RTX graphics and high refresh rate display.",
            "Electronics", "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop",
            Map.of("Processor", "Intel i9-14900HX", "RAM", "32GB DDR5", "Storage", "1TB SSD", "Display", "17.3-inch QHD 240Hz", "GPU", "RTX 4080")));
        
        // Furniture
        products.add(new Product("3", "Ergonomic Mesh Chair", 349.00,
            "Designed for 24/7 comfort with adjustable lumbar, armrests, and headrest.",
            "Furniture", "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=400&fit=crop",
            Map.of("Material", "Breathable Mesh", "Weight Capacity", "300lbs", "Adjustability", "Height, Tilt, Lumbar", "Warranty", "10 Years")));
        products.add(new Product("fur-2", "Standing Desk Pro", 599.00,
            "Dual-motor electric standing desk with memory presets and solid wood top.",
            "Furniture", "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400&h=400&fit=crop",
            Map.of("Height Range", "24\" - 50\"", "Weight Capacity", "350lbs", "Top Material", "Walnut", "Width", "60 inches")));
        products.add(new Product("fur-3", "Monitor Arm Dual Mount", 129.00,
            "Free up desk space with this sturdy dual monitor arm. Supports up to 32\" displays.",
            "Furniture", "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop",
            Map.of("Max Monitor Size", "32 inches", "Weight Capacity", "20lbs per arm", "Adjustment", "360° rotation", "VESA", "75x75, 100x100")));
        
        // Accessories
        products.add(new Product("4", "Waterproof Travel Backpack", 89.99,
            "Keep your gear safe and dry with this rugged, organized backpack.",
            "Accessories", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop",
            Map.of("Capacity", "30L", "Material", "500D Nylon", "Laptop Sleeve", "Up to 16\"", "Waterproof", "IPX6")));
        products.add(new Product("acc-2", "Mechanical Gaming Keyboard", 129.99,
            "RGB backlit keyboard with hot-swappable switches and aluminum frame.",
            "Accessories", "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop",
            Map.of("Switch Type", "Red Linear", "Form Factor", "TKL (80%)", "Connectivity", "Wired/Wireless", "Backlight", "Per-key RGB")));
        products.add(new Product("acc-3", "Precision Wireless Mouse", 79.99,
            "Ergonomic shape with high-precision sensor for productivity and gaming.",
            "Accessories", "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop",
            Map.of("DPI", "20,000", "Buttons", "7 Programmable", "Battery", "Rechargeable 70h", "Weight", "80g")));
        products.add(new Product("acc-4", "USB-C Hub 7-in-1", 49.99,
            "Expand your laptop connectivity with HDMI, USB 3.0, SD card reader, and more.",
            "Accessories", "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&h=400&fit=crop",
            Map.of("Ports", "7 (HDMI, 3xUSB, SD, microSD, PD)", "HDMI Output", "4K@60Hz", "Power Delivery", "100W", "Material", "Aluminum")));
        products.add(new Product("acc-5", "Webcam 4K Pro", 159.99,
            "Crystal clear 4K video calls with auto-focus and built-in dual microphones.",
            "Accessories", "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=400&fit=crop",
            Map.of("Resolution", "4K@30fps", "Field of View", "90°", "Microphones", "Dual Stereo", "Mount", "Universal Clip")));
        
        // Home
        products.add(new Product("6", "Ceramic Coffee Mug Set", 35.00,
            "Minimalist stoneware mugs, perfect for your morning brew. Set of 4.",
            "Home", "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop",
            Map.of("Capacity", "12oz", "Material", "Stoneware", "Microwave Safe", "Yes", "Dishwasher Safe", "Yes")));
        products.add(new Product("home-2", "Smart Air Purifier", 159.00,
            "HEPA filter purifier that cleans air in rooms up to 400 sq ft. App controlled.",
            "Home", "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop",
            Map.of("Filter Type", "True HEPA H13", "Coverage", "400 sq ft", "Noise Level", "24dB (Sleep Mode)", "Smart Features", "WiFi, Voice Control")));
        products.add(new Product("home-3", "LED Desk Lamp with Wireless Charging", 69.99,
            "Adjustable LED lamp with built-in wireless charger and USB ports.",
            "Home", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop",
            Map.of("Brightness Levels", "5", "Color Temperature", "3000K-6500K", "Wireless Charging", "15W", "USB Ports", "2")));
        products.add(new Product("home-4", "Robot Vacuum Cleaner", 299.00,
            "Smart navigation robot vacuum with mopping function and auto-empty base.",
            "Home", "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&h=400&fit=crop",
            Map.of("Suction Power", "4000Pa", "Battery Life", "180 minutes", "Dustbin", "450ml", "Features", "Mapping, Mopping, Auto-empty")));
    }
}
