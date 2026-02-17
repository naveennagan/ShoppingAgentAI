package com.shoppingagent.controller;

import com.shoppingagent.exception.SupabaseConnectionException;
import com.shoppingagent.model.Product;
import com.shoppingagent.service.ProductService;
import org.springframework.http.HttpStatus;
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
    public ResponseEntity<?> getAllProducts() {
        logger.info("GET /api/products - Fetching all products");
        try {
            List<Product> products = productService.getAllProducts();
            logger.info("Returning {} products", products.size());
            return ResponseEntity.ok(products);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable String id) {
        logger.info("GET /api/products/{} - Fetching product", id);
        try {
            return productService.getProductById(id)
                    .map(product -> {
                        logger.info("Found product: {}", product.getName());
                        return ResponseEntity.ok((Object) product);
                    })
                    .orElseGet(() -> {
                        logger.warn("Product not found: {}", id);
                        return ResponseEntity.notFound().build();
                    });
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }
}
