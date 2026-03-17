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
        String json = supabaseClient.get(TABLE,
                "select=id,product_id,item_type,display_name,display_summary,unit_price,quantity&session_id=eq." + sessionId);
        List<CartItemRow> rows = gson.fromJson(json, new TypeToken<List<CartItemRow>>() {}.getType());
        List<Cart.CartItem> items = new ArrayList<>();
        if (rows != null) {
            for (CartItemRow row : rows) {
                items.add(new Cart.CartItem(row.product_id, row.quantity,
                        row.item_type, row.display_name, row.display_summary, row.unit_price));
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
        // Broadband service items have no product_id — identify by item_type
        if (productId != null && productId.startsWith("broadband-")) {
            supabaseClient.delete(TABLE,
                    "session_id=eq." + sessionId + "&item_type=eq.broadband_service");
        } else {
            supabaseClient.delete(TABLE,
                    "session_id=eq." + sessionId + "&product_id=eq." + productId);
        }
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

    public Cart addBroadbandServiceToCart(String sessionId, BroadbandCartItemRequest request) {
        logger.debug("Adding broadband service to cart - session: {}, item: {}", sessionId, request.itemId);

        // Remove any existing broadband service item for this session (only one at a time)
        supabaseClient.delete(TABLE,
                "session_id=eq." + sessionId + "&item_type=eq.broadband_service");

        // Insert new broadband service cart item
        // product_id is explicitly set to null (column was made nullable by cart-broadband-patch.sql)
        JsonObject body = new JsonObject();
        body.addProperty("session_id", sessionId);
        body.add("product_id", com.google.gson.JsonNull.INSTANCE);
        body.addProperty("item_type", "broadband_service");
        body.addProperty("fulfillment_type", "installation");
        body.addProperty("display_name", request.display_name);
        body.addProperty("display_summary", request.display_summary);
        body.addProperty("unit_price", request.unit_price);
        body.addProperty("quantity", request.quantity);
        supabaseClient.post(TABLE, gson.toJson(body));

        return getCart(sessionId);
    }

    /** Request body for adding a broadband service item to the cart. */
    public static class BroadbandCartItemRequest {
        public String itemId;
        public String name;
        public double price;
        public int quantity;
        public String item_type;
        public String fulfillment_type;
        public String broadband_ref;
        public String display_name;
        public String display_summary;
        public double unit_price;
    }

    /** Internal row type for deserializing cart_items rows with product_id and quantity. */
    private static class CartItemRow {
        String product_id;
        String item_type;
        String display_name;
        String display_summary;
        Double unit_price;
        int quantity;
    }

    /** Internal row type for deserializing cart_items rows with id and quantity (for upsert checks). */
    private static class CartItemIdRow {
        String id;
        int quantity;
    }
}
