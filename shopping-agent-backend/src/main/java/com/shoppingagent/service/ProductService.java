package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Product;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;
import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);
    private static final Type PRODUCT_LIST_TYPE = new TypeToken<List<Product>>() {}.getType();

    private final SupabaseClient supabaseClient;
    private final Gson gson;

    public ProductService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.gson = new Gson();
    }

    public List<Product> getAllProducts() {
        logger.debug("Fetching all products from Supabase");
        String json = supabaseClient.get("products", "select=*");
        List<Product> products = gson.fromJson(json, PRODUCT_LIST_TYPE);
        logger.debug("Fetched {} products", products.size());
        return products;
    }

    public Optional<Product> getProductById(String id) {
        logger.debug("Fetching product by id: {}", id);
        String json = supabaseClient.get("products", "select=*&id=eq." + id);
        List<Product> products = gson.fromJson(json, PRODUCT_LIST_TYPE);
        if (products == null || products.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(products.get(0));
    }
}
