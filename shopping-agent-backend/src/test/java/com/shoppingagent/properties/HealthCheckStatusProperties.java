package com.shoppingagent.properties;

import com.shoppingagent.controller.RagController;
import com.shoppingagent.service.IngestionService;
import com.shoppingagent.service.SupabaseClient;
import net.jqwik.api.*;
import net.jqwik.api.constraints.LongRange;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Feature: broadband-chat-ux-improvements, Property 12: Health check status reflects document count
 * Validates: Requirements 7.8, 7.9
 *
 * For any non-negative document count in the vector store, the health endpoint should return
 * status "healthy" when count > 0 and status "empty" when count == 0.
 * When status is "empty", the response should include a warning message.
 */
class HealthCheckStatusProperties {

    private RagController buildController(long documentCount) {
        IngestionService ingestionService = mock(IngestionService.class);
        SupabaseClient supabaseClient = mock(SupabaseClient.class);
        when(ingestionService.getDocumentCount()).thenReturn(documentCount);
        return new RagController(ingestionService, supabaseClient);
    }

    /**
     * Property 12: For any positive document count, status is "healthy" with no warning.
     */
    @Property(tries = 100)
    @SuppressWarnings("unchecked")
    void positiveCountReturnsHealthyWithoutWarning(
            @ForAll @LongRange(min = 1, max = 100_000) long count) {

        RagController controller = buildController(count);
        ResponseEntity<?> response = controller.health();

        assertThat(response.getStatusCode().value()).isEqualTo(200);

        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("documentCount")).isEqualTo(count);
        assertThat(body.get("status")).isEqualTo("healthy");
        assertThat(body).doesNotContainKey("warning");
    }

    /**
     * Property 12: When count is zero, status is "empty" with a warning message.
     */
    @Example
    @SuppressWarnings("unchecked")
    void zeroCountReturnsEmptyWithWarning() {
        RagController controller = buildController(0L);
        ResponseEntity<?> response = controller.health();

        assertThat(response.getStatusCode().value()).isEqualTo(200);

        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("documentCount")).isEqualTo(0L);
        assertThat(body.get("status")).isEqualTo("empty");
        assertThat(body).containsKey("warning");
        assertThat((String) body.get("warning")).isNotEmpty();
    }

    /**
     * Property 12: For any non-negative count, status is always one of "healthy" or "empty",
     * and the boundary is exactly count == 0.
     */
    @Property(tries = 200)
    @SuppressWarnings("unchecked")
    void statusReflectsDocumentCountBoundary(
            @ForAll @LongRange(min = 0, max = 100_000) long count) {

        RagController controller = buildController(count);
        ResponseEntity<?> response = controller.health();

        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("documentCount")).isEqualTo(count);

        String status = (String) body.get("status");
        if (count > 0) {
            assertThat(status).isEqualTo("healthy");
            assertThat(body).doesNotContainKey("warning");
        } else {
            assertThat(status).isEqualTo("empty");
            assertThat(body).containsKey("warning");
            assertThat((String) body.get("warning"))
                    .as("Warning message must be present when status is empty")
                    .contains("RAG pipeline has no data to search against");
        }
    }
}
