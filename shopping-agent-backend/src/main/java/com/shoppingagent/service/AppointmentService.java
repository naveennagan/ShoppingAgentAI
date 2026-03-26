package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Appointment;
import com.shoppingagent.model.AppointmentRequest;
import com.shoppingagent.model.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AppointmentService {

    private static final Logger logger = LoggerFactory.getLogger(AppointmentService.class);

    private final SupabaseClient supabaseClient;
    private final CheckoutService checkoutService;
    private final Gson gson;

    public AppointmentService(SupabaseClient supabaseClient, @Lazy CheckoutService checkoutService) {
        this.supabaseClient = supabaseClient;
        this.checkoutService = checkoutService;
        this.gson = new Gson();
    }

    /**
     * Returns hardcoded available slots for the next 14 days.
     * Each day has a morning ("09:00-12:00") and afternoon ("13:00-17:00") slot.
     * No external calendar API.
     */
    public List<Map<String, Object>> getAvailableSlots() {
        List<Map<String, Object>> slots = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = 1; i <= 14; i++) {
            LocalDate date = today.plusDays(i);

            Map<String, Object> morning = new LinkedHashMap<>();
            morning.put("date", date.toString());
            morning.put("slot", "morning");
            morning.put("timeRange", "09:00-12:00");
            morning.put("available", true);
            slots.add(morning);

            Map<String, Object> afternoon = new LinkedHashMap<>();
            afternoon.put("date", date.toString());
            afternoon.put("slot", "afternoon");
            afternoon.put("timeRange", "13:00-17:00");
            afternoon.put("available", true);
            slots.add(afternoon);
        }

        return slots;
    }

    /**
     * Inserts an appointment row into Supabase appointments table.
     */
    public Appointment bookSlot(AppointmentRequest request, String orderId) {
        logger.debug("Booking slot for order: {}, date: {}, slot: {}",
                orderId, request.getPreferredDate(), request.getPreferredTimeSlot());

        JsonObject body = new JsonObject();
        body.addProperty("order_id", orderId);
        body.addProperty("session_id", request.getSessionId());
        body.addProperty("preferred_date", request.getPreferredDate());
        body.addProperty("preferred_time_slot", request.getPreferredTimeSlot());
        body.addProperty("install_address", "TBD");
        body.addProperty("install_postcode", "TBD");
        body.addProperty("status", "pending");

        String json = supabaseClient.post("appointments", gson.toJson(body));
        List<AppointmentRow> created = gson.fromJson(json,
                new TypeToken<List<AppointmentRow>>() {}.getType());

        if (created == null || created.isEmpty()) {
            throw new RuntimeException("Failed to book appointment slot for order: " + orderId);
        }
        AppointmentRow row = created.get(0);

        logger.info("Appointment {} booked for order {}", row.id, orderId);

        return new Appointment(row.id, orderId,
                request.getPreferredDate(), request.getPreferredTimeSlot(),
                null, null, "pending");
    }

    /**
     * Fetches a single appointment by its ID from Supabase.
     */
    public Appointment getAppointmentById(String appointmentId) {
        logger.debug("Fetching appointment by id: {}", appointmentId);

        String json = supabaseClient.get("appointments",
                "select=id,order_id,preferred_date,preferred_time_slot,confirmed_date,engineer_name,status"
                        + "&id=eq." + appointmentId);
        List<AppointmentRow> rows = gson.fromJson(json,
                new TypeToken<List<AppointmentRow>>() {}.getType());

        if (rows == null || rows.isEmpty()) {
            throw new RuntimeException("Appointment not found: " + appointmentId);
        }
        AppointmentRow row = rows.get(0);
        return new Appointment(row.id, row.order_id,
                row.preferred_date, row.preferred_time_slot,
                row.confirmed_date, row.engineer_name, row.status);
    }

    /**
     * Updates appointment status in Supabase.
     * If status is 'completed', also calls CheckoutService.activateSubscription.
     */
    public Appointment updateStatus(String appointmentId, String status) {
        logger.debug("Updating appointment {} status to {}", appointmentId, status);

        JsonObject body = new JsonObject();
        body.addProperty("status", status);
        supabaseClient.patch("appointments", "id=eq." + appointmentId, gson.toJson(body));

        if ("completed".equals(status)) {
            logger.info("Appointment {} completed — activating subscription", appointmentId);
            checkoutService.activateSubscription(appointmentId);
        }

        // Fetch updated appointment to return
        String json = supabaseClient.get("appointments",
                "select=id,order_id,preferred_date,preferred_time_slot,confirmed_date,engineer_name,status"
                        + "&id=eq." + appointmentId);
        List<AppointmentRow> rows = gson.fromJson(json,
                new TypeToken<List<AppointmentRow>>() {}.getType());

        if (rows == null || rows.isEmpty()) {
            throw new RuntimeException("Appointment not found after update: " + appointmentId);
        }
        AppointmentRow row = rows.get(0);

        return new Appointment(row.id, row.order_id,
                row.preferred_date, row.preferred_time_slot,
                row.confirmed_date, row.engineer_name, row.status);
    }

    // --- Supabase row POJO ---

    private static class AppointmentRow {
        String id;
        String order_id;
        String preferred_date;
        String preferred_time_slot;
        String confirmed_date;
        String engineer_name;
        String status;
    }
}
