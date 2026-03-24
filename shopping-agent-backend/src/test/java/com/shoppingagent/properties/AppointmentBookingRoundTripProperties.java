package com.shoppingagent.properties;

import com.shoppingagent.model.Appointment;
import com.shoppingagent.model.AppointmentRequest;
import com.shoppingagent.service.AppointmentService;
import com.shoppingagent.service.CheckoutService;
import com.shoppingagent.service.SupabaseClient;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Feature: broadband-chat-ux-improvements, Property 6: Appointment booking round trip
 * Validates: Requirements 5.2, 5.3
 *
 * For any valid appointment slot (date + time range), booking the slot and then
 * retrieving the appointment by ID should return the same date, time slot, and
 * a status of "pending".
 */
class AppointmentBookingRoundTripProperties {

    @Provide
    Arbitrary<String> timeSlots() {
        return Arbitraries.of("morning", "afternoon");
    }

    @Provide
    Arbitrary<String> orderIds() {
        return Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(20)
                .map(s -> "order-" + s);
    }

    @Provide
    Arbitrary<String> appointmentIds() {
        return Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(20)
                .map(s -> "appt-" + s);
    }

    @Provide
    Arbitrary<String> sessionIds() {
        return Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(15)
                .map(s -> "sess-" + s);
    }

    /**
     * Generates ISO date strings for the next 1–365 days from a fixed base date.
     */
    @Provide
    Arbitrary<String> futureDates() {
        return Arbitraries.integers().between(1, 365)
                .map(offset -> java.time.LocalDate.of(2026, 1, 1).plusDays(offset).toString());
    }

    /**
     * Property 6: Booking an appointment and retrieving it by ID returns the same
     * date, time slot, and status "pending".
     */
    @Property(tries = 100)
    void bookAndRetrieveReturnsConsistentData(
            @ForAll("futureDates") String preferredDate,
            @ForAll("timeSlots") String timeSlot,
            @ForAll("orderIds") String orderId,
            @ForAll("appointmentIds") String apptId,
            @ForAll("sessionIds") String sessionId) {

        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        CheckoutService checkoutService = mock(CheckoutService.class);
        AppointmentService service = new AppointmentService(supabaseClient, checkoutService);

        // Mock the POST response from Supabase (bookSlot)
        String postResponse = String.format(
                "[{\"id\":\"%s\",\"order_id\":\"%s\",\"preferred_date\":\"%s\","
                        + "\"preferred_time_slot\":\"%s\",\"status\":\"pending\"}]",
                apptId, orderId, preferredDate, timeSlot);
        when(supabaseClient.post(eq("appointments"), anyString())).thenReturn(postResponse);

        // Mock the GET response from Supabase (getAppointmentById)
        String getResponse = String.format(
                "[{\"id\":\"%s\",\"order_id\":\"%s\",\"preferred_date\":\"%s\","
                        + "\"preferred_time_slot\":\"%s\",\"confirmed_date\":null,"
                        + "\"engineer_name\":null,\"status\":\"pending\"}]",
                apptId, orderId, preferredDate, timeSlot);
        when(supabaseClient.get(eq("appointments"), anyString())).thenReturn(getResponse);

        // Book the slot
        AppointmentRequest request = new AppointmentRequest(sessionId, preferredDate, timeSlot, null, null);
        Appointment booked = service.bookSlot(request, orderId);

        // Retrieve by ID
        Appointment retrieved = service.getAppointmentById(booked.getAppointmentId());

        // Round-trip consistency: date, time slot, and status must match
        assertThat(retrieved.getPreferredDate()).isEqualTo(booked.getPreferredDate());
        assertThat(retrieved.getPreferredTimeSlot()).isEqualTo(booked.getPreferredTimeSlot());
        assertThat(retrieved.getStatus()).isEqualTo("pending");
        assertThat(retrieved.getAppointmentId()).isEqualTo(booked.getAppointmentId());
        assertThat(retrieved.getOrderId()).isEqualTo(booked.getOrderId());
    }

    /**
     * Property 6 (strengthened): The booked appointment always has status "pending"
     * regardless of the input slot parameters.
     */
    @Property(tries = 100)
    void bookedAppointmentAlwaysHasPendingStatus(
            @ForAll("futureDates") String preferredDate,
            @ForAll("timeSlots") String timeSlot,
            @ForAll("orderIds") String orderId,
            @ForAll("appointmentIds") String apptId,
            @ForAll("sessionIds") String sessionId) {

        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        CheckoutService checkoutService = mock(CheckoutService.class);
        AppointmentService service = new AppointmentService(supabaseClient, checkoutService);

        String postResponse = String.format(
                "[{\"id\":\"%s\",\"order_id\":\"%s\",\"preferred_date\":\"%s\","
                        + "\"preferred_time_slot\":\"%s\",\"status\":\"pending\"}]",
                apptId, orderId, preferredDate, timeSlot);
        when(supabaseClient.post(eq("appointments"), anyString())).thenReturn(postResponse);

        AppointmentRequest request = new AppointmentRequest(sessionId, preferredDate, timeSlot, null, null);
        Appointment booked = service.bookSlot(request, orderId);

        assertThat(booked.getStatus()).isEqualTo("pending");
        assertThat(booked.getPreferredDate()).isEqualTo(preferredDate);
        assertThat(booked.getPreferredTimeSlot()).isEqualTo(timeSlot);
        assertThat(booked.getOrderId()).isEqualTo(orderId);
    }

    /**
     * Property 6 (date preservation): The preferred date in the booked appointment
     * exactly matches the requested date for any valid future date.
     */
    @Property(tries = 100)
    void preferredDateIsPreservedThroughRoundTrip(
            @ForAll("futureDates") String preferredDate,
            @ForAll("timeSlots") String timeSlot,
            @ForAll("appointmentIds") String apptId) {

        String orderId = "order-fixed";
        String sessionId = "sess-fixed";

        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        CheckoutService checkoutService = mock(CheckoutService.class);
        AppointmentService service = new AppointmentService(supabaseClient, checkoutService);

        String postResponse = String.format(
                "[{\"id\":\"%s\",\"order_id\":\"%s\",\"preferred_date\":\"%s\","
                        + "\"preferred_time_slot\":\"%s\",\"status\":\"pending\"}]",
                apptId, orderId, preferredDate, timeSlot);
        when(supabaseClient.post(eq("appointments"), anyString())).thenReturn(postResponse);

        String getResponse = String.format(
                "[{\"id\":\"%s\",\"order_id\":\"%s\",\"preferred_date\":\"%s\","
                        + "\"preferred_time_slot\":\"%s\",\"confirmed_date\":null,"
                        + "\"engineer_name\":null,\"status\":\"pending\"}]",
                apptId, orderId, preferredDate, timeSlot);
        when(supabaseClient.get(eq("appointments"), anyString())).thenReturn(getResponse);

        AppointmentRequest request = new AppointmentRequest(sessionId, preferredDate, timeSlot, null, null);
        Appointment booked = service.bookSlot(request, orderId);
        Appointment retrieved = service.getAppointmentById(booked.getAppointmentId());

        // The date must survive the round trip exactly
        assertThat(retrieved.getPreferredDate()).isEqualTo(preferredDate);
        // Verify it's a valid ISO date
        java.time.LocalDate.parse(retrieved.getPreferredDate());
    }
}
