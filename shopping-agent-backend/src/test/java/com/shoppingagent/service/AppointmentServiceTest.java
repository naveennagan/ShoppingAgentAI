package com.shoppingagent.service;

import com.shoppingagent.model.Appointment;
import com.shoppingagent.model.AppointmentRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock
    private SupabaseClient supabaseClient;

    @Mock
    private CheckoutService checkoutService;

    private AppointmentService appointmentService;

    @BeforeEach
    void setUp() {
        appointmentService = new AppointmentService(supabaseClient, checkoutService);
    }

    // -------------------------------------------------------------------------
    // getAvailableSlots tests
    // -------------------------------------------------------------------------

    @Test
    void getAvailableSlots_returns28Slots() {
        List<Map<String, Object>> slots = appointmentService.getAvailableSlots();
        assertThat(slots).hasSize(28);
    }

    @Test
    void getAvailableSlots_spansNext14Days() {
        List<Map<String, Object>> slots = appointmentService.getAvailableSlots();
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        LocalDate lastDay = LocalDate.now().plusDays(14);

        String firstDate = (String) slots.get(0).get("date");
        String lastDate = (String) slots.get(slots.size() - 1).get("date");

        assertThat(firstDate).isEqualTo(tomorrow.toString());
        assertThat(lastDate).isEqualTo(lastDay.toString());
    }

    @Test
    void getAvailableSlots_eachDayHasMorningAndAfternoon() {
        List<Map<String, Object>> slots = appointmentService.getAvailableSlots();

        // Group slots by date
        Map<String, Set<String>> slotsByDate = slots.stream()
                .collect(Collectors.groupingBy(
                        s -> (String) s.get("date"),
                        Collectors.mapping(s -> (String) s.get("slot"), Collectors.toSet())
                ));

        assertThat(slotsByDate).hasSize(14);
        slotsByDate.forEach((date, slotTypes) -> {
            assertThat(slotTypes).containsExactlyInAnyOrder("morning", "afternoon");
        });
    }

    @Test
    void getAvailableSlots_allSlotsAreAvailable() {
        List<Map<String, Object>> slots = appointmentService.getAvailableSlots();

        slots.forEach(slot ->
                assertThat(slot.get("available")).isEqualTo(true)
        );
    }

    // -------------------------------------------------------------------------
    // bookSlot tests
    // -------------------------------------------------------------------------

    @Test
    void bookSlot_createsAppointmentRow() {
        String postResponse = """
                [{"id":"appt-1","order_id":"order-1","preferred_date":"2025-08-01",
                  "preferred_time_slot":"morning","status":"pending"}]
                """;
        when(supabaseClient.post(eq("appointments"), anyString())).thenReturn(postResponse);

        AppointmentRequest request = new AppointmentRequest("sess-1", "2025-08-01", "morning", null, null);
        Appointment result = appointmentService.bookSlot(request, "order-1");

        assertThat(result.getAppointmentId()).isEqualTo("appt-1");
        assertThat(result.getOrderId()).isEqualTo("order-1");
        assertThat(result.getPreferredDate()).isEqualTo("2025-08-01");
        assertThat(result.getPreferredTimeSlot()).isEqualTo("morning");
        assertThat(result.getStatus()).isEqualTo("pending");
    }

    @Test
    void bookSlot_throwsWhenPostReturnsEmpty() {
        when(supabaseClient.post(eq("appointments"), anyString())).thenReturn("[]");

        AppointmentRequest request = new AppointmentRequest("sess-1", "2025-08-01", "morning", null, null);

        assertThatThrownBy(() -> appointmentService.bookSlot(request, "order-1"))
                .isInstanceOf(RuntimeException.class);
    }

    // -------------------------------------------------------------------------
    // updateStatus tests
    // -------------------------------------------------------------------------

    @Test
    void updateStatus_toConfirmed_updatesStatusWithoutActivatingSubscription() {
        String getResponse = """
                [{"id":"appt-1","order_id":"order-1","preferred_date":"2025-08-01",
                  "preferred_time_slot":"morning","confirmed_date":null,
                  "engineer_name":null,"status":"confirmed"}]
                """;
        when(supabaseClient.patch(eq("appointments"), anyString(), anyString())).thenReturn("[]");
        when(supabaseClient.get(eq("appointments"), anyString())).thenReturn(getResponse);

        Appointment result = appointmentService.updateStatus("appt-1", "confirmed");

        assertThat(result.getStatus()).isEqualTo("confirmed");
        assertThat(result.getAppointmentId()).isEqualTo("appt-1");
        verify(checkoutService, never()).activateSubscription(anyString());
    }

    @Test
    void updateStatus_toCompleted_callsActivateSubscription() {
        String getResponse = """
                [{"id":"appt-1","order_id":"order-1","preferred_date":"2025-08-01",
                  "preferred_time_slot":"morning","confirmed_date":null,
                  "engineer_name":null,"status":"completed"}]
                """;
        when(supabaseClient.patch(eq("appointments"), anyString(), anyString())).thenReturn("[]");
        when(supabaseClient.get(eq("appointments"), anyString())).thenReturn(getResponse);

        Appointment result = appointmentService.updateStatus("appt-1", "completed");

        assertThat(result.getStatus()).isEqualTo("completed");
        verify(checkoutService).activateSubscription("appt-1");
    }
}
