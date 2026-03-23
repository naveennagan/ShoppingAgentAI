package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Appointment;
import com.shoppingagent.model.AppointmentRequest;
import com.shoppingagent.model.CheckoutCartItem;
import com.shoppingagent.model.CheckoutSession;
import com.shoppingagent.model.MockPaymentRequest;
import com.shoppingagent.model.Order;
import com.shoppingagent.model.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CheckoutService {

    private static final Logger logger = LoggerFactory.getLogger(CheckoutService.class);

    private final SupabaseClient supabaseClient;
    private final PromotionService promotionService;
    private final Gson gson;

    public CheckoutService(SupabaseClient supabaseClient, PromotionService promotionService) {
        this.supabaseClient = supabaseClient;
        this.promotionService = promotionService;
        this.gson = new Gson();
    }

    /**
     * Reads cart_items for the session, splits by item_type, calculates totals,
     * writes a checkout_sessions row, and returns a CheckoutSession.
     */
    public CheckoutSession buildCheckoutSession(String sessionId) {
        logger.debug("Building checkout session for: {}", sessionId);

        String cartJson = supabaseClient.get("cart_items",
                "select=id,product_id,item_type,fulfillment_type,display_name,display_summary,unit_price,quantity"
                        + "&session_id=eq." + sessionId);

        List<CartItemRow> rows = gson.fromJson(cartJson, new TypeToken<List<CartItemRow>>() {}.getType());
        if (rows == null) rows = new ArrayList<>();

        List<CheckoutCartItem> deviceItems = new ArrayList<>();
        List<CheckoutCartItem> serviceItems = new ArrayList<>();

        for (CartItemRow row : rows) {
            String displayName = row.display_name;
            String displaySummary = row.display_summary;
            double unitPrice = row.unit_price != null ? row.unit_price : 0.0;
            Double originalPrice = null;
            String promotionalLabel = null;

            // Regular product items don't store display_name/unit_price — look them up
            if (!"broadband_service".equals(row.item_type) && row.product_id != null
                    && (displayName == null || displayName.isBlank())) {
                String productJson = supabaseClient.get("products",
                        "select=name,price,description&id=eq." + row.product_id);
                List<ProductRow> products = gson.fromJson(productJson,
                        new TypeToken<List<ProductRow>>() {}.getType());
                if (products != null && !products.isEmpty()) {
                    ProductRow p = products.get(0);
                    displayName = p.name;
                    unitPrice = p.price;
                    displaySummary = p.description;

                    // Apply active auto-promotions to get discounted price
                    try {
                        List<com.shoppingagent.model.Promotion> promotions = promotionService.getPromotionsForProduct(row.product_id);
                        var activePromo = promotions.stream()
                                .filter(promo -> promo.isActive() && promo.getPromoCode() == null)
                                .findFirst();
                        if (activePromo.isPresent()) {
                            originalPrice = p.price;
                            promotionalLabel = activePromo.get().getPromotionalLabel();
                            unitPrice = com.shoppingagent.util.DiscountCalculator.calculateDiscountedPrice(
                                    p.price, activePromo.get().getDiscountType(), activePromo.get().getDiscountValue());
                        }
                    } catch (Exception e) {
                        logger.warn("Failed to fetch promotions for product {}, using original price", row.product_id, e);
                    }
                }
            }

            CheckoutCartItem item = new CheckoutCartItem(
                    row.id,
                    row.item_type != null ? row.item_type : "device",
                    row.fulfillment_type != null ? row.fulfillment_type : "shipping",
                    displayName, displaySummary, unitPrice, row.quantity,
                    originalPrice, promotionalLabel);

            if ("broadband_service".equals(row.item_type)) {
                serviceItems.add(item);
            } else {
                deviceItems.add(item);
            }
        }

        double oneTimeTotal = deviceItems.stream()
                .mapToDouble(i -> i.getUnitPrice() * i.getQuantity())
                .sum();
        double monthlyTotal = serviceItems.stream()
                .mapToDouble(CheckoutCartItem::getUnitPrice)
                .sum();

        boolean hasDevices = !deviceItems.isEmpty();
        boolean hasBroadband = !serviceItems.isEmpty();

        // Read existing checkout_sessions state (for payment/appointment flags and customer details)
        String existingJson = supabaseClient.get("checkout_sessions",
                "select=id,device_payment_done,appointment_booked,customer_name,customer_email,customer_phone,customer_address&session_id=eq." + sessionId);
        List<CheckoutSessionStateRow> existingState = gson.fromJson(existingJson,
                new TypeToken<List<CheckoutSessionStateRow>>() {}.getType());

        boolean devicePaymentDone = false;
        boolean appointmentBooked = false;

        if (existingState == null || existingState.isEmpty()) {
            JsonObject body = new JsonObject();
            body.addProperty("session_id", sessionId);
            body.addProperty("has_devices", hasDevices);
            body.addProperty("has_broadband_service", hasBroadband);
            body.addProperty("device_one_time_total", oneTimeTotal);
            body.addProperty("broadband_monthly_total", monthlyTotal);
            body.addProperty("status", "in_progress");
            supabaseClient.post("checkout_sessions", gson.toJson(body));
        } else {
            CheckoutSessionStateRow state = existingState.get(0);
            // After device payment, paid items are removed from cart. So if device_payment_done
            // is true but new device items exist in the cart, they are unpaid — reset the flag.
            devicePaymentDone = state.device_payment_done && !hasDevices;
            // Only carry forward appointment_booked if broadband is still in the cart
            appointmentBooked = state.appointment_booked && hasBroadband;

            JsonObject body = new JsonObject();
            body.addProperty("has_devices", hasDevices);
            body.addProperty("has_broadband_service", hasBroadband);
            body.addProperty("device_one_time_total", oneTimeTotal);
            body.addProperty("broadband_monthly_total", monthlyTotal);
            // Reset flags if the corresponding items are gone
            body.addProperty("device_payment_done", devicePaymentDone);
            body.addProperty("appointment_booked", appointmentBooked);
            supabaseClient.patch("checkout_sessions", "session_id=eq." + sessionId, gson.toJson(body));
        }

        // Build per-item broadband booking status by querying appointments table
        Map<String, String> broadbandBookingStatus = new HashMap<>();
        if (!serviceItems.isEmpty()) {
            String appointmentsJson = supabaseClient.get("appointments",
                    "select=id,cart_item_id&session_id=eq." + sessionId + "&cart_item_id=not.is.null");
            List<AppointmentCartItemRow> appointmentRows = gson.fromJson(appointmentsJson,
                    new TypeToken<List<AppointmentCartItemRow>>() {}.getType());
            if (appointmentRows == null) appointmentRows = new ArrayList<>();

            // Index appointments by cart_item_id for quick lookup
            Map<String, String> appointmentsByCartItem = new HashMap<>();
            for (AppointmentCartItemRow apt : appointmentRows) {
                if (apt.cart_item_id != null) {
                    appointmentsByCartItem.put(apt.cart_item_id, apt.id);
                }
            }

            for (CheckoutCartItem serviceItem : serviceItems) {
                String appointmentId = appointmentsByCartItem.get(serviceItem.getCartItemId());
                broadbandBookingStatus.put(serviceItem.getCartItemId(),
                        appointmentId != null ? appointmentId : "unbooked");
            }
        }

        // Build customer details from saved session data
        com.shoppingagent.model.CustomerDetails customerDetails = null;
        if (existingState != null && !existingState.isEmpty()) {
            CheckoutSessionStateRow state = existingState.get(0);
            if (state.customer_name != null || state.customer_email != null || state.customer_address != null) {
                customerDetails = new com.shoppingagent.model.CustomerDetails(
                        state.customer_name, state.customer_email, state.customer_phone, state.customer_address);
            }
        }

        return new CheckoutSession(sessionId, hasDevices, hasBroadband,
                devicePaymentDone, broadbandBookingStatus, oneTimeTotal, monthlyTotal,
                devicePaymentDone ? "device_paid" : "open", deviceItems, serviceItems, customerDetails);
    }

    /**
     * Marks device_payment_done=true, creates a device order row, clears device items from cart.
     */
    public Order processMockDevicePayment(String sessionId, MockPaymentRequest payment) {
        logger.debug("Processing mock device payment for session: {}", sessionId);

        // Fetch current checkout session totals and saved customer address
        String sessionJson = supabaseClient.get("checkout_sessions",
                "select=device_one_time_total,customer_address&session_id=eq." + sessionId);
        List<CheckoutSessionRow> sessions = gson.fromJson(sessionJson,
                new TypeToken<List<CheckoutSessionRow>>() {}.getType());

        double oneTimeTotal = (sessions != null && !sessions.isEmpty())
                ? sessions.get(0).device_one_time_total : 0.0;
        String customerAddress = (sessions != null && !sessions.isEmpty())
                ? sessions.get(0).customer_address : null;

        // Create device order with shipping address from saved customer details
        JsonObject orderBody = new JsonObject();
        orderBody.addProperty("session_id", sessionId);
        orderBody.addProperty("order_type", "device");
        orderBody.addProperty("one_time_total", oneTimeTotal);
        orderBody.addProperty("monthly_total", 0.0);
        orderBody.addProperty("total_amount", oneTimeTotal);
        orderBody.addProperty("status", "CONFIRMED");
        if (customerAddress != null && !customerAddress.isBlank()) {
            orderBody.addProperty("shipping_address", customerAddress);
        }

        String orderJson = supabaseClient.post("orders", gson.toJson(orderBody));
        List<OrderRow> created = gson.fromJson(orderJson, new TypeToken<List<OrderRow>>() {}.getType());
        if (created == null || created.isEmpty()) {
            throw new RuntimeException("Failed to create device order for session: " + sessionId);
        }
        String orderId = created.get(0).id;

        // Insert order_items for each device in the cart
        String deviceCartJson = supabaseClient.get("cart_items",
                "select=id,product_id,display_name,unit_price,quantity,item_type"
                        + "&session_id=eq." + sessionId + "&item_type=neq.broadband_service");
        List<CartItemRow> deviceCartItems = gson.fromJson(deviceCartJson,
                new TypeToken<List<CartItemRow>>() {}.getType());
        if (deviceCartItems != null) {
            for (CartItemRow item : deviceCartItems) {
                String productName = item.display_name;
                double originalPrice = item.unit_price != null ? item.unit_price : 0.0;
                double effectivePrice = originalPrice;
                String imageUrl = null;
                String promotionalLabel = null;

                // Look up product details if not stored on cart item
                if (item.product_id != null && (productName == null || productName.isBlank())) {
                    String pJson = supabaseClient.get("products",
                            "select=name,price,image_url&id=eq." + item.product_id);
                    List<ProductRow> products = gson.fromJson(pJson,
                            new TypeToken<List<ProductRow>>() {}.getType());
                    if (products != null && !products.isEmpty()) {
                        productName = products.get(0).name;
                        originalPrice = products.get(0).price;
                        effectivePrice = originalPrice;
                        imageUrl = products.get(0).image_url;
                    }
                }

                // Apply active auto-promotions
                if (item.product_id != null) {
                    try {
                        List<com.shoppingagent.model.Promotion> promotions = promotionService.getPromotionsForProduct(item.product_id);
                        var activePromo = promotions.stream()
                                .filter(promo -> promo.isActive() && promo.getPromoCode() == null)
                                .findFirst();
                        if (activePromo.isPresent()) {
                            com.shoppingagent.model.Promotion promo = activePromo.get();
                            effectivePrice = com.shoppingagent.util.DiscountCalculator.calculateDiscountedPrice(
                                    originalPrice, promo.getDiscountType(), promo.getDiscountValue());
                            promotionalLabel = promo.getPromotionalLabel();
                        }
                    } catch (Exception e) {
                        logger.warn("Failed to fetch promotions for product {}, using original price", item.product_id, e);
                    }
                }

                JsonObject itemBody = new JsonObject();
                itemBody.addProperty("order_id", orderId);
                itemBody.addProperty("product_id", item.product_id != null ? item.product_id : item.id);
                itemBody.addProperty("product_name", productName != null ? productName : "Unknown");
                itemBody.addProperty("price", effectivePrice);
                itemBody.addProperty("original_price", originalPrice);
                if (promotionalLabel != null) itemBody.addProperty("promotional_label", promotionalLabel);
                itemBody.addProperty("quantity", item.quantity);
                if (imageUrl != null) itemBody.addProperty("image_url", imageUrl);
                supabaseClient.post("order_items", gson.toJson(itemBody));
            }
        }

        // Update checkout_sessions: mark device_payment_done, link device_order_id, update status
        JsonObject sessionUpdate = new JsonObject();
        sessionUpdate.addProperty("device_payment_done", true);
        sessionUpdate.addProperty("device_order_id", orderId);
        sessionUpdate.addProperty("status", "device_paid");
        supabaseClient.patch("checkout_sessions", "session_id=eq." + sessionId, gson.toJson(sessionUpdate));

        // Clear device items from cart (item_type = 'device' or null/default)
        supabaseClient.delete("cart_items",
                "session_id=eq." + sessionId + "&item_type=neq.broadband_service");

        logger.info("Device order {} created for session {}", orderId, sessionId);

        Order order = new Order();
        order.setOrderId(orderId);
        order.setSessionId(sessionId);
        order.setTotalAmount(oneTimeTotal);
        order.setStatus("CONFIRMED");
        order.setOrderDate(java.time.LocalDateTime.now());
        order.setItems(new ArrayList<>());
        if (customerAddress != null && !customerAddress.isBlank()) {
            order.setShippingAddress(customerAddress);
        }
        return order;
    }

    /**
     * Books an installation appointment for a specific broadband cart item.
     * Creates a separate service order per broadband item and uses saved customer address.
     */
    public Appointment bookAppointment(String sessionId, AppointmentRequest request) {
        logger.debug("Booking appointment for session: {}, broadbandItemId: {}", sessionId, request.getBroadbandItemId());

        // Validate that session exists and has a broadband service
        String sessionJson = supabaseClient.get("checkout_sessions",
                "select=has_broadband_service,customer_address&session_id=eq." + sessionId);
        List<CheckoutSessionRow> sessions = gson.fromJson(sessionJson,
                new TypeToken<List<CheckoutSessionRow>>() {}.getType());

        if (sessions == null || sessions.isEmpty()) {
            throw new RuntimeException("No checkout session found for: " + sessionId);
        }
        CheckoutSessionRow session = sessions.get(0);
        if (!session.has_broadband_service) {
            throw new RuntimeException("No broadband service in checkout session for: " + sessionId);
        }

        // Validate that broadbandItemId exists as a broadband_service cart item in this session
        String cartItemJson = supabaseClient.get("cart_items",
                "select=id,item_type,display_name,unit_price&id=eq." + request.getBroadbandItemId()
                        + "&session_id=eq." + sessionId + "&item_type=eq.broadband_service");
        List<BroadbandCartItemRow> cartItems = gson.fromJson(cartItemJson,
                new TypeToken<List<BroadbandCartItemRow>>() {}.getType());

        if (cartItems == null || cartItems.isEmpty()) {
            throw new RuntimeException("Broadband item not found in checkout session");
        }
        BroadbandCartItemRow cartItem = cartItems.get(0);

        // Check if appointment already exists for this cart_item_id
        String existingApptJson = supabaseClient.get("appointments",
                "select=id&cart_item_id=eq." + request.getBroadbandItemId() + "&session_id=eq." + sessionId);
        List<IdRow> existingAppts = gson.fromJson(existingApptJson,
                new TypeToken<List<IdRow>>() {}.getType());

        if (existingAppts != null && !existingAppts.isEmpty()) {
            throw new RuntimeException("Appointment already booked for this item");
        }

        // Create a separate service order for this specific broadband item
        double originalMonthly = cartItem.unit_price != null ? cartItem.unit_price : 0.0;
        // Use discounted price from frontend voucher if provided, otherwise use original
        double monthlyTotal = (request.getDiscountedMonthlyTotal() != null)
                ? request.getDiscountedMonthlyTotal()
                : originalMonthly;

        JsonObject serviceOrderBody = new JsonObject();
        serviceOrderBody.addProperty("session_id", sessionId);
        serviceOrderBody.addProperty("order_type", "service");
        serviceOrderBody.addProperty("one_time_total", 0.0);
        serviceOrderBody.addProperty("monthly_total", monthlyTotal);
        serviceOrderBody.addProperty("total_amount", 0.0);
        serviceOrderBody.addProperty("status", "PENDING");
        serviceOrderBody.addProperty("service_status", "appointment_booked");

        String serviceOrderJson = supabaseClient.post("orders", gson.toJson(serviceOrderBody));
        List<OrderRow> createdOrders = gson.fromJson(serviceOrderJson,
                new TypeToken<List<OrderRow>>() {}.getType());
        if (createdOrders == null || createdOrders.isEmpty()) {
            throw new RuntimeException("Failed to create service order for session: " + sessionId);
        }
        String serviceOrderId = createdOrders.get(0).id;

        // Insert order_item for this broadband service
        JsonObject itemBody = new JsonObject();
        itemBody.addProperty("order_id", serviceOrderId);
        itemBody.addProperty("product_id", cartItem.id);
        itemBody.addProperty("product_name", cartItem.display_name != null ? cartItem.display_name : "Broadband Service");
        itemBody.addProperty("price", monthlyTotal);
        itemBody.addProperty("original_price", originalMonthly);
        itemBody.addProperty("quantity", 1);
        supabaseClient.post("order_items", gson.toJson(itemBody));

        // Use saved customer_address as install_address, fall back to "TBD"
        String installAddress = "TBD";
        if (session.customer_address != null && !session.customer_address.isBlank()) {
            installAddress = session.customer_address;
        }

        // Insert appointment row with cart_item_id
        JsonObject apptBody = new JsonObject();
        apptBody.addProperty("order_id", serviceOrderId);
        apptBody.addProperty("session_id", sessionId);
        apptBody.addProperty("preferred_date", request.getPreferredDate());
        apptBody.addProperty("preferred_time_slot", request.getPreferredTimeSlot());
        apptBody.addProperty("install_address", installAddress);
        apptBody.addProperty("install_postcode", "TBD");
        apptBody.addProperty("status", "pending");
        apptBody.addProperty("cart_item_id", request.getBroadbandItemId());

        String apptJson = supabaseClient.post("appointments", gson.toJson(apptBody));
        List<AppointmentRow> created = gson.fromJson(apptJson,
                new TypeToken<List<AppointmentRow>>() {}.getType());
        if (created == null || created.isEmpty()) {
            throw new RuntimeException("Failed to create appointment for session: " + sessionId);
        }
        AppointmentRow apptRow = created.get(0);

        // Determine session status: "complete" if all broadband items have appointments, otherwise "appointment_pending"
        String allBroadbandJson = supabaseClient.get("cart_items",
                "select=id&session_id=eq." + sessionId + "&item_type=eq.broadband_service");
        List<IdRow> allBroadbandItems = gson.fromJson(allBroadbandJson,
                new TypeToken<List<IdRow>>() {}.getType());
        int broadbandCount = (allBroadbandItems != null) ? allBroadbandItems.size() : 0;

        String allApptsJson = supabaseClient.get("appointments",
                "select=id,cart_item_id&session_id=eq." + sessionId + "&cart_item_id=not.is.null");
        List<AppointmentCartItemRow> allAppts = gson.fromJson(allApptsJson,
                new TypeToken<List<AppointmentCartItemRow>>() {}.getType());
        long distinctBookedCount = (allAppts != null)
                ? allAppts.stream().map(a -> a.cart_item_id).distinct().count()
                : 0;

        boolean allBooked = broadbandCount > 0 && distinctBookedCount >= broadbandCount;
        String newStatus = allBooked ? "complete" : "appointment_pending";

        // Clear broadband items from cart once all have appointments booked
        if (allBooked) {
            supabaseClient.delete("cart_items",
                    "session_id=eq." + sessionId + "&item_type=eq.broadband_service");
        }

        JsonObject sessionUpdate = new JsonObject();
        sessionUpdate.addProperty("status", newStatus);
        supabaseClient.patch("checkout_sessions", "session_id=eq." + sessionId, gson.toJson(sessionUpdate));

        logger.info("Appointment {} booked for session {}, broadband item {}", apptRow.id, sessionId, request.getBroadbandItemId());

        return new Appointment(apptRow.id, serviceOrderId,
                request.getPreferredDate(), request.getPreferredTimeSlot(),
                null, null, "pending");
    }

    /**
     * Called when appointment status is set to 'completed'.
     * Writes a subscription row with status='active'.
     */
    public Subscription activateSubscription(String appointmentId) {
        logger.debug("Activating subscription for appointment: {}", appointmentId);

        // Fetch appointment to get order_id
        String apptJson = supabaseClient.get("appointments",
                "select=id,order_id,status&id=eq." + appointmentId);
        List<AppointmentRow> appts = gson.fromJson(apptJson,
                new TypeToken<List<AppointmentRow>>() {}.getType());

        if (appts == null || appts.isEmpty()) {
            throw new RuntimeException("Appointment not found: " + appointmentId);
        }
        AppointmentRow appt = appts.get(0);
        if (!"completed".equals(appt.status)) {
            throw new RuntimeException("Cannot activate subscription: appointment not completed");
        }

        // Fetch monthly_total from the linked service order
        String orderJson = supabaseClient.get("orders",
                "select=id,session_id,monthly_total&id=eq." + appt.order_id);
        List<OrderRow> orders = gson.fromJson(orderJson,
                new TypeToken<List<OrderRow>>() {}.getType());
        if (orders == null || orders.isEmpty()) {
            throw new RuntimeException("Service order not found for appointment: " + appointmentId);
        }
        OrderRow order = orders.get(0);

        // Insert subscription row
        String today = LocalDate.now().toString();
        JsonObject subBody = new JsonObject();
        subBody.addProperty("order_id", appt.order_id);
        subBody.addProperty("session_id", order.session_id);
        subBody.addProperty("monthly_price", order.monthly_total);
        subBody.addProperty("plan_name", "Broadband Plan");
        subBody.addProperty("contract_months", 24);
        subBody.addProperty("status", "active");
        subBody.addProperty("start_date", today);

        String subJson = supabaseClient.post("subscriptions", gson.toJson(subBody));
        List<SubscriptionRow> created = gson.fromJson(subJson,
                new TypeToken<List<SubscriptionRow>>() {}.getType());
        if (created == null || created.isEmpty()) {
            throw new RuntimeException("Failed to create subscription for appointment: " + appointmentId);
        }
        SubscriptionRow subRow = created.get(0);

        // Update service order status to active
        JsonObject orderUpdate = new JsonObject();
        orderUpdate.addProperty("service_status", "active");
        supabaseClient.patch("orders", "id=eq." + appt.order_id, gson.toJson(orderUpdate));

        // Update checkout_sessions status to complete
        JsonObject sessionUpdate = new JsonObject();
        sessionUpdate.addProperty("status", "complete");
        supabaseClient.patch("checkout_sessions", "session_id=eq." + order.session_id, gson.toJson(sessionUpdate));

        logger.info("Subscription {} activated for appointment {}", subRow.id, appointmentId);

        return new Subscription(subRow.id, appt.order_id, "active",
                order.monthly_total, today, null, null);
    }

    /**
     * Fetches the subscription associated with a checkout session.
     * Returns null if no subscription exists yet (appointment not yet completed).
     */
    public Subscription getSubscriptionBySession(String sessionId) {
        logger.debug("Fetching subscription for session: {}", sessionId);

        String json = supabaseClient.get("subscriptions",
                "select=id,order_id,status,monthly_price,start_date"
                        + "&session_id=eq." + sessionId);
        List<SubscriptionRow> rows = gson.fromJson(json,
                new TypeToken<List<SubscriptionRow>>() {}.getType());

        if (rows == null || rows.isEmpty()) {
            return null;
        }
        SubscriptionRow row = rows.get(0);
        return new Subscription(row.id, row.order_id, row.status,
                row.monthly_price, row.start_date, null, null);
    }

    /**
     * Fetches all subscriptions for a given session.
     * Returns an empty list if no subscriptions are found.
     */
    public List<Subscription> getSubscriptionsBySession(String sessionId) {
        logger.debug("Fetching all subscriptions for session: {}", sessionId);

        String json = supabaseClient.get("subscriptions",
                "select=id,order_id,status,monthly_price,start_date,plan_name,activated_at"
                        + "&session_id=eq." + sessionId);
        List<SubscriptionRow> rows = gson.fromJson(json,
                new TypeToken<List<SubscriptionRow>>() {}.getType());

        if (rows == null || rows.isEmpty()) {
            return new ArrayList<>();
        }

        return rows.stream()
                .map(row -> new Subscription(row.id, row.order_id, row.status,
                        row.monthly_price, row.start_date, row.activated_at, row.plan_name))
                .collect(Collectors.toList());
    }

    /**
     * Persists customer details against a checkout session.
     * Returns true if the session was found and updated, false if session not found.
     */
    public boolean saveCustomerDetails(String sessionId, com.shoppingagent.model.CustomerDetails details) {
        logger.debug("Saving customer details for session: {}", sessionId);

        // Check session exists
        String existingJson = supabaseClient.get("checkout_sessions",
                "select=id&session_id=eq." + sessionId);
        List<IdRow> existing = gson.fromJson(existingJson, new TypeToken<List<IdRow>>() {}.getType());
        if (existing == null || existing.isEmpty()) {
            return false;
        }

        JsonObject body = new JsonObject();
        body.addProperty("customer_name", details.getFullName());
        body.addProperty("customer_email", details.getEmail());
        body.addProperty("customer_phone", details.getPhone());
        body.addProperty("customer_address", details.getAddress());
        supabaseClient.patch("checkout_sessions", "session_id=eq." + sessionId, gson.toJson(body));

        logger.info("Customer details saved for session {}", sessionId);
        return true;
    }

    /**
     * Retrieves saved customer details for a checkout session.
     * Returns null if no details have been saved yet (not an error).
     */
    public com.shoppingagent.model.CustomerDetails getCustomerDetails(String sessionId) {
        logger.debug("Fetching customer details for session: {}", sessionId);

        String json = supabaseClient.get("checkout_sessions",
                "select=customer_name,customer_email,customer_phone,customer_address&session_id=eq." + sessionId);
        List<CustomerDetailsRow> rows = gson.fromJson(json, new TypeToken<List<CustomerDetailsRow>>() {}.getType());

        if (rows == null || rows.isEmpty()) {
            return null;
        }

        CustomerDetailsRow row = rows.get(0);
        // If no details have been saved yet, return null
        if (row.customer_name == null && row.customer_email == null && row.customer_address == null) {
            return null;
        }

        return new com.shoppingagent.model.CustomerDetails(
                row.customer_name, row.customer_email, row.customer_phone, row.customer_address);
    }





    // --- Supabase row POJOs ---

    private static class CartItemRow {
        String id;
        String product_id;
        String item_type;
        String fulfillment_type;
        String display_name;
        String display_summary;
        Double unit_price;
        int quantity;
    }

    private static class CheckoutSessionRow {
        String id;
        boolean has_broadband_service;
        String service_order_id;
        double device_one_time_total;
        double broadband_monthly_total;
        String customer_address;
    }

    private static class OrderRow {
        String id;
        String session_id;
        double monthly_total;
    }

    private static class AppointmentRow {
        String id;
        String order_id;
        String status;
    }

    private static class SubscriptionRow {
        String id;
        String order_id;
        String status;
        double monthly_price;
        String start_date;
        String plan_name;
        String activated_at;
    }

    private static class IdRow {
        String id;
    }

    private static class CheckoutSessionStateRow {
        String id;
        boolean device_payment_done;
        boolean appointment_booked;
        String customer_name;
        String customer_email;
        String customer_phone;
        String customer_address;
    }

    private static class ProductRow {
        String name;
        double price;
        String description;
        String image_url;
    }

    private static class CustomerDetailsRow {
        String customer_name;
        String customer_email;
        String customer_phone;
        String customer_address;
    }

    private static class AppointmentCartItemRow {
        String id;
        String cart_item_id;
    }

    private static class BroadbandCartItemRow {
        String id;
        String item_type;
        String display_name;
        Double unit_price;
    }
}
