package com.shoppingagent.controller;

import com.shoppingagent.model.Appointment;
import com.shoppingagent.model.AppointmentRequest;
import com.shoppingagent.model.CheckoutSession;
import com.shoppingagent.model.MockPaymentRequest;
import com.shoppingagent.model.Order;
import com.shoppingagent.model.Subscription;
import com.shoppingagent.service.AppointmentService;
import com.shoppingagent.service.CheckoutService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/checkout")
@CrossOrigin(origins = "http://localhost:3000")
public class CheckoutController {

    private static final Logger logger = LoggerFactory.getLogger(CheckoutController.class);

    private final CheckoutService checkoutService;
    private final AppointmentService appointmentService;

    public CheckoutController(CheckoutService checkoutService, AppointmentService appointmentService) {
        this.checkoutService = checkoutService;
        this.appointmentService = appointmentService;
    }

    /**
     * POST /api/checkout/session
     * Body: { "sessionId": "..." }
     * Builds and returns a CheckoutSession from the current cart.
     */
    @PostMapping("/session")
    public ResponseEntity<CheckoutSession> buildSession(@RequestBody Map<String, String> body) {
        String sessionId = body.get("sessionId");
        logger.info("POST /api/checkout/session sessionId={}", sessionId);
        CheckoutSession session = checkoutService.buildCheckoutSession(sessionId);
        return ResponseEntity.ok(session);
    }

    /**
     * POST /api/checkout/device-payment
     * Body: MockPaymentRequest (sessionId, cardholderName, last4Digits)
     * Mock payment — always succeeds for POC.
     */
    @PostMapping("/device-payment")
    public ResponseEntity<Order> processDevicePayment(@RequestBody MockPaymentRequest request) {
        logger.info("POST /api/checkout/device-payment sessionId={}", request.getSessionId());
        Order order = checkoutService.processMockDevicePayment(request.getSessionId(), request);
        return ResponseEntity.ok(order);
    }

    /**
     * POST /api/checkout/appointments
     * Body: AppointmentRequest (sessionId, preferredDate, preferredTimeSlot)
     * Books an installation slot.
     */
    @PostMapping("/appointments")
    public ResponseEntity<?> bookAppointment(@RequestBody AppointmentRequest request) {
        logger.info("POST /api/checkout/appointments sessionId={}, date={}, slot={}, broadbandItemId={}",
                request.getSessionId(), request.getPreferredDate(), request.getPreferredTimeSlot(), request.getBroadbandItemId());
        try {
            Appointment appointment = checkoutService.bookAppointment(request.getSessionId(), request);
            return ResponseEntity.ok(appointment);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
            }
            if (e.getMessage() != null && e.getMessage().contains("already booked")) {
                return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
            }
            throw e;
        }
    }

    /**
     * GET /api/checkout/appointments/{appointmentId}
     * Returns appointment details by ID.
     */
    @GetMapping("/appointments/{appointmentId}")
    public ResponseEntity<Appointment> getAppointment(@PathVariable String appointmentId) {
        logger.info("GET /api/checkout/appointments/{}", appointmentId);
        Appointment appointment = appointmentService.getAppointmentById(appointmentId);
        return ResponseEntity.ok(appointment);
    }

    /**
     * GET /api/checkout/slots
     * Returns available installation slots for the next 14 days.
     */
    @GetMapping("/slots")
    public ResponseEntity<?> getAvailableSlots() {
        logger.info("GET /api/checkout/slots");
        return ResponseEntity.ok(appointmentService.getAvailableSlots());
    }

    /**
     * GET /api/checkout/subscriptions/{sessionId}
     * Returns the subscription associated with a checkout session, or 404 if none exists yet.
     */
    @GetMapping("/subscriptions/{sessionId}")
    public ResponseEntity<Subscription> getSubscription(@PathVariable String sessionId) {
        logger.info("GET /api/checkout/subscriptions/{}", sessionId);
        Subscription subscription = checkoutService.getSubscriptionBySession(sessionId);
        if (subscription == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(subscription);
    }

    /**
     * PUT /api/checkout/session/{sessionId}/customer-details
     * Saves customer details against a checkout session.
     */
    @PutMapping("/session/{sessionId}/customer-details")
    public ResponseEntity<?> saveCustomerDetails(
            @PathVariable String sessionId,
            @RequestBody com.shoppingagent.model.CustomerDetails details) {
        logger.info("PUT /api/checkout/session/{}/customer-details", sessionId);
        boolean found = checkoutService.saveCustomerDetails(sessionId, details);
        if (!found) {
            return ResponseEntity.status(404).body(Map.of("message", "Checkout session not found"));
        }
        return ResponseEntity.ok(details);
    }

    /**
     * GET /api/checkout/session/{sessionId}/customer-details
     * Retrieves saved customer details for a checkout session.
     */
    @GetMapping("/session/{sessionId}/customer-details")
    public ResponseEntity<?> getCustomerDetails(@PathVariable String sessionId) {
        logger.info("GET /api/checkout/session/{}/customer-details", sessionId);
        com.shoppingagent.model.CustomerDetails details = checkoutService.getCustomerDetails(sessionId);
        if (details == null) {
            return ResponseEntity.ok(new com.shoppingagent.model.CustomerDetails());
        }
        return ResponseEntity.ok(details);
    }

    /**
     * GET /api/checkout/subscriptions/{sessionId}/all
     * Returns all subscriptions for a checkout session.
     */
    @GetMapping("/subscriptions/{sessionId}/all")
    public ResponseEntity<List<Subscription>> getSubscriptions(@PathVariable String sessionId) {
        logger.info("GET /api/checkout/subscriptions/{}/all", sessionId);
        List<Subscription> subscriptions = checkoutService.getSubscriptionsBySession(sessionId);
        return ResponseEntity.ok(subscriptions);
    }

}
