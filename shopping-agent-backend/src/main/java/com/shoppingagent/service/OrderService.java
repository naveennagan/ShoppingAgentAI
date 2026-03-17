package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Cart;
import com.shoppingagent.model.Order;
import com.shoppingagent.model.Product;
import com.shoppingagent.model.Promotion;
import com.shoppingagent.util.DiscountCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    private static final Type ORDER_ROW_LIST = new TypeToken<List<OrderRow>>() {}.getType();
    private static final Type ORDER_ITEM_ROW_LIST = new TypeToken<List<OrderItemRow>>() {}.getType();

    private final SupabaseClient supabaseClient;
    private final ProductService productService;
    private final CartService cartService;
    private final PromotionService promotionService;
    private final Gson gson = new Gson();

    public OrderService(SupabaseClient supabaseClient, ProductService productService, CartService cartService, PromotionService promotionService) {
        this.supabaseClient = supabaseClient;
        this.productService = productService;
        this.cartService = cartService;
        this.promotionService = promotionService;
    }

    public Order createOrder(String sessionId, String shippingAddress, String paymentMethod) {
        Cart cart = cartService.getCart(sessionId);
        if (cart.getItems().isEmpty()) {
            throw new RuntimeException("Cannot create order with empty cart");
        }

        List<Order.OrderItem> orderItems = new ArrayList<>();
        double totalAmount = 0.0;

        for (Cart.CartItem cartItem : cart.getItems()) {
            Optional<Product> product = productService.getProductById(cartItem.getProductId());
            if (product.isPresent()) {
                Product p = product.get();
                double originalPrice = p.getPrice();
                double effectivePrice = originalPrice;
                String promotionalLabel = null;

                try {
                    List<Promotion> promotions = promotionService.getPromotionsForProduct(p.getId());
                    Optional<Promotion> activeAutoPromo = promotions.stream()
                            .filter(promo -> promo.isActive() && promo.getPromoCode() == null)
                            .findFirst();
                    if (activeAutoPromo.isPresent()) {
                        Promotion promo = activeAutoPromo.get();
                        effectivePrice = DiscountCalculator.calculateDiscountedPrice(
                                originalPrice, promo.getDiscountType(), promo.getDiscountValue());
                        promotionalLabel = promo.getPromotionalLabel();
                    }
                } catch (Exception e) {
                    logger.warn("Failed to fetch promotions for product {}, using original price", p.getId(), e);
                }

                orderItems.add(new Order.OrderItem(
                        p.getId(), p.getName(), effectivePrice, originalPrice, promotionalLabel,
                        cartItem.getQuantity(), p.getImage()));
                totalAmount += effectivePrice * cartItem.getQuantity();
            }
        }

        // Insert order row
        Map<String, Object> orderRow = new LinkedHashMap<>();
        orderRow.put("session_id", sessionId);
        orderRow.put("total_amount", totalAmount);
        orderRow.put("status", "CONFIRMED");
        orderRow.put("shipping_address", shippingAddress);
        orderRow.put("payment_method", paymentMethod);

        String orderJson = supabaseClient.post("orders", gson.toJson(orderRow));
        List<OrderRow> created = gson.fromJson(orderJson, ORDER_ROW_LIST);
        if (created == null || created.isEmpty()) {
            throw new RuntimeException("Failed to persist order");
        }
        String orderId = created.get(0).id;

        // Insert order items
        for (Order.OrderItem item : orderItems) {
            Map<String, Object> itemRow = new LinkedHashMap<>();
            itemRow.put("order_id", orderId);
            itemRow.put("product_id", item.getProductId());
            itemRow.put("product_name", item.getProductName());
            itemRow.put("price", item.getPrice());
            itemRow.put("original_price", item.getOriginalPrice());
            itemRow.put("promotional_label", item.getPromotionalLabel());
            itemRow.put("quantity", item.getQuantity());
            itemRow.put("image_url", item.getImageUrl());
            supabaseClient.post("order_items", gson.toJson(itemRow));
        }

        cartService.clearCart(sessionId);
        logger.info("Order {} created for session {}", orderId, sessionId);

        return new Order(orderId, sessionId, orderItems, totalAmount,
                "CONFIRMED", java.time.LocalDateTime.now(), shippingAddress, paymentMethod);
    }

    public List<Order> getOrdersBySession(String sessionId) {
        String ordersJson = supabaseClient.get("orders",
                "select=*,order_items(*)&session_id=eq." + sessionId + "&order=created_at.desc");
        List<OrderRow> rows = gson.fromJson(ordersJson, new TypeToken<List<OrderRow>>() {}.getType());
        if (rows == null) return Collections.emptyList();
        return rows.stream().map(this::toOrder).collect(Collectors.toList());
    }

    public Optional<Order> getOrderById(String orderId) {
        String json = supabaseClient.get("orders",
                "select=*,order_items(*)&id=eq." + orderId);
        List<OrderRow> rows = gson.fromJson(json, new TypeToken<List<OrderRow>>() {}.getType());
        if (rows == null || rows.isEmpty()) return Optional.empty();
        return Optional.of(toOrder(rows.get(0)));
    }

    /**
     * Runs every hour. Deletes orders (and their items via CASCADE) that are older than 3 days.
     */
    @Scheduled(fixedRate = 3_600_000)
    public void deleteOldOrders() {
        String cutoff = OffsetDateTime.now(java.time.ZoneOffset.UTC).minusDays(3)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"));
        logger.info("Cleaning up orders older than {}", cutoff);
        supabaseClient.delete("orders", "created_at=lt." + cutoff);
    }

    // --- mapping helpers ---

    private Order toOrder(OrderRow row) {
        List<Order.OrderItem> items = row.order_items == null ? Collections.emptyList()
                : row.order_items.stream().map(i -> new Order.OrderItem(
                        i.product_id, i.product_name, i.price,
                        i.original_price, i.promotional_label,
                        i.quantity, i.image_url))
                .collect(Collectors.toList());

        java.time.LocalDateTime date = row.created_at != null
                ? OffsetDateTime.parse(row.created_at).toLocalDateTime()
                : java.time.LocalDateTime.now();

        return new Order(row.id, row.session_id, items, row.total_amount,
                row.status, date, row.shipping_address, row.payment_method);
    }

    // --- Supabase row POJOs ---

    private static class OrderRow {
        String id;
        String session_id;
        double total_amount;
        String status;
        String shipping_address;
        String payment_method;
        String created_at;
        List<OrderItemRow> order_items;
    }

    private static class OrderItemRow {
        String product_id;
        String product_name;
        double price;
        double original_price;
        String promotional_label;
        int quantity;
        String image_url;
    }
}
