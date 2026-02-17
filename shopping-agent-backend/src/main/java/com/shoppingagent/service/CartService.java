package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Cart;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CartService {

    private static final Logger logger = LoggerFactory.getLogger(CartService.class);
    private static final String TABLE = "cart_items";

    private final SupabaseClient supabaseClient;
    private final Gson gson;

    public CartService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.gson = new Gson();
    }

    public Cart getCart(String sessionId) {
        logger.debug("Fetching cart for session: {}", sessionId);
        String json = supabaseClient.get(TABLE, "select=product_id,quantity&session_id=eq." + sessionId);
        List<CartItemRow> rows = gson.fromJson(json, new TypeToken<List<CartItemRow>>() {}.getType());
        List<Cart.CartItem> items = new ArrayList<>();
        if (rows != null) {
            for (CartItemRow row : rows) {
                items.add(new Cart.CartItem(row.product_id, row.quantity));
            }
        }
        return new Cart(sessionId, items);
    }

    public Cart addToCart(String sessionId, String productId, int quantity) {
        logger.debug("Adding to cart - session: {}, product: {}, qty: {}", sessionId, productId, quantity);

        // Check if item already exists in cart
        String existingJson = supabaseClient.get(TABLE,
                "select=id,quantity&session_id=eq." + sessionId + "&product_id=eq." + productId);
        List<CartItemIdRow> existing = gson.fromJson(existingJson, new TypeToken<List<CartItemIdRow>>() {}.getType());

        if (existing != null && !existing.isEmpty()) {
            // Update quantity on existing item
            int newQty = existing.get(0).quantity + quantity;
            JsonObject body = new JsonObject();
            body.addProperty("quantity", newQty);
            supabaseClient.patch(TABLE,
                    "session_id=eq." + sessionId + "&product_id=eq." + productId,
                    gson.toJson(body));
        } else {
            // Insert new cart item
            JsonObject body = new JsonObject();
            body.addProperty("session_id", sessionId);
            body.addProperty("product_id", productId);
            body.addProperty("quantity", quantity);
            supabaseClient.post(TABLE, gson.toJson(body));
        }

        return getCart(sessionId);
    }

    public Cart removeFromCart(String sessionId, String productId) {
        logger.debug("Removing from cart - session: {}, product: {}", sessionId, productId);
        supabaseClient.delete(TABLE,
                "session_id=eq." + sessionId + "&product_id=eq." + productId);
        return getCart(sessionId);
    }

    public Cart clearCart(String sessionId) {
        logger.debug("Clearing cart for session: {}", sessionId);
        supabaseClient.delete(TABLE, "session_id=eq." + sessionId);
        return new Cart(sessionId, new ArrayList<>());
    }

    public Cart updateQuantity(String sessionId, String productId, int quantity) {
        logger.debug("Updating quantity - session: {}, product: {}, qty: {}", sessionId, productId, quantity);
        JsonObject body = new JsonObject();
        body.addProperty("quantity", quantity);
        supabaseClient.patch(TABLE,
                "session_id=eq." + sessionId + "&product_id=eq." + productId,
                gson.toJson(body));
        return getCart(sessionId);
    }

    public Cart addBatchToCart(String sessionId, List<String> productIds) {
        logger.debug("Adding batch to cart - session: {}, products: {}", sessionId, productIds.size());
        for (String productId : productIds) {
            addToCart(sessionId, productId, 1);
        }
        return getCart(sessionId);
    }

    /** Internal row type for deserializing cart_items rows with product_id and quantity. */
    private static class CartItemRow {
        String product_id;
        int quantity;
    }

    /** Internal row type for deserializing cart_items rows with id and quantity (for upsert checks). */
    private static class CartItemIdRow {
        String id;
        int quantity;
    }
}
