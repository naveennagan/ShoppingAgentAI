package com.shoppingagent.service;

import com.shoppingagent.model.AppointmentRequest;
import com.shoppingagent.model.CheckoutSession;
import com.shoppingagent.model.MockPaymentRequest;
import com.shoppingagent.model.Order;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock
    private SupabaseClient supabaseClient;

    @Mock
    private PromotionService promotionService;

    private CheckoutService checkoutService;

    @BeforeEach
    void setUp() {
        checkoutService = new CheckoutService(supabaseClient, promotionService);
    }

    // -------------------------------------------------------------------------
    // buildCheckoutSession tests
    // -------------------------------------------------------------------------

    @Test
    void buildCheckoutSession_deviceOnlyCart_hasDevicesTrueNoBroadband() {
        String sessionId = "sess-device-only";
        String cartJson = """
                [
                  {"id":"item-1","item_type":"device","fulfillment_type":"shipping",
                   "display_name":"Phone X","display_summary":"128GB","unit_price":599.99,"quantity":1},
                  {"id":"item-2","item_type":"device","fulfillment_type":"shipping",
                   "display_name":"Case","display_summary":"Black","unit_price":19.99,"quantity":2}
                ]
                """;

        when(supabaseClient.get(eq("cart_items"), anyString())).thenReturn(cartJson);
        when(supabaseClient.get(eq("checkout_sessions"), anyString())).thenReturn("[]");
        when(supabaseClient.post(eq("checkout_sessions"), anyString())).thenReturn("[{\"id\":\"session-row-id\"}]");

        CheckoutSession session = checkoutService.buildCheckoutSession(sessionId);

        assertThat(session.isHasDevices()).isTrue();
        assertThat(session.isHasBroadbandService()).isFalse();
        // oneTimeTotal = 599.99*1 + 19.99*2 = 639.97
        assertThat(session.getOneTimeTotal()).isEqualTo(639.97);
        assertThat(session.getMonthlyTotal()).isEqualTo(0.0);
        assertThat(session.getServiceItems()).isEmpty();
        assertThat(session.getDeviceItems()).hasSize(2);
    }

    @Test
    void buildCheckoutSession_serviceOnlyCart_hasBroadbandTrueNoDevices() {
        String sessionId = "sess-service-only";
        String cartJson = """
                [
                  {"id":"item-3","item_type":"broadband_service","fulfillment_type":"installation",
                   "display_name":"Full Fibre 100","display_summary":"100Mbps","unit_price":29.99,"quantity":1},
                  {"id":"item-4","item_type":"broadband_service","fulfillment_type":"installation",
                   "display_name":"Router Add-on","display_summary":"WiFi 6","unit_price":5.00,"quantity":1}
                ]
                """;

        when(supabaseClient.get(eq("cart_items"), anyString())).thenReturn(cartJson);
        when(supabaseClient.get(eq("checkout_sessions"), anyString())).thenReturn("[]");
        when(supabaseClient.post(eq("checkout_sessions"), anyString())).thenReturn("[{\"id\":\"session-row-id\"}]");
        when(supabaseClient.get(eq("appointments"), anyString())).thenReturn("[]");

        CheckoutSession session = checkoutService.buildCheckoutSession(sessionId);

        assertThat(session.isHasDevices()).isFalse();
        assertThat(session.isHasBroadbandService()).isTrue();
        // monthlyTotal = sum of unitPrice (quantity ignored) = 29.99 + 5.00 = 34.99
        assertThat(session.getMonthlyTotal()).isCloseTo(34.99, within(0.001));
        assertThat(session.getOneTimeTotal()).isEqualTo(0.0);
        assertThat(session.getDeviceItems()).isEmpty();
        assertThat(session.getServiceItems()).hasSize(2);
        // All items should be unbooked since no appointments exist
        assertThat(session.getBroadbandBookingStatus()).containsEntry("item-3", "unbooked");
        assertThat(session.getBroadbandBookingStatus()).containsEntry("item-4", "unbooked");
    }

    @Test
    void buildCheckoutSession_mixedCart_bothFlagsTrueCorrectTotalsAndSplit() {
        String sessionId = "sess-mixed";
        String cartJson = """
                [
                  {"id":"item-5","item_type":"device","fulfillment_type":"shipping",
                   "display_name":"Tablet","display_summary":"64GB","unit_price":300.00,"quantity":2},
                  {"id":"item-6","item_type":"broadband_service","fulfillment_type":"installation",
                   "display_name":"Full Fibre 500","display_summary":"500Mbps","unit_price":49.99,"quantity":1}
                ]
                """;

        when(supabaseClient.get(eq("cart_items"), anyString())).thenReturn(cartJson);
        when(supabaseClient.get(eq("checkout_sessions"), anyString())).thenReturn("[]");
        when(supabaseClient.post(eq("checkout_sessions"), anyString())).thenReturn("[{\"id\":\"session-row-id\"}]");
        when(supabaseClient.get(eq("appointments"), anyString())).thenReturn("[]");

        CheckoutSession session = checkoutService.buildCheckoutSession(sessionId);

        assertThat(session.isHasDevices()).isTrue();
        assertThat(session.isHasBroadbandService()).isTrue();
        // oneTimeTotal = 300.00 * 2 = 600.00
        assertThat(session.getOneTimeTotal()).isEqualTo(600.00);
        // monthlyTotal = 49.99 (quantity ignored)
        assertThat(session.getMonthlyTotal()).isEqualTo(49.99);
        assertThat(session.getDeviceItems()).hasSize(1);
        assertThat(session.getServiceItems()).hasSize(1);
        assertThat(session.getDeviceItems().get(0).getDisplayName()).isEqualTo("Tablet");
        assertThat(session.getServiceItems().get(0).getDisplayName()).isEqualTo("Full Fibre 500");
        // Broadband item should be unbooked
        assertThat(session.getBroadbandBookingStatus()).containsEntry("item-6", "unbooked");
    }

    @Test
    void buildCheckoutSession_emptyCart_bothFlagsFalseTotalsZero() {
        String sessionId = "sess-empty";

        when(supabaseClient.get(eq("cart_items"), anyString())).thenReturn("[]");
        when(supabaseClient.get(eq("checkout_sessions"), anyString())).thenReturn("[]");
        when(supabaseClient.post(eq("checkout_sessions"), anyString())).thenReturn("[{\"id\":\"session-row-id\"}]");

        CheckoutSession session = checkoutService.buildCheckoutSession(sessionId);

        assertThat(session.isHasDevices()).isFalse();
        assertThat(session.isHasBroadbandService()).isFalse();
        assertThat(session.getOneTimeTotal()).isEqualTo(0.0);
        assertThat(session.getMonthlyTotal()).isEqualTo(0.0);
        assertThat(session.getDeviceItems()).isEmpty();
        assertThat(session.getServiceItems()).isEmpty();
    }

    @Test
    void buildCheckoutSession_serviceWithBookedAppointment_mapsAppointmentIdCorrectly() {
        String sessionId = "sess-booked";
        String cartJson = """
                [
                  {"id":"item-10","item_type":"broadband_service","fulfillment_type":"installation",
                   "display_name":"Full Fibre 100","display_summary":"100Mbps","unit_price":29.99,"quantity":1},
                  {"id":"item-11","item_type":"broadband_service","fulfillment_type":"installation",
                   "display_name":"Full Fibre 500","display_summary":"500Mbps","unit_price":49.99,"quantity":1}
                ]
                """;
        String appointmentsJson = """
                [{"id":"apt-001","cart_item_id":"item-10"}]
                """;

        when(supabaseClient.get(eq("cart_items"), anyString())).thenReturn(cartJson);
        when(supabaseClient.get(eq("checkout_sessions"), anyString())).thenReturn("[]");
        when(supabaseClient.post(eq("checkout_sessions"), anyString())).thenReturn("[{\"id\":\"session-row-id\"}]");
        when(supabaseClient.get(eq("appointments"), anyString())).thenReturn(appointmentsJson);

        CheckoutSession session = checkoutService.buildCheckoutSession(sessionId);

        assertThat(session.getBroadbandBookingStatus()).hasSize(2);
        // item-10 has an appointment → should map to the appointment ID
        assertThat(session.getBroadbandBookingStatus()).containsEntry("item-10", "apt-001");
        // item-11 has no appointment → should be "unbooked"
        assertThat(session.getBroadbandBookingStatus()).containsEntry("item-11", "unbooked");
    }

    // -------------------------------------------------------------------------
    // processMockDevicePayment tests
    // -------------------------------------------------------------------------

    @Test
    void processMockDevicePayment_anyCardDetails_returnsConfirmedOrder() {
        String sessionId = "sess-payment";
        MockPaymentRequest payment = new MockPaymentRequest(sessionId, "Jane Doe", "4242");

        when(supabaseClient.get(eq("checkout_sessions"), anyString()))
                .thenReturn("[{\"device_one_time_total\":639.97}]");
        when(supabaseClient.post(eq("orders"), anyString()))
                .thenReturn("[{\"id\":\"order-123\"}]");
        when(supabaseClient.patch(anyString(), anyString(), anyString())).thenReturn("[]");
        when(supabaseClient.delete(anyString(), anyString())).thenReturn("[]");

        Order order = checkoutService.processMockDevicePayment(sessionId, payment);

        assertThat(order).isNotNull();
        assertThat(order.getStatus()).isEqualTo("CONFIRMED");
        assertThat(order.getOrderId()).isEqualTo("order-123");
        assertThat(order.getSessionId()).isEqualTo(sessionId);
        assertThat(order.getTotalAmount()).isEqualTo(639.97);
    }

    // -------------------------------------------------------------------------
    // bookAppointment rejection tests
    // -------------------------------------------------------------------------

    @Test
    void bookAppointment_whenNoBroadbandService_throwsRuntimeException() {
        String sessionId = "sess-no-broadband";
        AppointmentRequest request = new AppointmentRequest(sessionId, "2025-08-01", "09:00-11:00", "item-99", null);

        when(supabaseClient.get(eq("checkout_sessions"), anyString()))
                .thenReturn("[{\"has_broadband_service\":false}]");

        assertThatThrownBy(() -> checkoutService.bookAppointment(sessionId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("No broadband service in checkout session for: " + sessionId);
    }

    @Test
    void bookAppointment_whenNoSessionFound_throwsRuntimeException() {
        String sessionId = "sess-missing";
        AppointmentRequest request = new AppointmentRequest(sessionId, "2025-08-01", "14:00-16:00", "item-99", null);

        when(supabaseClient.get(eq("checkout_sessions"), anyString())).thenReturn("[]");

        assertThatThrownBy(() -> checkoutService.bookAppointment(sessionId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("No checkout session found for: " + sessionId);
    }

    @Test
    void bookAppointment_whenBroadbandItemNotFound_throwsRuntimeException() {
        String sessionId = "sess-bb";
        AppointmentRequest request = new AppointmentRequest(sessionId, "2025-08-01", "morning", "item-nonexistent", null);

        when(supabaseClient.get(eq("checkout_sessions"), anyString()))
                .thenReturn("[{\"has_broadband_service\":true}]");
        when(supabaseClient.get(eq("cart_items"), anyString()))
                .thenReturn("[]");

        assertThatThrownBy(() -> checkoutService.bookAppointment(sessionId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Broadband item not found in checkout session");
    }

    @Test
    void bookAppointment_whenAlreadyBooked_throwsRuntimeException() {
        String sessionId = "sess-bb";
        AppointmentRequest request = new AppointmentRequest(sessionId, "2025-08-01", "morning", "item-10", null);

        when(supabaseClient.get(eq("checkout_sessions"), anyString()))
                .thenReturn("[{\"has_broadband_service\":true}]");
        when(supabaseClient.get(eq("cart_items"), anyString()))
                .thenReturn("[{\"id\":\"item-10\",\"item_type\":\"broadband_service\",\"display_name\":\"Full Fibre 100\",\"unit_price\":29.99}]");
        when(supabaseClient.get(eq("appointments"), anyString()))
                .thenReturn("[{\"id\":\"existing-apt\"}]");

        assertThatThrownBy(() -> checkoutService.bookAppointment(sessionId, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Appointment already booked for this item");
    }

    @Test
    void bookAppointment_happyPath_createsOrderAndAppointmentPerItem() {
        String sessionId = "sess-bb";
        AppointmentRequest request = new AppointmentRequest(sessionId, "2025-08-15", "afternoon", "item-20", null);

        when(supabaseClient.get(eq("checkout_sessions"), anyString()))
                .thenReturn("[{\"has_broadband_service\":true,\"customer_address\":\"42 Test Street\"}]");
        when(supabaseClient.get(eq("cart_items"), anyString()))
                .thenReturn("[{\"id\":\"item-20\",\"item_type\":\"broadband_service\",\"display_name\":\"Full Fibre 500\",\"unit_price\":49.99}]");
        when(supabaseClient.get(eq("appointments"), anyString()))
                .thenReturn("[]");
        when(supabaseClient.post(eq("orders"), anyString()))
                .thenReturn("[{\"id\":\"order-svc-1\"}]");
        when(supabaseClient.post(eq("order_items"), anyString()))
                .thenReturn("[{\"id\":\"oi-1\"}]");
        when(supabaseClient.post(eq("appointments"), anyString()))
                .thenReturn("[{\"id\":\"apt-new-1\",\"order_id\":\"order-svc-1\",\"status\":\"pending\"}]");
        when(supabaseClient.patch(anyString(), anyString(), anyString())).thenReturn("[]");

        var appointment = checkoutService.bookAppointment(sessionId, request);

        assertThat(appointment).isNotNull();
        assertThat(appointment.getAppointmentId()).isEqualTo("apt-new-1");
        assertThat(appointment.getOrderId()).isEqualTo("order-svc-1");
        assertThat(appointment.getPreferredDate()).isEqualTo("2025-08-15");
        assertThat(appointment.getPreferredTimeSlot()).isEqualTo("afternoon");
        assertThat(appointment.getStatus()).isEqualTo("pending");
    }
}
