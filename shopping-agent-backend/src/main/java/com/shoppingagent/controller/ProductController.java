package com.shoppingagent.controller;

import com.shoppingagent.model.Product;
import com.shoppingagent.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:3000")
public class ProductController {
    
    private static final Logger logger = LoggerFactory.getLogger(ProductController.class);
    private final ProductService productService;
    
    public ProductController(ProductService productService) {
        this.productService = productService;
    }
    
    @GetMapping
    public List<Product> getAllProducts() {
        logger.info("GET /api/products - Fetching all products");
        List<Product> products = productService.getAllProducts();
        logger.info("Returning {} products", products.size());
        return products;
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable String id) {
        logger.info("GET /api/products/{} - Fetching product", id);
        return productService.getProductById(id)
            .map(product -> {
                logger.info("Found product: {}", product.getName());
                return ResponseEntity.ok(product);
            })
            .orElseGet(() -> {
                logger.warn("Product not found: {}", id);
                return ResponseEntity.notFound().build();
            });
    }
}
