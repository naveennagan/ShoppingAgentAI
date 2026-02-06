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
        products.add(new Product("1", "Pro Wireless Noise-Cancelling Headphones", 299.99,
            "Industry-leading noise cancellation with 30-hour battery life and premium sound quality.",
            "Electronics", "https://placehold.co/400x400/4f46e5/ffffff?text=Pro+Headphones",
            Map.of("Battery Life", "30 Hours", "Noise Cancellation", "Active (ANC)", "Connectivity", "Bluetooth 5.2", "Weight", "250g")));
        
        products.add(new Product("2", "Ultra Smart Fitness Watch", 199.50,
            "Advanced health tracking including ECG, SpO2, and sleep analysis. Water resistant up to 50m.",
            "Electronics", "https://placehold.co/400x400/ec4899/ffffff?text=Smart+Watch",
            Map.of("Battery Life", "7 Days", "Sensors", "Heart Rate, SpO2, GPS", "Water Resistance", "5ATM", "Display", "AMOLED")));
        
        products.add(new Product("ph-1", "Flagship Smartphone X1", 999.00,
            "The ultimate smartphone experience with a pro-grade camera system and blazing fast processor.",
            "Electronics", "https://placehold.co/400x400/2563eb/ffffff?text=Phone+X1",
            Map.of("Processor", "Snapdragon 8 Gen 3", "RAM", "12GB", "Storage", "256GB", "Screen", "6.8-inch OLED 120Hz", "Camera", "200MP Main")));
        
        products.add(new Product("ph-2", "Budget King Smartphone Lite", 499.00,
            "All the essentials you need with an amazing battery life and clean software.",
            "Electronics", "https://placehold.co/400x400/60a5fa/ffffff?text=Phone+Lite",
            Map.of("Processor", "Snapdragon 7+ Gen 2", "RAM", "8GB", "Storage", "128GB", "Screen", "6.5-inch OLED 90Hz", "Camera", "64MP Main")));
        
        products.add(new Product("3", "Ergonomic Mesh Chair", 349.00,
            "Designed for 24/7 comfort with adjustable lumbar, armrests, and headrest.",
            "Furniture", "https://placehold.co/400x400/8b5cf6/ffffff?text=Office+Chair",
            Map.of("Material", "Breathable Mesh", "Weight Capacity", "300lbs", "Adjustability", "Height, Tilt, Lumbar", "Warranty", "10 Years")));
        
        products.add(new Product("fur-2", "Standing Desk Pro", 599.00,
            "Dual-motor electric standing desk with memory presets and solid wood top.",
            "Furniture", "https://placehold.co/400x400/c2410c/ffffff?text=Standing+Desk",
            Map.of("Height Range", "24\" - 50\"", "Weight Capacity", "350lbs", "Top Material", "Walnut", "Width", "60 inches")));
        
        products.add(new Product("4", "Waterproof Travel Backpack", 89.99,
            "Keep your gear safe and dry with this rugged, organized backpack.",
            "Accessories", "https://placehold.co/400x400/10b981/ffffff?text=Backpack",
            Map.of("Capacity", "30L", "Material", "500D Nylon", "Laptop Sleeve", "Up to 16\"", "Waterproof", "IPX6")));
        
        products.add(new Product("6", "Ceramic Coffee Mug Set", 35.00,
            "Minimalist stoneware mugs, perfect for your morning brew. Set of 4.",
            "Home", "https://placehold.co/400x400/ef4444/ffffff?text=Mugs",
            Map.of("Capacity", "12oz", "Material", "Stoneware", "Microwave Safe", "Yes", "Dishwasher Safe", "Yes")));
    }
}
