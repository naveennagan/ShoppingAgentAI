package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Product;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ProductService {

    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);
    private static final Type PRODUCT_LIST_TYPE = new TypeToken<List<Product>>() {}.getType();
    private static final String TABLE = "products";

    private final SupabaseClient supabaseClient;
    private final IngestionService ingestionService;
    private final Gson gson;

    public ProductService(SupabaseClient supabaseClient, @Lazy IngestionService ingestionService) {
        this.supabaseClient = supabaseClient;
        this.ingestionService = ingestionService;
        this.gson = new Gson();
    }

    public List<Product> getAllProducts() {
        logger.debug("Fetching all products from Supabase");
        String json = supabaseClient.get(TABLE, "select=*");
        List<Product> products = gson.fromJson(json, PRODUCT_LIST_TYPE);
        logger.debug("Fetched {} products", products.size());
        return products;
    }

    public Optional<Product> getProductById(String id) {
        logger.debug("Fetching product by id: {}", id);
        String json = supabaseClient.get(TABLE, "select=*&id=eq." + id);
        List<Product> products = gson.fromJson(json, PRODUCT_LIST_TYPE);
        if (products == null || products.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(products.get(0));
    }

    public Product createProduct(Product product) {
        logger.info("Creating product: {}", product.getName());
        String json = supabaseClient.post(TABLE, gson.toJson(product));
        List<Product> created = gson.fromJson(json, PRODUCT_LIST_TYPE);
        Product saved = created.get(0);
        reEmbed(saved);
        return saved;
    }

    public Product updateProduct(String id, Product product) {
        logger.info("Updating product: {}", id);
        String json = supabaseClient.patch(TABLE, "id=eq." + id, gson.toJson(product));
        List<Product> updated = gson.fromJson(json, PRODUCT_LIST_TYPE);
        Product saved = updated.get(0);
        reEmbed(saved);
        return saved;
    }

    public void deleteProduct(String id) {
        logger.info("Deleting product: {}", id);
        supabaseClient.delete(TABLE, "id=eq." + id);
        try {
            ingestionService.deleteDocument("product", id);
        } catch (Exception e) {
            logger.error("Failed to remove knowledge document for product {}: {}", id, e.getMessage());
        }
    }

    private void reEmbed(Product product) {
        try {
            String content = ingestionService.buildProductContent(product);
            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("source_type", "product");
            metadata.put("source_id", product.getId());
            metadata.put("name", product.getName());
            metadata.put("brand", product.getBrand());
            metadata.put("category", product.getCategory());
            ingestionService.upsertDocument("product", product.getId(), content, metadata);
            logger.info("Re-embedded product {}", product.getId());
        } catch (Exception e) {
            logger.error("Failed to re-embed product {}: {}", product.getId(), e.getMessage());
        }
    }
}
